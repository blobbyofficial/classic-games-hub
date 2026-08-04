-- 0064_gameplay_settings.sql
--
-- The settings page had appearance and privacy well covered and nothing at all
-- for actually playing: no volume, no default difficulty, no contrast option.
-- These are the columns behind the new Gameplay section.
--
-- Volumes are split rather than one "sound" slider. Music and effects are the
-- two people want to set differently - background music off, hit sounds on is
-- an extremely common preference, and a single slider cannot express it.
--
-- `default_difficulty` is the starting position of the per-game picker, not a
-- lock: choosing a different difficulty on a game page does not rewrite this.
-- It is deliberately the same three values the picker offers, so one enum
-- covers both and they cannot drift.

alter table public.user_settings
  add column if not exists sound_volume int not null default 70
    check (sound_volume between 0 and 100),
  add column if not exists music_volume int not null default 50
    check (music_volume between 0 and 100),
  add column if not exists default_difficulty text not null default 'regular'
    check (default_difficulty in ('easy', 'regular', 'hard')),
  -- Distinct from the OS-level `prefers-contrast`, which we cannot read
  -- reliably and cannot let someone override per-site.
  add column if not exists high_contrast boolean not null default false,
  -- Empty means "use the browser's". Storing a chosen zone matters because the
  -- server renders timestamps too, and it has no access to the browser's.
  add column if not exists timezone text not null default '',
  add column if not exists date_format text not null default 'auto'
    check (date_format in ('auto', 'dmy', 'mdy', 'iso'));
