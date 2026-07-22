-- 0038_games_republish_site_themes.sql
-- Games overhaul + global colour themes.
--
-- 1. Republish the eight games pulled to "coming soon" in 0030 — all were
--    rebuilt to the quality bar in v1.2.2 (Tic-Tac-Toe and Connect Four as
--    exemplars; Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush and
--    Reversi in the follow-up pass), and the shared player shell now renders
--    HiDPI with a proper fullscreen experience and device-aware controls.
--
-- 2. Global site colour themes: a per-user `site_theme` on user_settings with
--    free presets for everyone and premium/animated presets reserved for
--    Discord boosters and staff — enforced at the database level so the gate
--    can't be bypassed by calling PostgREST directly.

update public.games
set status = 'published'
where slug in ('reversi','target','bubble','lightsout','slide','simon','tictactoe','connect4')
  and status = 'coming_soon';

alter table public.user_settings
  add column if not exists site_theme text not null default 'default';

-- Theme catalogue lives in code (lib/themes.ts); the DB enforces the split.
create or replace function public.check_site_theme()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_free text[] := array['default','midnight','ocean','emerald'];
  v_premium text[] := array['crimson','gold','rose','synthwave','aurora'];
  v_allowed boolean;
begin
  if new.site_theme = old.site_theme then
    return new;
  end if;
  if new.site_theme = any(v_free) then
    return new;
  end if;
  if new.site_theme = any(v_premium) then
    select booster_since is not null or role in ('admin','moderator')
    into v_allowed
    from public.profiles where id = new.user_id;
    if coalesce(v_allowed, false) then
      return new;
    end if;
    raise exception 'theme_locked' using message = 'This theme is for server boosters and staff';
  end if;
  raise exception 'invalid_theme' using message = 'Unknown site theme';
end;
$$;
revoke execute on function public.check_site_theme() from public, anon, authenticated;

drop trigger if exists user_settings_check_theme on public.user_settings;
create trigger user_settings_check_theme
before update of site_theme on public.user_settings
for each row execute function public.check_site_theme();
