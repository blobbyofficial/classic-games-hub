-- 0072_discord_logging.sql
--
-- Server audit logging - the last thing Sapphire was still doing better.
--
-- The bot could already tell you about the moderation *it* performed: a case
-- number for every /warn, /timeout and /ban. What it could not tell you was
-- anything about the server itself. A channel disappearing, a role quietly
-- gaining Manage Server, a message deleted three minutes before someone
-- complained about it - none of that left a trace anywhere the staff could
-- read, and Discord's own audit log keeps 90 days, shows no message content,
-- and cannot be filtered to the channels you care about.
--
-- This migration is only the storage: one config row, read by the gateway
-- worker (bot/src/features/logging) which is the half that can actually see
-- these events. An HTTP interactions endpoint never hears about them at all.

-- ───────────────────────── 1. Defaults ─────────────────────────
--
-- `enabled` is false and every channel is null on purpose. The feature is
-- opt-in per server because it is the one part of the bot that writes down
-- what people said, and that should be a decision somebody makes rather than
-- something that starts happening after a deploy.
--
-- Every individual event defaults to on, because turning noise off once you
-- can see it is a far easier judgement than guessing in advance which of
-- twenty-seven events you will one day wish you had switched on.

insert into public.discord_bot_config (key, value) values
  ('logging', jsonb_build_object(
    'enabled', false,
    -- The catch-all. Every category falls back to this, so the simple setup
    -- is one channel and nothing else.
    'channel_id', null,
    'channels', jsonb_build_object(
      'messages', null,
      'members', null,
      'server', null,
      'voice', null,
      'moderation', null
    ),
    'events', jsonb_build_object(
      'message_delete', true,
      'message_edit', true,
      'message_bulk_delete', true,
      'member_join', true,
      'member_leave', true,
      'member_nickname', true,
      'member_roles', true,
      'member_timeout', true,
      'member_ban', true,
      'member_unban', true,
      'channel_create', true,
      'channel_delete', true,
      'channel_update', true,
      'thread_create', true,
      'thread_delete', true,
      'role_create', true,
      'role_delete', true,
      'role_update', true,
      'emoji_update', true,
      'sticker_update', true,
      'invite_create', true,
      'invite_delete', true,
      'voice_join', true,
      'voice_leave', true,
      'voice_move', true,
      'server_update', true,
      'webhook_update', true
    ),
    'ignored_channel_ids', '[]'::jsonb,
    'ignored_role_ids', '[]'::jsonb,
    'ignored_user_ids', '[]'::jsonb,
    -- Bots are the loudest thing in a log channel and the least interesting.
    'ignore_bots', true,
    -- Quoting the deleted message is the whole point of a delete log, but it
    -- is a real privacy decision, so it is one switch rather than something
    -- buried per-event.
    'include_content', true
  ))
on conflict (key) do nothing;

-- ───────────────────────── 2. Let admins edit it ─────────────────────────
--
-- Both key lists are hard-coded rather than derived, which is deliberate: it
-- is what stops an arbitrary key being written into the bot's configuration
-- table through a function granted to every authenticated user. The cost is
-- that adding a section means editing them, which is this block.

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
  if p_key not in (
    'leveling', 'role_sync', 'verification', 'moderation', 'tickets',
    'stats', 'level_roles', 'publishing', 'logging'
  ) then
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

-- Reset clears the logging channel ids along with everything else. A stale log
-- channel id is the same problem as a stale panel id: the worker reads it as
-- "write there", and there is a different server on the other end.
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
      'stats', 'level_roles', 'publishing', 'logging'
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

-- ───────────────────────── 3. Schema version ─────────────────────────

insert into public.status_meta (key, value)
values ('schema', jsonb_build_object('version', '0072'))
on conflict (key) do update set value = excluded.value, updated_at = now();
