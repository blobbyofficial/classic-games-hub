-- 0061_bot_config_reset.sql
--
-- Clears every Discord bot setting back to its built-in default, for the
-- "Reset all settings" control in Admin -> Discord bot -> Sync.
--
-- The dashboard accumulates ids - roles, channels, categories, panel messages -
-- that point at a specific server. Moving the bot to a new guild, or recovering
-- from a half-finished setup against a server whose channels have since been
-- deleted, previously meant clearing a dozen fields by hand and getting all of
-- them right; a stale id is worse than an empty one, because setup treats it as
-- an instruction to use that exact channel and reports it missing rather than
-- creating a replacement.

-- Deletes rather than overwriting with defaults. `bot_get_config` returns null
-- for an absent key and every caller already merges over its own defaults, so
-- no row *is* the default - writing the defaults out would duplicate them in a
-- second place and let the two drift apart at the next edit.
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
    delete from public.discord_bot_config returning key
  )
  select coalesce(array_agg(key order by key), array[]::text[]) into v_keys from removed;

  -- Logged like any other destructive admin action: this throws away ids that
  -- cannot be recovered from the dashboard, so who did it and when is worth
  -- more than the row it deletes.
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
