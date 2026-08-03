-- 0063_discord_publishing.sql
--
-- Mirroring the update log and announcements into Discord.
--
-- Two things are needed for a mirror rather than a one-way post: somewhere to
-- keep the settings, and a record of which Discord message holds which release
-- or announcement. Without the second one every sync posts a fresh copy, an
-- edit on the website is invisible in Discord, and a channel that should read
-- as a changelog reads as the same changelog nine times over.

-- ───────────────────────── 1. What we have posted ─────────────────────────

create table if not exists public.discord_posts (
  -- 'release' | 'announcement'. Deliberately not an enum: a third kind
  -- (tournament results, daily challenges) is a one-line change here.
  kind text not null check (kind in ('release', 'announcement')),
  -- The thing being mirrored: a version string, or an announcement's uuid.
  ref text not null,
  channel_id text not null,
  message_id text not null,
  -- Fingerprint of the payload that was posted. A sync with nothing to say
  -- compares digests and writes nothing at all, which is what makes running
  -- it every fifteen minutes cost one read rather than a hundred edits.
  digest text not null,
  posted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (kind, ref)
);

alter table public.discord_posts enable row level security;
-- No client policies. This is the bot's bookkeeping, not player data: the
-- website reaches it through the service_role RPCs below, and nothing else
-- has any business reading which message id holds which release.

-- ───────────────────────── 2. Reading and recording ─────────────────────────

create or replace function public.bot_posts(p_kind text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      ref,
      jsonb_build_object('channel_id', channel_id, 'message_id', message_id, 'digest', digest)
    ),
    '{}'::jsonb
  )
  from public.discord_posts
  where kind = p_kind;
$$;
revoke execute on function public.bot_posts(text) from public, anon, authenticated;
grant execute on function public.bot_posts(text) to service_role;

create or replace function public.bot_record_post(
  p_kind text, p_ref text, p_channel text, p_message text, p_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('release', 'announcement') then
    return jsonb_build_object('ok', false, 'error', 'unknown_kind');
  end if;
  insert into public.discord_posts (kind, ref, channel_id, message_id, digest)
  values (p_kind, p_ref, p_channel, p_message, p_digest)
  on conflict (kind, ref) do update
    set channel_id = excluded.channel_id,
        message_id = excluded.message_id,
        digest = excluded.digest,
        updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.bot_record_post(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.bot_record_post(text, text, text, text, text) to service_role;

-- Called when the Discord message is gone - deleted by hand, or because the
-- announcement behind it was unpublished. Qualified by both key columns, which
-- `safeupdate` requires of anything reachable outside a migration (see 0062).
create or replace function public.bot_forget_post(p_kind text, p_ref text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.discord_posts where kind = p_kind and ref = p_ref;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.bot_forget_post(text, text) from public, anon, authenticated;
grant execute on function public.bot_forget_post(text, text) to service_role;

-- Published announcements, newest first, for the mirror to work from. The bot
-- runs as service_role and could read the table directly; going through an RPC
-- keeps the shape it depends on in one place, so a column rename is caught
-- here rather than in a sync that silently starts posting empty embeds.
create or replace function public.bot_published_announcements(p_limit integer default 25)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(a)), '[]'::jsonb)
  from (
    select id, title, body, level, link_label, link_href,
           coalesce(published_at, created_at) as published_at
    from public.announcements
    where published
    order by coalesce(published_at, created_at) desc
    limit greatest(1, least(100, coalesce(p_limit, 25)))
  ) a;
$$;
revoke execute on function public.bot_published_announcements(integer) from public, anon, authenticated;
grant execute on function public.bot_published_announcements(integer) to service_role;

-- ───────────────────────── 3. The `publishing` config key ─────────────────────────

-- Every config writer enforces the same allowlist, so a new key has to be
-- added to all three in one edit - which is what 0062's comment asks for.
create or replace function public.bot_patch_config(p_key text, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value jsonb;
begin
  if p_key not in ('leveling', 'role_sync', 'verification', 'moderation', 'tickets', 'stats', 'level_roles', 'publishing') then
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
  if p_key not in ('leveling', 'role_sync', 'verification', 'moderation', 'tickets', 'stats', 'level_roles', 'publishing') then
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

-- Reset clears the publishing ids too, and forgets which messages it posted.
-- Leaving the message ids behind after a reset would have the next sync edit
-- messages in a server the dashboard is no longer pointed at.
create or replace function public.admin_reset_bot_config()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_keys text[];
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  with removed as (
    delete from public.discord_bot_config
    where key in (
      'leveling', 'role_sync', 'verification', 'moderation', 'tickets', 'stats', 'level_roles', 'publishing'
    )
    returning key
  )
  select coalesce(array_agg(key order by key), array[]::text[]) into v_keys from removed;

  delete from public.discord_posts where kind in ('release', 'announcement');

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'bot_config_reset',
    'discord_bot_config',
    'all',
    jsonb_build_object('cleared', to_jsonb(v_keys))
  );

  return jsonb_build_object('ok', true, 'cleared', to_jsonb(v_keys));
end;
$$;
revoke execute on function public.admin_reset_bot_config() from public, anon;
grant execute on function public.admin_reset_bot_config() to authenticated;
