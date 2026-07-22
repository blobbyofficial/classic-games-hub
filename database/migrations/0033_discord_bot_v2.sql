-- 0033_discord_bot_v2.sql
-- Discord bot v2 — free-tier serverless architecture.
--
-- The bot moves from a hosted gateway process to Discord "HTTP interactions"
-- served by the website on Vercel, so slash commands cost nothing to run.
-- This migration adds everything that architecture needs:
--
--   * discord_links       — code-based account links (OAuth links keep living
--                           in auth.identities; bot_uid unions both)
--   * discord_link_codes  — short-lived one-time codes minted by /link
--   * discord_levels      — Discord chat XP/levels (the Arcane replacement)
--   * discord_bot_config  — admin-editable leveling + role-sync configuration
--   * bot_* RPCs          — service_role-only endpoints for the interactions
--                           handler, the role-sync cron and the optional
--                           gateway worker
--   * claim_discord_link / unlink_discord — authenticated RPCs for the
--                           website Connections settings UI
--
-- Security model is unchanged from 0018: every bot_* function is
-- SECURITY DEFINER, revoked from public/anon/authenticated and granted only
-- to service_role. Client-facing RPCs check auth.uid() themselves.

-- ───────────────────────── 1. Tables ─────────────────────────

create table if not exists public.discord_links (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  discord_id text not null unique,
  discord_username text,
  via text not null default 'code' check (via in ('code', 'oauth')),
  linked_at timestamptz not null default now()
);

alter table public.discord_links enable row level security;

-- Players may see their own link row (the settings page shows it).
create policy discord_links_select_own on public.discord_links
  for select using (auth.uid() = user_id);
-- All writes go through SECURITY DEFINER RPCs — no insert/update/delete
-- policies on purpose.

create table if not exists public.discord_link_codes (
  code text primary key,
  discord_id text not null,
  discord_username text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz
);

alter table public.discord_link_codes enable row level security;
-- No client policies at all: codes are minted by the bot (service_role) and
-- consumed inside claim_discord_link (SECURITY DEFINER).

create index if not exists discord_link_codes_discord_idx
  on public.discord_link_codes (discord_id);

