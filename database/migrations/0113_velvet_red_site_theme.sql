-- 0113_velvet_red_site_theme.sql
-- Public, free, fixed-appearance Velvet Red theme.
-- Prerequisite: 0112_retire_old_site_themes.sql (simplified theme catalogue).
-- Keeps premium and retro locked until their own secure entitlement migrations.
create or replace function public.check_site_theme()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.site_theme is not distinct from old.site_theme then
    return new;
  end if;
  if new.site_theme in ('default', 'halloween', 'red') then
    return new;
  end if;
  raise exception 'This site theme is not available' using errcode = 'P0001';
end;
$$;
revoke execute on function public.check_site_theme() from public, anon, authenticated;

drop trigger if exists user_settings_check_theme on public.user_settings;
create trigger user_settings_check_theme
before update of site_theme on public.user_settings
for each row execute function public.check_site_theme();
