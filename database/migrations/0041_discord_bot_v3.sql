-- 0041_discord_bot_v3.sql
-- Discord bot v3 — "one bot to replace them all".
--
-- Adds the storage + service_role RPCs behind the features that used to need
-- four third-party bots:
--
--   * Appy        → join verification (button / captcha gate, welcome flow)
--   * Sapphire    → moderation cases, announcements, ticket system
--   * Arcane      → milestone level roles (leveling itself landed in 0033)
--   * ServerStats → live counters (already had bot_server_stats; this adds the
--                   admin-editable channel/template config)
--
-- Security model matches 0018/0033: every bot_* function is SECURITY DEFINER,
-- revoked from public/anon/authenticated and granted only to service_role.

-- ───────────────────────── 1. Config defaults ─────────────────────────

insert into public.discord_bot_config (key, value) values
  ('verification', jsonb_build_object(
    'enabled', true,
    'mode', 'button',                 -- 'button' | 'captcha'
    'verified_role_id', null,
    'unverified_role_id', null,
    'panel_channel_id', null,
    'log_channel_id', null,
    'min_account_age_hours', 0,
    'panel_title', '✅ Verify yourself',
    'panel_body', 'Press the button below to get access to the server.',
    'button_label', 'Verify me',
    'success_message', 'You''re verified — welcome in! 🎮',
    'welcome_channel_id', null,
    'welcome_message', 'Welcome {user} to **{server}**! You''re member #{count}. Play at {site}',
    'dm_on_join', false,
    'dm_message', 'Welcome to {server}! Head to the verification channel to get access.'
  )),
  ('moderation', jsonb_build_object(
    'log_channel_id', null,
    'dm_on_action', true,
    'automod', jsonb_build_object(
      'enabled', false,
      'block_invites', true,
      'block_links', false,
      'max_mentions', 6,
      'spam_messages', 6,
      'spam_window_seconds', 8,
      'action', 'timeout',            -- 'delete' | 'timeout'
      'timeout_minutes', 10,
      'exempt_role_ids', '[]'::jsonb,
      'exempt_channel_ids', '[]'::jsonb
    )
  )),
  ('tickets', jsonb_build_object(
    'enabled', true,
    'category_id', null,
    'staff_role_id', null,
    'log_channel_id', null,
    'panel_title', '🎫 Support tickets',
    'panel_body', 'Need help? Open a private ticket and a staff member will be with you.',
    'button_label', 'Open a ticket',
    'open_message', 'Thanks {user} — describe your issue and staff will reply here.',
    'max_open_per_user', 1
  )),
  ('stats', jsonb_build_object(
    'enabled', true,
    'channels', jsonb_build_object(
      'online', null,
      'members', null,
      'plays', null,
      'discord_members', null
    ),
    'templates', jsonb_build_object(
      'online', '🟢 Online: {online}',
      'members', '👥 Players: {members}',
      'plays', '🎮 Plays today: {plays}',
      'discord_members', '💬 Discord: {discord_members}'
    )
  )),
  ('level_roles', jsonb_build_object(
    'enabled', true,
    'announce', true,
    'remove_previous', false,
    'milestones', '[1, 5, 10, 20, 30, 40, 50, 75, 100]'::jsonb,
    'name_template', 'Level {level}',
    'roles', '{}'::jsonb            -- { "5": "<role id>", ... } filled by /setup-levels
  ))
on conflict (key) do nothing;

-- ───────────────────────── 2. Tables ─────────────────────────

create table if not exists public.discord_verifications (
  discord_id text primary key,
  discord_username text,
  user_id uuid references public.profiles (id) on delete set null,
  method text not null default 'button',
  verified_at timestamptz not null default now()
);
alter table public.discord_verifications enable row level security;
-- No client policies: written by the bot (service_role) only.

create table if not exists public.discord_mod_cases (
  id bigserial primary key,
  actor_discord text,
  target_discord text not null,
  target_username text,
  action text not null,
  reason text,
  duration_minutes int,
  created_at timestamptz not null default now()
);
alter table public.discord_mod_cases enable row level security;

