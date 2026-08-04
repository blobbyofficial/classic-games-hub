-- 0067_play_difficulty.sql
--
-- Difficulty as a property of a run.
--
-- Distinct from `games.difficulty`, which is a fixed label describing how
-- demanding a game inherently is. This is what the player chose, and the two
-- can disagree in every combination.
--
-- WHAT THIS DOES NOT DO, and why: it does not make the leaderboard primary key
-- (game_id, user_id, difficulty). That change looks small and is not.
-- `leaderboard_scores` is upserted with `on conflict (game_id, user_id)` from
-- three separate places - 0013's seasonal path, 0036's living-arcade path and
-- submit_score - and read by game_leaderboard, the podium reward and the
-- profile helpers, none of which filter by difficulty. Widening the key means
-- re-emitting all of them correctly in one migration, and getting any one wrong
-- silently corrupts the only competitive data on the site.
--
-- So for now the leaderboard remains exactly what it has always been: the
-- regular-difficulty board. Easy and hard runs are recorded in full on
-- play_sessions - so the history to build the split boards from starts
-- accumulating today - but they do not write a leaderboard row. Splitting the
-- boards properly is tracked as its own piece of work.

alter table public.play_sessions
  add column if not exists difficulty text not null default 'regular'
    check (difficulty in ('easy', 'regular', 'hard'));

create index if not exists play_sessions_difficulty_idx
  on public.play_sessions (game_id, difficulty, created_at desc);

-- Re-declared to take the difficulty. Body is otherwise 0042's, with three
-- changes marked below.
create or replace function public.submit_score(
  p_slug text,
  p_score bigint,
  p_duration integer default 0,
  p_difficulty text default 'regular'
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

  select * into v_game from public.games where slug = p_slug and status = 'published';
  if v_game.id is null then
    raise exception 'game not found';
  end if;

  -- (1) An unknown difficulty is treated as regular rather than rejected. The
  -- caller is a game engine mid-run; failing a finished game because of a bad
  -- string would throw away the player's score to make a point.
  v_difficulty := coalesce(nullif(p_difficulty, ''), 'regular');
  if v_difficulty not in ('easy', 'regular', 'hard') then
    v_difficulty := 'regular';
  end if;

  -- (2) Rewards scale with difficulty. Without this, easy is strictly the best
  -- way to earn - same credits for less resistance - and the picker becomes a
  -- farming setting rather than a comfort one. Deliberately mild: easy still
  -- pays, because it exists partly for players who need it.
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

  -- (3) Only regular runs touch the leaderboard. An easy run outranking an
  -- honest one would quietly destroy every existing board, and the boards are
  -- the only competitive data here. Easy and hard are still recorded above, so
  -- the history needed to build per-difficulty boards starts now.
  if v_difficulty = 'regular' then
    select best_score into v_best
    from public.leaderboard_scores
    where game_id = v_game.id and user_id = v_me;
    v_improved := v_score > 0 and v_score > coalesce(v_best, -1);

    insert into public.leaderboard_scores as ls (game_id, user_id, best_score, plays, achieved_at)
    values (v_game.id, v_me, v_score, 1, now())
    on conflict (game_id, user_id)
    do update set
      plays = ls.plays + 1,
      best_score = greatest(ls.best_score, excluded.best_score),
      achieved_at = case when excluded.best_score > ls.best_score then now() else ls.achieved_at end
    returning best_score into v_best;
  end if;

  update public.games set play_count = play_count + 1 where id = v_game.id;

  if v_credits > 0 then
    perform public.award_credits(v_me, v_credits, 'game_play', 'game', v_game.slug,
      jsonb_build_object('score', v_score, 'difficulty', v_difficulty));
  end if;
  perform public.add_xp(v_me, v_xp);

  if v_improved then
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
    'ranked', v_difficulty = 'regular',
    'event_multiplier', v_event_mult,
    'credit_multiplier', v_credit_mult,
    'rewarded', v_rewarded
  );
end;
$$;

revoke execute on function public.submit_score(text, bigint, integer, text) from public, anon;
grant execute on function public.submit_score(text, bigint, integer, text) to authenticated;

-- The 3-argument form stays callable so an in-flight page loaded before this
-- deploy still submits its score instead of erroring at the moment the run ends.
revoke execute on function public.submit_score(text, bigint, integer) from public, anon;
grant execute on function public.submit_score(text, bigint, integer) to authenticated;
