-- 0070_in_development.sql
--
-- Every game goes into development at once.
--
-- The whole library is being rebuilt (roadmap v1.6.0 "Ground Up"), and until a
-- game has been through that it is playable by staff only. `in_development`
-- says exactly that: shipped, still listed, still rated and still holding its
-- leaderboards - but locked to admins and moderators while it is worked on, so
-- each rebuild can be played on the real site before anyone else sees it.
--
-- WHY NOT `coming_soon`, which already exists: it means *never released*. The
-- card it renders is `pointer-events-none`, it drops the favourite button, and
-- `submit_score` refuses it outright. Moving twenty-six live games into it
-- would strip affordances from games that have shipped and have history, and
-- would tell players something untrue. This is a different state and says so.
--
-- WHY THIS MIGRATION IS LONGER THAN "ADD A STATUS": `'published'` is not just a
-- label, it is a literal that four database objects test for. Widening the
-- value without widening its readers does not degrade the arcade, it empties
-- it - the RLS policy alone would hide all twenty-six games from everyone who
-- is not staff. So the readers are widened FIRST, and the rows are flipped
-- last, leaving no window where the library is invisible.

-- ── the value ───────────────────────────────────────────────────────────────

alter table public.games drop constraint if exists games_status_check;
alter table public.games add constraint games_status_check
  check (status in ('published', 'draft', 'archived', 'coming_soon', 'in_development'));

comment on column public.games.status is
  'published: open to all. in_development: listed and visible, but only staff '
  'may record a play while the game is being rebuilt. coming_soon: visible, '
  'never released, nobody may play. draft/archived: invisible to non-staff.';

-- ── readers, widened before anything moves ──────────────────────────────────

-- Without this every game vanishes for everyone who is not staff, because the
-- policy is what makes a row selectable at all.
drop policy if exists "published games are public" on public.games;
create policy "published games are public" on public.games
  for select using (
    status in ('published', 'coming_soon', 'in_development') or public.is_staff()
  );

-- All three are partial on status and would otherwise index nothing once the
-- rows move. Dropped and recreated rather than left to rot.
drop index if exists public.games_category_idx;
drop index if exists public.games_featured_idx;
drop index if exists public.games_popularity_idx;

create index games_category_idx on public.games (category)
  where status in ('published', 'in_development');
create index games_featured_idx on public.games (featured, sort_weight desc)
  where status in ('published', 'in_development');
create index games_popularity_idx on public.games (play_count desc)
  where status in ('published', 'in_development');

-- ── submit_score ────────────────────────────────────────────────────────────
--
-- 0056 argued against re-declaring this function and it was right to: the body
-- has been re-emitted across 0004, 0006, 0013, 0036, 0042, 0067 and 0069, and
-- every copy is a chance for it to drift. That argument was about *adding* a
-- rule, which a trigger can do from outside the function.
--
-- This is not that. The function's own lookup excludes the row before any
-- trigger can see it - an in-development game would raise 'game not found' for
-- staff too - so no trigger can rescue it and the body has to be re-emitted.
-- It is 0069's, verbatim, with exactly one predicate changed and nothing else
-- touched. The staff-only rule itself still lives in the trigger below.
--
-- Only the four-argument overload is re-declared. 0069 made the three-argument
-- one a thin wrapper that delegates here, so there is still one body.

