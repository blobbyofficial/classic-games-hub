-- 0081: serialize per-user score submissions before counting hourly rewards.
-- This addresses concurrency in the existing limit, NOT client-score authenticity.
-- Validate against a disposable migrated database before deploying.

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

  -- Serialize submissions for this account so concurrent requests cannot all
  -- observe the same recent-session count before inserting their own row.
  perform 1 from public.profiles where id = v_me for update;
  if not found then raise exception 'profile not found'; end if;

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

    -- Use numeric arithmetic before applying the configured cap. Casting an
    -- unbounded client score to int first can overflow before LEAST clamps it;
    -- a zero/invalid divisor must never turn score submission into a DB error.
    v_base_credits := greatest(0, least(
      coalesce(v_game.max_credits_per_session, 0)::numeric,
      2 + floor(v_score::numeric / greatest(1, coalesce(v_game.credit_divisor, 1)))
    ))::int;
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
