-- 0062_bot_config_reset_where.sql
--
-- Fixes `admin_reset_bot_config` from 0061, which failed at runtime with
-- "DELETE requires a WHERE clause".
--
-- The function applied cleanly and looked fine, because a migration runs as
-- `postgres`. Calls from the dashboard do not: PostgREST connects as
-- `authenticator`, and that role carries
--
--   session_preload_libraries = supautils, safeupdate
--
-- so every statement it runs - including inside a SECURITY DEFINER function,
-- which changes the privileges but not the session - goes through `safeupdate`,
-- which rejects an unqualified DELETE. Applying DDL and exercising the function
-- are different roles with different preloads, which is why this got past a
-- successful migration.
--
-- The predicate is the same key allowlist `bot_patch_config` and
-- `admin_set_bot_config` already enforce, rather than a `where true` written
-- only to get past the check. Reset then removes exactly the keys those two can
-- create, and a key added by a later migration has to be added here too - in
-- the same edit that adds it to the other two, which it already needs.
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
      'leveling', 'role_sync', 'verification', 'moderation', 'tickets', 'stats', 'level_roles'
    )
    returning key
  )
  select coalesce(array_agg(key order by key), array[]::text[]) into v_keys from removed;

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
