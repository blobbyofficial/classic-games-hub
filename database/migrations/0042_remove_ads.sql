-- 0042_remove_ads.sql
-- Retire the rewarded-ads programme.
--
-- The "watch an ad to double your credits" loop never earned its keep: it
-- complicated `submit_score`, added a per-player setting to explain, and the
-- ads themselves were simulated placeholders. Rewards now come from play,
-- boosts, streaks and events only.
--
-- Both functions below are re-created in full (rather than patched) because
-- Postgres has no "drop this branch" for a function body — the versions here
-- are the previous ones with every ads code path removed:
--   * claim_daily_reward — the ad-doubling branch is gone; the Booster 1.5x
--     bonus stays.
--   * submit_score       — `p_doubled` parameter and the doubling maths are
--     gone, so credits are purely score × boosts × event multiplier.
-- The old three-argument submit_score signature is unchanged in shape, so
-- callers need no update beyond dropping the (now absent) ads UI.
--
-- The column drops are the point of no return: `user_settings.ads_enabled`
-- and `play_sessions.ads_doubled` are removed, along with the two admin
-- feature flags that gated the programme.

create or replace function public.claim_daily_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_streak int := 1;
  v_credits int;
  v_booster boolean;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;
  if exists (select 1 from public.daily_reward_claims where user_id = v_me and claim_date = v_today) then
    return jsonb_build_object('ok', false, 'error', 'Already claimed today');
  end if;

  select streak + 1 into v_streak
  from public.daily_reward_claims
  where user_id = v_me and claim_date = v_today - 1;
  v_streak := coalesce(v_streak, 1);

  v_credits := 50 + least(v_streak - 1, 6) * 10;

  select booster_since is not null into v_booster from public.profiles where id = v_me;
  if coalesce(v_booster, false) then
    v_credits := floor(v_credits * 1.5)::int;
  end if;

  insert into public.daily_reward_claims (user_id, claim_date, streak, credits_awarded)
  values (v_me, v_today, v_streak, v_credits);

  perform public.award_credits(v_me, v_credits, 'daily_reward', 'daily', v_today::text,
    jsonb_build_object('streak', v_streak, 'booster_bonus', coalesce(v_booster, false)));
  perform public.add_xp(v_me, 20);
  perform public.ensure_daily_challenges();
  perform public.check_achievements(v_me);

  return jsonb_build_object('ok', true, 'credits', v_credits, 'streak', v_streak,
                            'booster_bonus', coalesce(v_booster, false));
end;
$$;
revoke execute on function public.claim_daily_reward() from public, anon;
grant execute on function public.claim_daily_reward() to authenticated;

create or replace function public.submit_score(p_slug text, p_score bigint, p_duration integer default 0)
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

    v_xp := (5 + v_base_credits * 3) * v_xp_mult;
  else
    v_xp := 1;
  end if;

  insert into public.play_sessions (user_id, game_id, score, duration_seconds, xp_earned, credits_earned)
  values (v_me, v_game.id, v_score, v_duration, v_xp, v_credits);

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

  update public.games set play_count = play_count + 1 where id = v_game.id;

  if v_credits > 0 then
    perform public.award_credits(v_me, v_credits, 'game_play', 'game', v_game.slug,
      jsonb_build_object('score', v_score));
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
    'event_multiplier', v_event_mult,
    'credit_multiplier', v_credit_mult,
    'rewarded', v_rewarded
  );
end;
$$;
revoke execute on function public.submit_score(text, bigint, integer) from public, anon;
grant execute on function public.submit_score(text, bigint, integer) to authenticated;

alter table public.user_settings drop column if exists ads_enabled;
alter table public.play_sessions drop column if exists ads_doubled;

delete from public.feature_flags where key in ('rewarded_ads', 'ads_placements');
