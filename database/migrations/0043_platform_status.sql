-- 0043_platform_status.sql
-- One RPC behind the public status page.
--
-- `platform_status()` returns a single jsonb document describing the health of
-- the whole platform: players online, games published, plays today, Discord
-- worker liveness, open reports and so on. It is SECURITY DEFINER and readable
-- by `anon` on purpose — /status is a public page — so it exposes counts only,
-- never a row that identifies anyone.
--
-- Two supporting pieces:
--   * bot_heartbeat(version) — the Discord gateway worker calls this on start
--     and every few minutes, writing `last_seen` into discord_bot_config. It is
--     service_role-only; the status page reads the timestamp it leaves behind
--     and calls the worker online when the beat is under three minutes old.
--   * jsonb_object_keys_count(jsonb) — counts keys in a jsonb object, used to
--     compare milestone roles created against milestone roles expected. Plain
--     `jsonb_object_keys` is set-returning, which cannot be inlined in the
--     jsonb_build_object below.

create or replace function public.bot_heartbeat(p_version text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.discord_bot_config (key, value, updated_at)
  values ('worker', jsonb_build_object('last_seen', now(), 'version', p_version), now())
  on conflict (key) do update
    set value = jsonb_build_object('last_seen', now(), 'version', p_version),
        updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.bot_heartbeat(text) from public, anon, authenticated;
grant execute on function public.bot_heartbeat(text) to service_role;

create or replace function public.jsonb_object_keys_count(p jsonb)
returns int
language sql
immutable
as $$
  select case when p is null or jsonb_typeof(p) <> 'object' then 0
              else (select count(*)::int from jsonb_object_keys(p)) end;
$$;

create or replace function public.platform_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'players', jsonb_build_object(
      'total', (select count(*) from public.profiles where not is_banned),
      'online', (select count(*) from public.profiles where last_seen_at > now() - interval '5 minutes'),
      'active_24h', (select count(*) from public.profiles where last_seen_at > now() - interval '24 hours'),
      'discord_linked', (select count(*) from public.profiles where discord_linked)
    ),
    'games', jsonb_build_object(
      'published', (select count(*) from public.games where status = 'published'),
      'coming_soon', (select count(*) from public.games where status = 'coming_soon'),
      'plays_today', (select count(*) from public.play_sessions
                      where created_at >= date_trunc('day', now() at time zone 'utc')),
      'plays_last_hour', (select count(*) from public.play_sessions
                          where created_at > now() - interval '1 hour'),
      'plays_total', (select count(*) from public.play_sessions)
    ),
    'social', jsonb_build_object(
      'messages_24h', (select count(*) from public.messages where created_at > now() - interval '24 hours'),
      'friendships', (select count(*) from public.friendships where status = 'accepted')
    ),
    'economy', jsonb_build_object(
      'credits_awarded_24h', (select coalesce(sum(amount), 0) from public.credit_transactions
                              where amount > 0 and created_at > now() - interval '24 hours'),
      'shop_items', (select count(*) from public.shop_items where available)
    ),
    'discord', jsonb_build_object(
      'worker_last_seen', (select value ->> 'last_seen' from public.discord_bot_config where key = 'worker'),
      'worker_online', coalesce(
        (select (value ->> 'last_seen')::timestamptz > now() - interval '3 minutes'
         from public.discord_bot_config where key = 'worker'), false),
      'leveling_enabled', coalesce(
        (select (value ->> 'enabled')::boolean from public.discord_bot_config where key = 'leveling'), false),
      'verification_configured', coalesce(
        (select value ->> 'verified_role_id' is not null
         from public.discord_bot_config where key = 'verification'), false),
      'tickets_configured', coalesce(
        (select value ->> 'staff_role_id' is not null
         from public.discord_bot_config where key = 'tickets'), false),
      'counters_configured', coalesce(
        (select value -> 'channels' ->> 'online' is not null
         from public.discord_bot_config where key = 'stats'), false),
      'milestone_roles_created', coalesce(
        (select public.jsonb_object_keys_count(value -> 'roles')
         from public.discord_bot_config where key = 'level_roles'), 0),
      'milestone_roles_expected', coalesce(
        (select jsonb_array_length(value -> 'milestones')
         from public.discord_bot_config where key = 'level_roles'), 0),
      'chat_members', (select count(*) from public.discord_levels),
      'mod_cases', (select count(*) from public.discord_mod_cases),
      'open_tickets', (select count(*) from public.discord_tickets where status = 'open')
    ),
    'moderation', jsonb_build_object(
      'open_reports', (select count(*) from public.reports where status = 'open'),
      'banned', (select count(*) from public.profiles where is_banned)
    )
  );
$$;

revoke execute on function public.platform_status() from public;
grant execute on function public.platform_status() to anon, authenticated, service_role;
revoke execute on function public.jsonb_object_keys_count(jsonb) from public;
grant execute on function public.jsonb_object_keys_count(jsonb) to anon, authenticated, service_role;
