-- Halloween is a free limited-time colour theme.
-- Existing default-theme users see Halloween during October, but once they
-- select another theme their preference is preserved.
create or replace function public.check_site_theme()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_free text[] := array['default','midnight','ocean','emerald','halloween'];
  v_premium text[] := array['crimson','gold','rose','synthwave','aurora'];
  v_allowed boolean;
begin
  if tg_op = 'UPDATE' and new.site_theme = old.site_theme then return new; end if;
  if new.site_theme = any(v_free) then return new; end if;
  if new.site_theme = any(v_premium) then
    select booster_since is not null or role in ('admin','moderator')
      into v_allowed from public.profiles where id = new.user_id;
    if coalesce(v_allowed, false) then return new; end if;
    raise exception 'theme_locked' using message = 'This theme is for server boosters and staff';
  end if;
  raise exception 'invalid_theme' using message = 'Unknown site theme';
end;
$$;
revoke execute on function public.check_site_theme() from public, anon, authenticated;

-- Convert untouched defaults for the October launch; do not change any user's
-- previously selected non-default theme.
update public.user_settings set site_theme = 'halloween' where site_theme = 'default';

-- New accounts created during October start with Halloween, but new accounts
-- created after the season get the normal site theme. Existing explicit choices
-- are never altered by this trigger.
create or replace function public.default_october_site_theme()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.site_theme = 'default' and extract(month from current_timestamp at time zone 'UTC') = 10 then
    new.site_theme := 'halloween';
  end if;
  return new;
end;
$$;
drop trigger if exists user_settings_october_theme on public.user_settings;
create trigger user_settings_october_theme
before insert on public.user_settings
for each row execute function public.default_october_site_theme();
