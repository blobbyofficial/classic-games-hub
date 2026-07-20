-- 0013_seasonal_multiplier.sql
-- Living economy & events — site-wide credits multiplier.
--
-- Admins can run a seasonal event with a global credits multiplier, stored in
-- the `seasonal_event` feature flag payload ({multiplier, title, message}).
-- submit_score applies it on top of personal boosts when the flag is enabled.
-- submit_score is replaced in place, preserving its existing grants (0006).

create or replace function public.submit_score(p_slug text, p_score bigint, p_duration int default 0)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_game public.games;
  v_score bigint;
  v_duration int;
  v_recent int;
  v_rewarded boolean := true;
  v_ads boolean := false;
  v_credit_boost boolean := false;
  v_xp_boost boolean := false;
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

  -- Soft rate limit: after 30 sessions/hour on one game, plays stop earning.
  select count(*) into v_recent
  from public.play_sessions
  where user_id = v_me and game_id = v_game.id and created_at > now() - interval '1 hour';
  if v_recent >= 30 then
    v_rewarded := false;
  end if;

  if v_rewarded then
    select coalesce(s.ads_enabled, false) into v_ads
    from public.user_settings s where s.user_id = v_me;

    select
      bool_or(si.kind = 'credit_boost'),
      bool_or(si.kind = 'xp_boost')
    into v_credit_boost, v_xp_boost
    from public.inventory_items ii
    join public.shop_items si on si.id = ii.item_id
    where ii.user_id = v_me
      and si.kind in ('credit_boost', 'xp_boost')
      and ii.expires_at > now();

    v_base_credits := least(2 + (v_score / v_game.credit_divisor)::int, v_game.max_credits_per_session);
    v_credits := v_base_credits;
    if coalesce(v_credit_boost, false) then
      v_credits := v_credits * 2;
    end if;
    if v_ads then
      v_credits := v_credits * 2;
    end if;

    -- Site-wide seasonal multiplier (admin-controlled), clamped to [1, 5].
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

    v_xp := 5 + v_base_credits * 3;
    if coalesce(v_xp_boost, false) then
      v_xp := v_xp * 2;
    end if;
  else
    v_xp := 1;
  end if;

  insert into public.play_sessions (user_id, game_id, score, duration_seconds, xp_earned, credits_earned, ads_doubled)
  values (v_me, v_game.id, v_score, v_duration, v_xp, v_credits, v_ads and v_rewarded);

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
      jsonb_build_object('score', v_score, 'ads_doubled', v_ads));
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
  end if;
  perform public.check_achievements(v_me);

  return jsonb_build_object(
    'ok', true,
    'credits_earned', v_credits,
    'xp_earned', v_xp,
    'best_score', v_best,
    'new_best', v_improved,
    'ads_doubled', v_ads and v_rewarded and v_credits > 0,
    'event_multiplier', v_event_mult,
    'rewarded', v_rewarded
  );
end;
$$;

-- Seed a default (disabled) seasonal event template if none configured yet.
update public.feature_flags
set payload = '{"multiplier":2,"title":"Double Credits Weekend","message":"Earn 2× credits on every game — for a limited time!"}'::jsonb
where key = 'seasonal_event'
  and coalesce(payload, '{}'::jsonb) = '{}'::jsonb;