create index if not exists discord_mod_cases_target_idx
  on public.discord_mod_cases (target_discord, created_at desc);

create table if not exists public.discord_tickets (
  id bigserial primary key,
  channel_id text not null unique,
  opener_discord text not null,
  opener_username text,
  subject text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by text
);
alter table public.discord_tickets enable row level security;

create index if not exists discord_tickets_opener_idx
  on public.discord_tickets (opener_discord, status);

-- ───────────────────────── 3. Config writes from the bot ─────────────────────────

-- Shallow-merges a patch into a config key. Used by the in-Discord setup
-- commands (/setup-levels, /verify-panel, /ticket-panel) so IDs created in
-- Discord are persisted without a trip through the admin dashboard.
create or replace function public.bot_patch_config(p_key text, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value jsonb;
begin
  if p_key not in ('leveling', 'role_sync', 'verification', 'moderation', 'tickets', 'stats', 'level_roles') then
    return jsonb_build_object('ok', false, 'error', 'unknown_key');
  end if;
  insert into public.discord_bot_config (key, value, updated_at)
  values (p_key, coalesce(p_patch, '{}'::jsonb), now())
  on conflict (key) do update
    set value = public.discord_bot_config.value || coalesce(excluded.value, '{}'::jsonb),
        updated_at = now()
  returning value into v_value;
  return jsonb_build_object('ok', true, 'value', v_value);
end;
$$;
revoke execute on function public.bot_patch_config(text, jsonb) from public, anon, authenticated;
grant execute on function public.bot_patch_config(text, jsonb) to service_role;

-- Every config key at once — one round trip for the gateway worker.
create or replace function public.bot_all_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from public.discord_bot_config;
$$;
revoke execute on function public.bot_all_config() from public, anon, authenticated;
grant execute on function public.bot_all_config() to service_role;

-- Widen the admin-editable key list (0033 only allowed leveling/role_sync).
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
  if p_key not in ('leveling', 'role_sync', 'verification', 'moderation', 'tickets', 'stats', 'level_roles') then
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

-- ───────────────────────── 4. Verification (Appy replacement) ─────────────────────────

create or replace function public.bot_verify_member(
  p_discord text, p_username text default null, p_method text default 'button'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg jsonb;
  v_first boolean;
begin
  select value into v_cfg from public.discord_bot_config where key = 'verification';
  if v_cfg is not null and coalesce((v_cfg ->> 'enabled')::boolean, true) is false then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;
  if p_discord is null or p_discord = '' then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  v_first := not exists (select 1 from public.discord_verifications where discord_id = p_discord);

  insert into public.discord_verifications (discord_id, discord_username, user_id, method)
  values (p_discord, nullif(p_username, ''), public.bot_uid(p_discord), coalesce(p_method, 'button'))
  on conflict (discord_id) do update
    set discord_username = coalesce(nullif(excluded.discord_username, ''), public.discord_verifications.discord_username),
        user_id = coalesce(public.discord_verifications.user_id, excluded.user_id),
        verified_at = now();

  return jsonb_build_object(
    'ok', true,
    'first_time', v_first,
    'verified_role_id', v_cfg ->> 'verified_role_id',
    'unverified_role_id', v_cfg ->> 'unverified_role_id',
    'success_message', v_cfg ->> 'success_message',
    'linked', public.bot_uid(p_discord) is not null
  );
end;
$$;
revoke execute on function public.bot_verify_member(text, text, text) from public, anon, authenticated;
grant execute on function public.bot_verify_member(text, text, text) to service_role;

-- ───────────────────────── 5. Moderation cases (Sapphire replacement) ─────────────────────────

create or replace function public.bot_add_case(
  p_actor text,
  p_target text,
  p_action text,
  p_reason text default null,
  p_minutes int default null,
  p_target_username text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_actor uuid := public.bot_uid(p_actor);
begin
  insert into public.discord_mod_cases (actor_discord, target_discord, target_username, action, reason, duration_minutes)
  values (p_actor, p_target, nullif(p_target_username, ''), p_action, nullif(p_reason, ''), p_minutes)
  returning id into v_id;

  begin
    insert into public.audit_logs (actor_id, action, target_type, target_id, details)
    values (v_actor, 'discord_' || p_action, 'discord_user', p_target,
      jsonb_build_object('case', v_id, 'reason', p_reason, 'minutes', p_minutes, 'via', 'discord_bot'));
  exception when others then null; -- never fail a mod action on an audit hiccup
  end;

  return jsonb_build_object('ok', true, 'case', v_id);
end;
$$;
revoke execute on function public.bot_add_case(text, text, text, text, int, text) from public, anon, authenticated;
grant execute on function public.bot_add_case(text, text, text, text, int, text) to service_role;

create or replace function public.bot_list_cases(p_target text, p_limit int default 10)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'case', id, 'action', action, 'reason', reason, 'actor', actor_discord,
    'minutes', duration_minutes, 'at', created_at) order by created_at desc), '[]'::jsonb)
  from (
    select * from public.discord_mod_cases
    where target_discord = p_target
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  ) s;
$$;
revoke execute on function public.bot_list_cases(text, int) from public, anon, authenticated;
grant execute on function public.bot_list_cases(text, int) to service_role;