create table if not exists public.discord_levels (
  discord_id text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  discord_username text,
  xp bigint not null default 0,
  level int not null default 0,
  messages bigint not null default 0,
  last_xp_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.discord_levels enable row level security;

-- Leaderboard data is public in spirit (it's visible to everyone in the
-- Discord server) — allow read, block all client writes.
create policy discord_levels_select_all on public.discord_levels
  for select using (true);

create index if not exists discord_levels_xp_idx on public.discord_levels (xp desc);
create index if not exists discord_levels_user_idx on public.discord_levels (user_id);

create table if not exists public.discord_bot_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.discord_bot_config enable row level security;
-- No client policies: admins read/write through the RPCs below, the bot
-- reads with service_role.

-- Defaults. Leveling mirrors the familiar Arcane/MEE6 shape so the community
-- keeps its mental model: 15–25 XP per counted message, one counted message
-- per minute, and `5n² + 50n + 100` XP to go from level n to n+1.
insert into public.discord_bot_config (key, value) values
  ('leveling', jsonb_build_object(
    'enabled', true,
    'xp_min', 15,
    'xp_max', 25,
    'cooldown_seconds', 60,
    'curve_quad', 5,
    'curve_linear', 50,
    'curve_base', 100,
    'announce_level_ups', true,
    'announce_channel_id', null,
    'no_xp_channel_ids', '[]'::jsonb,
    'hub_xp_share', 0.2
  )),
  ('role_sync', jsonb_build_object(
    'enabled', true,
    'role_map', '{}'::jsonb
  ))
on conflict (key) do nothing;

-- ───────────────────────── 2. Level math ─────────────────────────

-- Total XP needed to *reach* a level under the configured curve.
create or replace function public.discord_xp_for_level(p_level int, p_quad int, p_linear int, p_base int)
returns bigint
language sql immutable
as $$
  -- sum over n = 0 .. p_level-1 of (quad*n^2 + linear*n + base)
  select case when p_level <= 0 then 0 else
    (p_quad::bigint * (p_level - 1) * p_level * (2 * p_level - 1) / 6)
    + (p_linear::bigint * (p_level - 1) * p_level / 2)
    + (p_base::bigint * p_level)
  end;
$$;

create or replace function public.discord_level_for_xp(p_xp bigint, p_quad int, p_linear int, p_base int)
returns int
language plpgsql immutable
as $$
declare
  v_level int := 0;
begin
  while public.discord_xp_for_level(v_level + 1, p_quad, p_linear, p_base) <= p_xp
        and v_level < 500 loop
    v_level := v_level + 1;
  end loop;
  return v_level;
end;
$$;

-- Pure math helpers — harmless, but keep the API surface tidy anyway.
revoke execute on function public.discord_xp_for_level(int, int, int, int) from public, anon;
revoke execute on function public.discord_level_for_xp(bigint, int, int, int) from public, anon;
grant execute on function public.discord_xp_for_level(int, int, int, int) to authenticated, service_role;
grant execute on function public.discord_level_for_xp(bigint, int, int, int) to authenticated, service_role;

-- ───────────────────────── 3. Link resolution ─────────────────────────

-- Discord user id -> Hub profile id, now checking BOTH link sources:
-- Supabase OAuth identities and code-based discord_links.
create or replace function public.bot_uid(p_discord text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from (
    select i.user_id from auth.identities i
    where i.provider = 'discord' and i.provider_id = p_discord
    union all
    select l.user_id from public.discord_links l
    where l.discord_id = p_discord
  ) s
  limit 1;
$$;
revoke execute on function public.bot_uid(text) from public, anon, authenticated;

-- Reverse lookup: Hub profile id -> Discord user id (either source).
create or replace function public.bot_discord_id(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select discord_id from (
    select i.provider_id as discord_id from auth.identities i
    where i.provider = 'discord' and i.user_id = p_user
    union all
    select l.discord_id from public.discord_links l where l.user_id = p_user
  ) s
  limit 1;
$$;
revoke execute on function public.bot_discord_id(uuid) from public, anon, authenticated;
grant execute on function public.bot_discord_id(uuid) to service_role;

-- Keep profiles.discord_linked true when EITHER source links the account.
create or replace function public.sync_discord_linked_manual()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  begin
    update public.profiles p set discord_linked = (
      exists (select 1 from auth.identities i where i.user_id = v_user and i.provider = 'discord')
      or exists (select 1 from public.discord_links l where l.user_id = v_user)
    ) where p.id = v_user;
  exception when others then null;
  end;
  return null;
end;
$$;
revoke execute on function public.sync_discord_linked_manual() from public, anon, authenticated;

drop trigger if exists discord_links_sync_flag on public.discord_links;
create trigger discord_links_sync_flag
after insert or delete on public.discord_links
for each row execute function public.sync_discord_linked_manual();

-- The 0020 trigger only looked at auth.identities on DELETE; teach it about
-- discord_links so unlinking OAuth while a code link exists keeps the flag.
create or replace function public.sync_discord_linked()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'DELETE' then
      update public.profiles p set discord_linked = (
        exists (select 1 from auth.identities i where i.user_id = old.user_id and i.provider = 'discord')
        or exists (select 1 from public.discord_links l where l.user_id = old.user_id)
      ) where p.id = old.user_id;
    elsif new.provider = 'discord' then
      update public.profiles set discord_linked = true where id = new.user_id;
    end if;
  exception when others then
    null; -- never block an identity change on a denormalisation hiccup
  end;
  return null;
end;
$$;
revoke execute on function public.sync_discord_linked() from public, anon, authenticated;

-- Attach any Discord chat XP earned before linking to the profile, and vice
-- versa on unlink.
create or replace function public.discord_levels_attach(p_discord text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.discord_levels
  set user_id = public.bot_uid(p_discord), updated_at = now()
  where discord_id = p_discord;
end;
$$;
revoke execute on function public.discord_levels_attach(text) from public, anon, authenticated;

-- ───────────────────────── 4. Linking RPCs ─────────────────────────

-- Bot-side: mint a one-time code for /link. Replaces any live code for the
-- same Discord user and refuses if the Discord account is already linked.
create or replace function public.bot_create_link_code(p_discord text, p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid := public.bot_uid(p_discord);
  v_code text;
begin
  if p_discord is null or p_discord = '' then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  if v_existing is not null then
    return jsonb_build_object('ok', false, 'error', 'already_linked',
      'username', (select username::text from public.profiles where id = v_existing));
  end if;

  delete from public.discord_link_codes
  where discord_id = p_discord and consumed_at is null;

  -- 8 hex chars from a UUID — 4 billion combinations for a 10-minute window,
  -- and codes are single-use.
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.discord_link_codes (code, discord_id, discord_username)
  values (v_code, p_discord, p_username);

  return jsonb_build_object('ok', true, 'code', v_code, 'expires_in_minutes', 10);
end;
$$;
revoke execute on function public.bot_create_link_code(text, text) from public, anon, authenticated;
grant execute on function public.bot_create_link_code(text, text) to service_role;

-- Website-side: the signed-in player enters the code from /link.
create or replace function public.claim_discord_link(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_row public.discord_link_codes%rowtype;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;
  if public.bot_discord_id(v_me) is not null then
    return jsonb_build_object('ok', false, 'error', 'account_already_linked');
  end if;

  select * into v_row
  from public.discord_link_codes
  where code = upper(trim(coalesce(p_code, '')))
    and consumed_at is null
    and expires_at > now()
  for update;

  if v_row.code is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if public.bot_uid(v_row.discord_id) is not null then
    return jsonb_build_object('ok', false, 'error', 'discord_already_linked');
  end if;

  update public.discord_link_codes set consumed_at = now() where code = v_row.code;
  insert into public.discord_links (user_id, discord_id, discord_username, via)
  values (v_me, v_row.discord_id, v_row.discord_username, 'code');

  perform public.discord_levels_attach(v_row.discord_id);

  insert into public.notifications (user_id, type, title, body, data)
  values (v_me, 'discord', 'Discord linked',
    'Your Discord account' || coalesce(' (' || v_row.discord_username || ')', '') ||
    ' is now connected to your Hub account.',
    jsonb_build_object('discord_id', v_row.discord_id));

  return jsonb_build_object('ok', true, 'discord_username', v_row.discord_username);
end;
$$;
revoke execute on function public.claim_discord_link(text) from public, anon;
grant execute on function public.claim_discord_link(text) to authenticated;

-- Website-side: remove a code-based link. (OAuth identities are unlinked via
-- Supabase auth, which fires the 0020 trigger.)
create or replace function public.unlink_discord()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_discord text;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;
  select discord_id into v_discord from public.discord_links where user_id = v_me;
  if v_discord is null then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;
  delete from public.discord_links where user_id = v_me;
  update public.discord_levels set user_id = null, updated_at = now()
  where discord_id = v_discord;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.unlink_discord() from public, anon;
grant execute on function public.unlink_discord() to authenticated;

-- Bot-side twin of unlink (for a /unlink slash command). Only removes
-- code-based links; OAuth links must be removed from the website.
create or replace function public.bot_unlink(p_discord text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.discord_links where discord_id = p_discord;
  get diagnostics v_deleted = row_count;
  update public.discord_levels set user_id = null, updated_at = now()
  where discord_id = p_discord;
  if v_deleted = 0 then
    return jsonb_build_object('ok', false, 'error',
      case when public.bot_uid(p_discord) is not null then 'oauth_link' else 'not_linked' end);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.bot_unlink(text) from public, anon, authenticated;
grant execute on function public.bot_unlink(text) to service_role;

-- Bot-side: is this Discord user linked, and to whom?
create or replace function public.bot_link_status(p_discord text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid := public.bot_uid(p_discord);
begin
  if v_id is null then
    return jsonb_build_object('ok', true, 'linked', false);
  end if;
  return jsonb_build_object('ok', true, 'linked', true,
    'username', (select username::text from public.profiles where id = v_id),
    'via', case when exists (select 1 from public.discord_links where discord_id = p_discord)
                then 'code' else 'oauth' end);
end;
$$;
revoke execute on function public.bot_link_status(text) from public, anon, authenticated;
grant execute on function public.bot_link_status(text) to service_role;

-- ───────────────────────── 5. Discord leveling ─────────────────────────

-- Award chat XP. The cooldown is enforced HERE (in the row), not in bot
-- memory, so restarts and multiple workers can't double-award.
create or replace function public.bot_award_discord_xp(
  p_discord text, p_username text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg jsonb;
  v_cooldown int;
  v_xp_min int;
  v_xp_max int;
  v_quad int; v_linear int; v_base int;
  v_gain int;
  v_row public.discord_levels%rowtype;
  v_new_level int;
  v_user uuid;
  v_share numeric;
begin
  select value into v_cfg from public.discord_bot_config where key = 'leveling';
  if v_cfg is null or coalesce((v_cfg ->> 'enabled')::boolean, true) is false then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;
  v_cooldown := coalesce((v_cfg ->> 'cooldown_seconds')::int, 60);
  v_xp_min := coalesce((v_cfg ->> 'xp_min')::int, 15);
  v_xp_max := greatest(v_xp_min, coalesce((v_cfg ->> 'xp_max')::int, 25));
  v_quad := coalesce((v_cfg ->> 'curve_quad')::int, 5);
  v_linear := coalesce((v_cfg ->> 'curve_linear')::int, 50);
  v_base := coalesce((v_cfg ->> 'curve_base')::int, 100);

  insert into public.discord_levels as dl (discord_id, user_id, discord_username)
  values (p_discord, public.bot_uid(p_discord), nullif(p_username, ''))
  on conflict (discord_id) do nothing;

  select * into v_row from public.discord_levels where discord_id = p_discord for update;

  if v_row.last_xp_at is not null and v_row.last_xp_at > now() - make_interval(secs => v_cooldown) then
    return jsonb_build_object('ok', true, 'cooldown', true, 'leveled_up', false,
      'level', v_row.level, 'xp', v_row.xp);
  end if;

  v_gain := v_xp_min + floor(random() * (v_xp_max - v_xp_min + 1))::int;
  v_new_level := public.discord_level_for_xp(v_row.xp + v_gain, v_quad, v_linear, v_base);

  update public.discord_levels set
    xp = xp + v_gain,
    level = v_new_level,
    messages = messages + 1,
    last_xp_at = now(),
    discord_username = coalesce(nullif(p_username, ''), discord_username),
    user_id = coalesce(user_id, public.bot_uid(p_discord)),
    updated_at = now()
  where discord_id = p_discord
  returning user_id into v_user;

  -- Linked players trickle a share of Discord XP into their Hub XP so being
  -- active in the community still counts on the website.
  v_share := coalesce((v_cfg ->> 'hub_xp_share')::numeric, 0);
  if v_user is not null and v_share > 0 then
    perform public.add_xp(v_user, greatest(1, floor(v_gain * v_share)::int));
  end if;

  if v_new_level > v_row.level and v_user is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_user, 'discord', 'Discord level up!',
      'You reached level ' || v_new_level || ' in the Discord server. Keep chatting!',
      jsonb_build_object('level', v_new_level));
  end if;

  return jsonb_build_object(
    'ok', true, 'cooldown', false,
    'leveled_up', v_new_level > v_row.level,
    'level', v_new_level,
    'xp', v_row.xp + v_gain,
    'next_level_xp', public.discord_xp_for_level(v_new_level + 1, v_quad, v_linear, v_base)
  );
end;
$$;
revoke execute on function public.bot_award_discord_xp(text, text) from public, anon, authenticated;
grant execute on function public.bot_award_discord_xp(text, text) to service_role;

-- Rank card data for /rank.
create or replace function public.bot_discord_rank(p_discord text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cfg jsonb;
  v_quad int; v_linear int; v_base int;
  v_row public.discord_levels%rowtype;
  v_rank bigint;
begin
  select value into v_cfg from public.discord_bot_config where key = 'leveling';
  v_quad := coalesce((v_cfg ->> 'curve_quad')::int, 5);
  v_linear := coalesce((v_cfg ->> 'curve_linear')::int, 50);
  v_base := coalesce((v_cfg ->> 'curve_base')::int, 100);

  select * into v_row from public.discord_levels where discord_id = p_discord;
  if v_row.discord_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_xp');
  end if;

  select count(*) + 1 into v_rank from public.discord_levels where xp > v_row.xp;

  return jsonb_build_object(
    'ok', true,
    'level', v_row.level,
    'xp', v_row.xp,
    'messages', v_row.messages,
    'rank', v_rank,
    'level_floor_xp', public.discord_xp_for_level(v_row.level, v_quad, v_linear, v_base),
    'next_level_xp', public.discord_xp_for_level(v_row.level + 1, v_quad, v_linear, v_base),
    'hub_username', (select username::text from public.profiles where id = v_row.user_id)
  );
end;
$$;
revoke execute on function public.bot_discord_rank(text) from public, anon, authenticated;
grant execute on function public.bot_discord_rank(text) to service_role;

-- Top chatters for /levels.
create or replace function public.bot_discord_leaderboard(p_limit int default 10)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', rn, 'discord_id', discord_id, 'discord_username', discord_username,
    'level', level, 'xp', xp,
    'hub_username', hub_username) order by rn), '[]'::jsonb)
  from (
    select dl.discord_id, dl.discord_username, dl.level, dl.xp,
           p.username::text as hub_username,
           row_number() over (order by dl.xp desc) as rn
    from public.discord_levels dl
    left join public.profiles p on p.id = dl.user_id
    order by dl.xp desc
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  ) s;
$$;
revoke execute on function public.bot_discord_leaderboard(int) from public, anon, authenticated;
grant execute on function public.bot_discord_leaderboard(int) to service_role;

-- ───────────────────────── 6. Role sync ─────────────────────────

-- Everything the role-sync engine needs to know about one Discord user.
create or replace function public.bot_role_state(p_discord text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid := public.bot_uid(p_discord);
begin
  if v_id is null then
    return jsonb_build_object('ok', true, 'linked', false,
      'discord_level', coalesce((select level from public.discord_levels where discord_id = p_discord), 0));
  end if;
  return jsonb_build_object(
    'ok', true,
    'linked', true,
    'username', (select username::text from public.profiles where id = v_id),
    'role', (select role from public.profiles where id = v_id),
    'is_banned', (select is_banned from public.profiles where id = v_id),
    'hub_level', (select level from public.profiles where id = v_id),
    'discord_level', coalesce((select level from public.discord_levels where discord_id = p_discord), 0),
    'nameplate', (select equipped ->> 'nameplate' from public.profiles where id = v_id),
    'badges', (
      select coalesce(jsonb_agg(si.slug), '[]'::jsonb)
      from public.inventory_items ii
      join public.shop_items si on si.id = ii.item_id
      where ii.user_id = v_id and si.kind = 'badge'
        and (ii.expires_at is null or ii.expires_at > now())
    ),
    'achievements', (
      select coalesce(jsonb_agg(a.slug), '[]'::jsonb)
      from public.user_achievements ua
      join public.achievements a on a.id = ua.achievement_id
      where ua.user_id = v_id
    )
  );
end;
$$;
revoke execute on function public.bot_role_state(text) from public, anon, authenticated;
grant execute on function public.bot_role_state(text) to service_role;

-- All linked Discord ids, for the nightly reconcile sweep.
create or replace function public.bot_all_linked()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(discord_id), '[]'::jsonb)
  from (
    select i.provider_id as discord_id from auth.identities i where i.provider = 'discord'
    union
    select l.discord_id from public.discord_links l
    limit 2000
  ) s;
$$;
revoke execute on function public.bot_all_linked() from public, anon, authenticated;
grant execute on function public.bot_all_linked() to service_role;

-- ───────────────────────── 7. Config RPCs (admin + bot) ─────────────────────────

create or replace function public.bot_get_config(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select value from public.discord_bot_config where key = p_key;
$$;
revoke execute on function public.bot_get_config(text) from public, anon, authenticated;
grant execute on function public.bot_get_config(text) to service_role;

create or replace function public.admin_get_bot_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return coalesce((
    select jsonb_object_agg(key, value) from public.discord_bot_config
  ), '{}'::jsonb);
end;
$$;
revoke execute on function public.admin_get_bot_config() from public, anon;
grant execute on function public.admin_get_bot_config() to authenticated;

create or replace function public.admin_set_bot_config(p_key text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if p_key not in ('leveling', 'role_sync') then
    return jsonb_build_object('ok', false, 'error', 'unknown_key');
  end if;
  insert into public.discord_bot_config (key, value, updated_at)
  values (p_key, coalesce(p_value, '{}'::jsonb), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'bot_config_update', 'discord_bot_config', p_key, p_value);

  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.admin_set_bot_config(text, jsonb) from public, anon;
grant execute on function public.admin_set_bot_config(text, jsonb) to authenticated;

-- ───────────────────────── 8. Website-facing reads ─────────────────────────

-- The signed-in player's Discord connection summary for the settings page.
create or replace function public.my_discord_connection()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_discord text;
begin
  if v_me is null then
    return jsonb_build_object('linked', false);
  end if;
  v_discord := public.bot_discord_id(v_me);
  if v_discord is null then
    return jsonb_build_object('linked', false);
  end if;
  return jsonb_build_object(
    'linked', true,
    'discord_id', v_discord,
    'via', case when exists (select 1 from public.discord_links where user_id = v_me)
                then 'code' else 'oauth' end,
    'discord_username', (select discord_username from public.discord_links where user_id = v_me),
    'discord_level', coalesce((select level from public.discord_levels where discord_id = v_discord), 0),
    'discord_xp', coalesce((select xp from public.discord_levels where discord_id = v_discord), 0)
  );
end;
$$;
revoke execute on function public.my_discord_connection() from public, anon;
grant execute on function public.my_discord_connection() to authenticated;

-- Housekeeping: purge expired link codes opportunistically whenever a new
-- one is minted (no cron needed at this size).
create or replace function public.bot_purge_link_codes()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.discord_link_codes where expires_at < now() - interval '1 day';
$$;
revoke execute on function public.bot_purge_link_codes() from public, anon, authenticated;
grant execute on function public.bot_purge_link_codes() to service_role;
