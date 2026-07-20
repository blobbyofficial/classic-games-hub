-- 0021: Profile 2.0 — about-me fields, showcase, featured achievement, flags.
-- Display-name styles live inside the existing `equipped` jsonb (equipped.name_style)
-- so they need no new column and inherit the existing update grant.

alter table public.profiles
  add column if not exists pronouns text check (char_length(pronouns) <= 24),
  add column if not exists status_text text check (char_length(status_text) <= 80),
  add column if not exists favourite_game_slug text check (char_length(favourite_game_slug) <= 64),
  add column if not exists featured_achievement text check (char_length(featured_achievement) <= 64),
  add column if not exists showcase jsonb not null default '[]'::jsonb,
  add column if not exists profile_flags jsonb not null default '{}'::jsonb;

-- Let players edit their own about-me fields directly (RLS still scopes to own row).
grant update (pronouns, status_text, favourite_game_slug, featured_achievement, showcase, profile_flags)
  on public.profiles to authenticated;
