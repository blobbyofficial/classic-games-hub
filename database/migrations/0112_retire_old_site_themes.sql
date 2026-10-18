-- Retire the old site-colour presets without deleting accounts or other settings.
-- Keep 'default' as Basic's internal ID to avoid changing the user_settings schema.
-- The Halloween choice remains available during its seasonal window.
-- This migration is idempotent.
create or replace function public.check_site_theme()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.site_theme is not distinct from old.site_theme then
    return new;
  end if;
  if new.site_theme in ('default', 'halloween') then
    return new;
  end if;
  raise exception 'invalid_theme' using message = 'This site theme is no longer available';
end;
$$;
revoke execute on function public.check_site_theme() from public, anon, authenticated;

-- Normalise all retired values before adding any stricter database constraint.
update public.user_settings
set site_theme = 'default'
where site_theme not in ('default', 'halloween');

drop trigger if exists user_settings_check_theme on public.user_settings;
create trigger user_settings_check_theme
before update of site_theme on public.user_settings
for each row execute function public.check_site_theme();

-- Remove this old constraint if a previous version happened to install it;
-- do not guess its name or drop unrelated user_settings constraints.
-- New applications validate availability server-side and through the trigger.