create or replace function public.submit_score(
  p_slug text,
  p_score bigint,
  p_duration integer,
  p_difficulty text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_game public.games;
  v_score bigint;
  v_duration int;
  v_recent int;
  v_rewarded boolean := true;
  v_credit_mult int := 1;
  v_xp_mult int := 1;
  v_base_credits int := 0;
  v_credits int := 0;
  v_xp int;
  v_best bigint;
  v_improved boolean := false;
  v_event_mult numeric := 1;
  v_difficulty text;
  v_diff_mult numeric;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;
  if exists (select 1 from public.profiles where id = v_me and is_banned) then
    raise exception 'account suspended';
  end if;

  -- THE ONE CHANGED LINE. An in-development game is a real game with real
  -- history; whether this particular player may record a run is the trigger's
  -- decision, not this lookup's.
  select * into v_game from public.games
  where slug = p_slug and status in ('published', 'in_development');
  if v_game.id is null then
    raise exception 'game not found';
  end if;

  v_difficulty := coalesce(nullif(p_difficulty, ''), 'regular');
  if v_difficulty not in ('easy', 'regular', 'hard') then
    v_difficulty := 'regular';
  end if;

  v_diff_mult := case v_difficulty when 'easy' then 0.75 when 'hard' then 1.25 else 1 end;

  v_score := greatest(0, p_score);
  if v_game.max_score is not null then
    v_score := least(v_score, v_game.max_score);
  end if;
  v_duration := greatest(0, least(coalesce(p_duration, 0), 7200));

  select count(*) into v_recent
  from public.play_sessions
  where user_id = v_me and game_id = v_game.id and created_at > now() - interval '1 hour';
  if v_recent >= 30 then
    v_rewarded := false;
  end if;

  if v_rewarded then
    perform public.settle_user_boosts(v_me);
    v_credit_mult := public.boost_multiplier(v_me, 'credit_boost');
    v_xp_mult := public.boost_multiplier(v_me, 'xp_boost');

    v_base_credits := least(2 + (v_score / v_game.credit_divisor)::int, v_game.max_credits_per_session);
    v_credits := v_base_credits * v_credit_mult;

    select greatest(1, least(coalesce((payload->>'multiplier')::numeric, 1), 5))
    into v_event_mult
    from public.feature_flags
    where key = 'seasonal_event' and enabled;
    if v_event_mult is null then
      v_event_mult := 1;
    end if;
    if v_event_mult > 1 then
      v_credits := floor(v_credits * v_event_mult)::int;
    end if;

    v_credits := greatest(0, floor(v_credits * v_diff_mult)::int);
    v_xp := greatest(1, floor((5 + v_base_credits * 3) * v_xp_mult * v_diff_mult)::int);
  else
    v_xp := 1;
  end if;

  insert into public.play_sessions (user_id, game_id, score, duration_seconds, xp_earned, credits_earned, difficulty)
  values (v_me, v_game.id, v_score, v_duration, v_xp, v_credits, v_difficulty);

  -- Every difficulty now ranks, on its own board.
  select best_score into v_best
  from public.leaderboard_scores
  where game_id = v_game.id and user_id = v_me and difficulty = v_difficulty;
  v_improved := v_score > 0 and v_score > coalesce(v_best, -1);

  insert into public.leaderboard_scores as ls (game_id, user_id, difficulty, best_score, plays, achieved_at)
  values (v_game.id, v_me, v_difficulty, v_score, 1, now())
  on conflict (game_id, user_id, difficulty)
  do update set
    plays = ls.plays + 1,
    best_score = greatest(ls.best_score, excluded.best_score),
    achieved_at = case when excluded.best_score > ls.best_score then now() else ls.achieved_at end
  returning best_score into v_best;

  update public.games set play_count = play_count + 1 where id = v_game.id;

  if v_credits > 0 then
    perform public.award_credits(v_me, v_credits, 'game_play', 'game', v_game.slug,
      jsonb_build_object('score', v_score, 'difficulty', v_difficulty));
  end if;
  perform public.add_xp(v_me, v_xp);

  -- The activity feed stays a regular-only signal. "New high score!" in the
  -- friends feed should mean the board everyone competes on, not a personal
  -- best on easy.
  if v_improved and v_difficulty = 'regular' then
    insert into public.activity_events (user_id, type, data)
    values (v_me, 'high_score', jsonb_build_object(
      'game', v_game.slug, 'title', v_game.title, 'score', v_score));
  end if;

  perform public.ensure_daily_challenges();
  if v_rewarded then
    perform public.bump_challenge_progress(v_me, 'play_games', 1);
    perform public.bump_challenge_progress(v_me, 'play_category', 1, v_game.category);
    if v_credits > 0 then
      perform public.bump_challenge_progress(v_me, 'earn_credits', v_credits);
    end if;
    perform public.bump_community_event(v_me);
  end if;
  perform public.check_achievements(v_me);

  return jsonb_build_object(
    'ok', true,
    'credits_earned', v_credits,
    'xp_earned', v_xp,
    'best_score', v_best,
    'new_best', v_improved,
    'difficulty', v_difficulty,
    'ranked', true,
    'event_multiplier', v_event_mult,
    'credit_multiplier', v_credit_mult,
    'rewarded', v_rewarded
  );
end;
$$;

revoke execute on function public.submit_score(text, bigint, integer, text) from public, anon;
grant execute on function public.submit_score(text, bigint, integer, text) to authenticated;

-- ── set_party_game ──────────────────────────────────────────────────────────
--
-- Otherwise a leader can pick nothing at all: every game in the picker would
-- come back 'unknown_game'. The gate on actually recording the run is the
-- trigger, which applies to party runs exactly as it does to solo ones - a
-- party of non-staff can start an in-development game and simply score nothing,
-- which is the same bargain early access already makes.

create or replace function public.set_party_game(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_party_id uuid;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  select id into v_party_id from public.parties
  where leader_id = v_me
    and id = (select party_id from public.party_members where user_id = v_me);
  if v_party_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_leader');
  end if;

  if p_slug is not null and p_slug <> ''
     and not exists (
       select 1 from public.games
       where slug = p_slug and status in ('published', 'in_development')
     ) then
    return jsonb_build_object('ok', false, 'error', 'unknown_game');
  end if;

  update public.parties
  set game_slug = nullif(p_slug, ''), updated_at = now()
  where id = v_party_id;

  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.set_party_game(text) from public, anon;
grant execute on function public.set_party_game(text) to authenticated;

-- ── platform_status ─────────────────────────────────────────────────────────
--
-- Re-emitted in full because it is one SQL expression. Without it /status would
-- report zero games the moment the rows move, which is the one page whose whole
-- job is to not be wrong about that. Body is 0043's with a single key added.

create or replace function public.platform_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'players', jsonb_build_object(
      'total', (select count(*) from public.profiles where not is_banned),
      'online', (select count(*) from public.profiles where last_seen_at > now() - interval '5 minutes'),
      'active_24h', (select count(*) from public.profiles where last_seen_at > now() - interval '24 hours'),
      'discord_linked', (select count(*) from public.profiles where discord_linked)
    ),
    'games', jsonb_build_object(
      'published', (select count(*) from public.games where status = 'published'),
      'in_development', (select count(*) from public.games where status = 'in_development'),
      'coming_soon', (select count(*) from public.games where status = 'coming_soon'),
      'plays_today', (select count(*) from public.play_sessions
                      where created_at >= date_trunc('day', now() at time zone 'utc')),
      'plays_last_hour', (select count(*) from public.play_sessions
                          where created_at > now() - interval '1 hour'),
      'plays_total', (select count(*) from public.play_sessions)
    ),
    'social', jsonb_build_object(
      'messages_24h', (select count(*) from public.messages where created_at > now() - interval '24 hours'),
      'friendships', (select count(*) from public.friendships where status = 'accepted')
    ),
    'economy', jsonb_build_object(
      'credits_awarded_24h', (select coalesce(sum(amount), 0) from public.credit_transactions
                              where amount > 0 and created_at > now() - interval '24 hours'),
      'shop_items', (select count(*) from public.shop_items where available)
    ),
    'discord', jsonb_build_object(
      'worker_last_seen', (select value ->> 'last_seen' from public.discord_bot_config where key = 'worker'),
      'worker_online', coalesce(
        (select (value ->> 'last_seen')::timestamptz > now() - interval '3 minutes'
         from public.discord_bot_config where key = 'worker'), false),
      'leveling_enabled', coalesce(
        (select (value ->> 'enabled')::boolean from public.discord_bot_config where key = 'leveling'), false),
      'verification_configured', coalesce(
        (select value ->> 'verified_role_id' is not null
         from public.discord_bot_config where key = 'verification'), false),
      'tickets_configured', coalesce(
        (select value ->> 'staff_role_id' is not null
         from public.discord_bot_config where key = 'tickets'), false),
      'counters_configured', coalesce(
        (select value -> 'channels' ->> 'online' is not null
         from public.discord_bot_config where key = 'stats'), false),
      'milestone_roles_created', coalesce(
        (select public.jsonb_object_keys_count(value -> 'roles')
         from public.discord_bot_config where key = 'level_roles'), 0),
      'milestone_roles_expected', coalesce(
        (select jsonb_array_length(value -> 'milestones')
         from public.discord_bot_config where key = 'level_roles'), 0),
      'chat_members', (select count(*) from public.discord_levels),
      'mod_cases', (select count(*) from public.discord_mod_cases),
      'open_tickets', (select count(*) from public.discord_tickets where status = 'open')
    ),
    'moderation', jsonb_build_object(
      'open_reports', (select count(*) from public.reports where status = 'open'),
      'banned', (select count(*) from public.profiles where is_banned)
    )
  );
$$;

revoke execute on function public.platform_status() from public;
grant execute on function public.platform_status() to anon, authenticated, service_role;

-- ── the gate ────────────────────────────────────────────────────────────────
--
-- `enforce_early_access` now guards two rules, not one, and keeps its name
-- because it keeps its job: it is the single `before insert` gate on
-- play_sessions deciding whether this player may record a run of this game.
-- Both rules answer that question, so they belong in one function - a second
-- trigger on the same table would leave the firing order between them
-- unstated, and the error a player sees would depend on it.
--
--   in_development  -> admins and moderators only
--   early access    -> boosters and staff, until the date passes
--
-- The two compose: a booster does NOT get into an in-development game, because
-- early access is a head start on release and this is not a release.
--
-- 0056's boundary still holds exactly as written: this gates *earning*, not the
-- page. Someone determined can still load the engine in their browser; what
-- they cannot do is record anything for it. The UI hides the player, and the
-- database refuses the result.

create or replace function public.enforce_early_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until timestamptz;
  v_status text;
  v_staff boolean;
  v_ok boolean;
begin
  select early_access_until, status into v_until, v_status
  from public.games where id = new.game_id;

  if v_status = 'in_development' then
    select (p.role in ('admin', 'moderator')) into v_staff
    from public.profiles p where p.id = new.user_id;

    if not coalesce(v_staff, false) then
      raise exception 'in development: this game is staff-only while it is rebuilt'
        using errcode = 'check_violation';
    end if;
  end if;

  if v_until is not null and v_until > now() then
    select (p.booster_since is not null or p.role in ('admin', 'moderator'))
    into v_ok
    from public.profiles p
    where p.id = new.user_id;

    if not coalesce(v_ok, false) then
      raise exception 'early access: this game is boosters-only until %', v_until
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- ── and only now, the rows ──────────────────────────────────────────────────
--
-- Published only. Drafts and archived titles are not part of this and stay
-- where they are; nothing currently sits in coming_soon.

update public.games set status = 'in_development' where status = 'published';
