-- Repair deployments where the original theme trigger still rejects Halloween.
-- Idempotent: explicitly allow Halloween as a free site theme, retaining premium gating.
create or replace function public.check_site_theme()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_allowed boolean;
begin
  if tg_op = 'UPDATE' and new.site_theme is not distinct from old.site_theme then
    return new;
  end if;
  if new.site_theme = any(array['default','midnight','ocean','emerald','halloween']) then
    return new;
  end if;
  if new.site_theme = any(array['crimson','gold','rose','synthwave','aurora']) then
    select (booster_since is not null or role in ('admin','moderator'))
      into v_allowed from public.profiles where id = new.user_id;
    if coalesce(v_allowed, false) then return new; end if;
    raise exception 'This theme is for server boosters and staff' using errcode = 'P0001';
  end if;
  raise exception 'Unknown site theme' using errcode = 'P0001';
end;
$$;
revoke execute on function public.check_site_theme() from public, anon, authenticated;
drop trigger if exists user_settings_check_theme on public.user_settings;
create trigger user_settings_check_theme
before update of site_theme on public.user_settings
for each row execute function public.check_site_theme();
