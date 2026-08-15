-- 0073_discord_audit_poller.sql
--
-- Server logging without an always-on host.
--
-- 0072 added the storage for server logging; the feature that reads it lives
-- in the gateway worker, because gateway events are the only place message
-- deletions, edits, joins and leaves exist. That worker needs somewhere to run
-- that stays up, and free always-on hosting is not a thing this deployment
-- has - which left a built feature nobody could switch on.
--
-- Discord's own audit log is the way round it. It is pollable over plain REST,
-- it needs no persistent connection, and it contains every *structural* change
-- in the server: channels created, renamed, moved and deleted, roles
-- recoloured and re-permissioned, members kicked, banned, timed out, renamed
-- and given roles, invites, webhooks, emoji, threads, and messages deleted by
-- a moderator. That is most of what a server log is read for, and it runs on a
-- free scheduler hitting one serverless route.
--
-- It is genuinely not a replacement for the worker. Message *content*, message
-- edits, self-deletes, joins, leaves and voice are absent from the audit log
-- and always will be. Both halves are supported, and `docs/discord-bot.md`
-- says which gives you what.
--
-- This migration is only the cursor: where the poller has read up to.

-- ───────────────────────── 1. The cursor ─────────────────────────
--
-- Stored in discord_bot_config under its own key rather than inside `logging`,
-- because `logging` is admin-edited and this is machine state. Mixing them
-- would mean a dashboard save could rewind or skip the poller, and the first
-- symptom of that is duplicate log entries nobody can explain.
--
-- Deliberately NOT added to admin_set_bot_config's key list: nothing a person
-- edits belongs here, and leaving it out is what keeps it off the settings UI.

insert into public.discord_bot_config (key, value)
values ('logging_state', jsonb_build_object('cursor', null))
on conflict (key) do nothing;

create or replace function public.bot_logging_cursor()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.discord_bot_config where key = 'logging_state'),
    jsonb_build_object('cursor', null)
  );
$$;
revoke execute on function public.bot_logging_cursor() from public, anon, authenticated;
grant execute on function public.bot_logging_cursor() to service_role;

create or replace function public.bot_set_logging_cursor(p_cursor text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Snowflakes only. The cursor is interpolated into a Discord API query
  -- string, so it is validated at the point it is stored rather than trusted
  -- because "only our own code writes it".
  if p_cursor is null or p_cursor !~ '^\d{1,25}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_cursor');
  end if;

  insert into public.discord_bot_config (key, value, updated_at)
  values ('logging_state', jsonb_build_object('cursor', p_cursor), now())
  on conflict (key) do update
    set value = public.discord_bot_config.value || jsonb_build_object('cursor', p_cursor),
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.bot_set_logging_cursor(text) from public, anon, authenticated;
grant execute on function public.bot_set_logging_cursor(text) to service_role;

-- The reset clears the cursor along with everything else. A cursor left
-- pointing into another server's audit log would make the first poll after a
-- move either replay a backlog or skip one.
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
      'leveling', 'role_sync', 'verification', 'moderation', 'tickets',
      'stats', 'level_roles', 'publishing', 'logging', 'logging_state'
    )
    returning key
  )
  select coalesce(array_agg(key order by key), array[]::text[]) into v_keys from removed;

  delete from public.discord_posts where kind in ('release', 'announcement');

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(), 'bot_config_reset', 'discord_bot_config', 'all',
    jsonb_build_object('cleared', to_jsonb(v_keys))
  );

  return jsonb_build_object('ok', true, 'cleared', to_jsonb(v_keys));
end;
$$;
revoke execute on function public.admin_reset_bot_config() from public, anon;
grant execute on function public.admin_reset_bot_config() to authenticated;

-- ───────────────────────── 2. Schema version ─────────────────────────

insert into public.status_meta (key, value)
values ('schema', jsonb_build_object('version', '0073'))
on conflict (key) do update set value = excluded.value, updated_at = now();
