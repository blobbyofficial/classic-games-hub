-- 0056_early_access.sql
-- Early access for boosters (roadmap v1.5.0).
--
-- A game with `early_access_until` set in the future is playable only by
-- boosters (and staff) until that moment, then opens to everyone. It stays
-- visible to everyone the whole time, shown locked with a countdown - a perk
-- nobody can see is a perk nobody wants, and the point of early access is
-- partly that other people know it is happening.
--
-- The gate is a TRIGGER on play_sessions rather than a check inside
-- submit_score(). submit_score is a hundred lines and has already been
-- re-declared four times across 0004, 0006, 0013, 0036 and 0042; adding a
-- fifth copy to insert one `if` would be a fifth chance for the rest of the
-- body to drift from what is live. A trigger states the rule once, in one
-- place, and keeps holding no matter how submit_score is rewritten later.
--
-- play_sessions is the right hook because it is the record that a play
-- happened, and submit_score inserts it before touching the leaderboard - so
-- raising here aborts the whole transaction and no score, XP or credits land
-- either. Anything that ever records a play, by any route, is covered.
--
-- Note this gates *earning*, not the page. A determined non-booster can still
-- load the engine in their browser; what they cannot do is record a score for
-- it. That is the honest boundary: the UI hides the player, and the database
-- refuses the result.

alter table public.games add column if not exists early_access_until timestamptz;

comment on column public.games.early_access_until is
  'While in the future, only boosters and staff may record plays. Null means open to all.';

-- Partial index: the vast majority of games have this null forever.
create index if not exists games_early_access_idx
  on public.games (early_access_until)
  where early_access_until is not null;

create or replace function public.enforce_early_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until timestamptz;
  v_ok boolean;
begin
  select early_access_until into v_until from public.games where id = new.game_id;

  if v_until is null or v_until <= now() then
    return new;
  end if;

  select (p.booster_since is not null or p.role in ('admin', 'moderator'))
  into v_ok
  from public.profiles p
  where p.id = new.user_id;

  if coalesce(v_ok, false) then
    return new;
  end if;

  raise exception 'early access: this game is boosters-only until %', v_until
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists play_sessions_early_access on public.play_sessions;
create trigger play_sessions_early_access
  before insert on public.play_sessions
  for each row execute function public.enforce_early_access();