-- ───────────────────────── 6. Tickets (Sapphire replacement) ─────────────────────────

create or replace function public.bot_ticket_open(
  p_channel text, p_discord text, p_username text default null, p_subject text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.discord_tickets (channel_id, opener_discord, opener_username, subject)
  values (p_channel, p_discord, nullif(p_username, ''), nullif(p_subject, ''))
  on conflict (channel_id) do update set status = 'open', closed_at = null, closed_by = null
  returning id into v_id;
  return jsonb_build_object('ok', true, 'ticket', v_id);
end;
$$;
revoke execute on function public.bot_ticket_open(text, text, text, text) from public, anon, authenticated;
grant execute on function public.bot_ticket_open(text, text, text, text) to service_role;

-- How many tickets this user already has open (enforces max_open_per_user).
create or replace function public.bot_open_ticket_count(p_discord text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'count', (select count(*) from public.discord_tickets
              where opener_discord = p_discord and status = 'open'),
    'channels', coalesce((select jsonb_agg(channel_id) from public.discord_tickets
                          where opener_discord = p_discord and status = 'open'), '[]'::jsonb),
    'next', coalesce((select max(id) from public.discord_tickets), 0) + 1
  );
$$;
revoke execute on function public.bot_open_ticket_count(text) from public, anon, authenticated;
grant execute on function public.bot_open_ticket_count(text) to service_role;

create or replace function public.bot_ticket_close(p_channel text, p_by text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.discord_tickets%rowtype;
begin
  update public.discord_tickets
  set status = 'closed', closed_at = now(), closed_by = p_by
  where channel_id = p_channel and status = 'open'
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.discord_tickets where channel_id = p_channel;
    if v_row.id is null then
      return jsonb_build_object('ok', false, 'error', 'not_a_ticket');
    end if;
    return jsonb_build_object('ok', false, 'error', 'already_closed');
  end if;

  return jsonb_build_object('ok', true, 'ticket', v_row.id, 'opener', v_row.opener_discord,
    'subject', v_row.subject);
end;
$$;
revoke execute on function public.bot_ticket_close(text, text) from public, anon, authenticated;
grant execute on function public.bot_ticket_close(text, text) to service_role;

-- ───────────────────────── 7. Stats ─────────────────────────

-- Same shape as 0018's bot_server_stats plus the peak/all-time extras used in
-- the counter templates.
create or replace function public.bot_stats_extended()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'members', (select count(*) from public.profiles where not is_banned),
    'online', (select count(*) from public.profiles where last_seen_at > now() - interval '5 minutes'),
    'plays_today', (select count(*) from public.play_sessions
                    where created_at >= date_trunc('day', now() at time zone 'utc')),
    'plays_total', (select count(*) from public.play_sessions),
    'linked', (select count(*) from public.discord_levels where user_id is not null)
  );
$$;
revoke execute on function public.bot_stats_extended() from public, anon, authenticated;
grant execute on function public.bot_stats_extended() to service_role;
