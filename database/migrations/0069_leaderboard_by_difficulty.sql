-- 0069_leaderboard_by_difficulty.sql
--
-- Numbered 0069, not 0068: the Discord publishing work took 0068 on another
-- branch while this was being written. Both were applied to Supabase before
-- either merged, so the database has them under their own names and only the
-- file needed renaming.
--
-- A leaderboard per difficulty, finishing what 0067 started.
--
-- 0067 deferred this because grepping the migration files suggested three
-- separate upserts into leaderboard_scores. Asking the live catalogue instead of
-- the file history showed the real picture is much smaller: the 0013 and 0036
-- upserts were superseded by later redefinitions and no longer exist. What is
-- actually live is two writers (the two submit_score overloads) and three
-- readers (game_leaderboard, profile_stats, check_achievements), plus one direct
-- table read from the app. All of them are handled here.
--
-- Every reader needed a decision, not just a filter, because "best score" stops
-- being unambiguous the moment a player holds several rows for one game:
--
--   game_leaderboard    ranks within a difficulty - that is the whole point
--   profile_stats       "best game" means the ranked one, so: regular
--   check_achievements  regular only, or an easy run silently unlocks an
--                       achievement written for a real one - and the podium
--                       badge would be handed out for topping a practice board
--
-- Both old signatures are kept as thin wrappers rather than dropped. The
-- currently deployed site calls the two-argument game_leaderboard and the
-- three-argument submit_score; dropping either would break the live leaderboard
-- the moment this migration applied, since the schema moves ahead of the app.
-- Delegating rather than duplicating also means there is still one copy of each
-- body - submit_score has already been redeclared across five migrations, and a
-- sixth divergent copy is how that goes wrong.

alter table public.leaderboard_scores
  add column if not exists difficulty text not null default 'regular'
    check (difficulty in ('easy', 'regular', 'hard'));

-- Existing rows are all regular by definition: until 0067 there was no other
-- kind, and 0067 only ever wrote regular rows to this table.
alter table public.leaderboard_scores drop constraint if exists leaderboard_scores_pkey;
alter table public.leaderboard_scores
  add constraint leaderboard_scores_pkey primary key (game_id, user_id, difficulty);

-- The ranking index has to lead with difficulty or every board scans the others.
drop index if exists leaderboard_scores_rank_idx;
create index if not exists leaderboard_scores_rank_idx
  on public.leaderboard_scores (game_id, difficulty, best_score desc, achieved_at asc);

-- ───────────────────────── readers ─────────────────────────

create or replace function public.game_leaderboard(
  p_slug text,
  p_limit integer,
  p_difficulty text
)
returns table(
  rank bigint, user_id uuid, username text, display_name text, avatar_url text,
  level integer, best_score bigint, plays integer, achieved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (order by ls.best_score desc, ls.achieved_at asc) as rank,
    p.id, p.username::text, p.display_name, p.avatar_url, p.level,
    ls.best_score, ls.plays, ls.achieved_at
  from public.leaderboard_scores ls
  join public.games g on g.id = ls.game_id
  join public.profiles p on p.id = ls.user_id
  where g.slug = p_slug
    and ls.difficulty = coalesce(nullif(p_difficulty, ''), 'regular')
  order by ls.best_score desc, ls.achieved_at asc
  limit greatest(1, least(p_limit, 200));
$$;

-- Kept so the deployed app keeps working while the schema is ahead of it. The
-- DEFAULT 50 is copied from the live signature: `create or replace` refuses to
-- drop an existing parameter default, and silently changing one would change
-- what a one-argument call returns.
create or replace function public.game_leaderboard(p_slug text, p_limit integer default 50)
returns table(
  rank bigint, user_id uuid, username text, display_name text, avatar_url text,
  level integer, best_score bigint, plays integer, achieved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.game_leaderboard(p_slug, p_limit, 'regular');
$$;

create or replace function public.profile_stats(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_plays', coalesce((select count(*) from public.play_sessions where user_id = p_user), 0),
    'games_played', coalesce((select count(distinct game_id) from public.play_sessions where user_id = p_user), 0),
    'achievements', coalesce((select count(*) from public.user_achievements where user_id = p_user), 0),
    'friends', coalesce((
      select count(*) from public.friendships
      where status = 'accepted' and (requester_id = p_user or addressee_id = p_user)
    ), 0),
    'best_game', (
      select jsonb_build_object('slug', g.slug, 'title', g.title, 'score', ls.best_score)
      from public.leaderboard_scores ls
      join public.games g on g.id = ls.game_id
      where ls.user_id = p_user
        and ls.difficulty = 'regular'
      order by ls.best_score desc limit 1
    )
  );
$$;

-- Unchanged from the live version except for the two difficulty filters marked
-- below. Reproduced in full because it is one `case` statement and splitting it
-- would leave the achievement rules in two files.
create or replace function public.check_achievements(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_met boolean;
  v_req jsonb;
begin
  for a in
    select * from public.achievements ach
    where not exists (
      select 1 from public.user_achievements ua
      where ua.user_id = p_user and ua.achievement_id = ach.id
    )
  loop
    v_req := a.requirement;
    v_met := false;

    case v_req ->> 'type'
      when 'total_plays' then
        v_met := (select count(*) from public.play_sessions where user_id = p_user)
                 >= (v_req ->> 'target')::int;
      when 'distinct_games' then
        v_met := (select count(distinct game_id) from public.play_sessions where user_id = p_user)
                 >= (v_req ->> 'target')::int;
      when 'game_score' then
        v_met := exists (
          select 1 from public.leaderboard_scores ls
          join public.games g on g.id = ls.game_id
          where ls.user_id = p_user
            and g.slug = v_req ->> 'game'
            and ls.difficulty = 'regular'   -- (1) an easy run must not unlock this
            and ls.best_score >= (v_req ->> 'target')::bigint
        );
      when 'level' then
        v_met := (select level from public.profiles where id = p_user)
                 >= (v_req ->> 'target')::int;
      when 'friends' then
        v_met := (
          select count(*) from public.friendships
          where status = 'accepted' and (requester_id = p_user or addressee_id = p_user)
        ) >= (v_req ->> 'target')::int;
      when 'daily_streak' then
        v_met := exists (
          select 1 from public.daily_reward_claims
          where user_id = p_user and streak >= (v_req ->> 'target')::int
        );
      when 'credits_earned' then
        v_met := coalesce((
          select sum(amount) from public.credit_transactions
          where user_id = p_user and amount > 0
        ), 0) >= (v_req ->> 'target')::bigint;
      when 'items_owned' then
        v_met := (select count(*) from public.inventory_items where user_id = p_user)
                 >= (v_req ->> 'target')::int;
      when 'leaderboard_top3' then
        v_met := exists (
          select 1 from (
            select ls.user_id,
                   rank() over (partition by ls.game_id order by ls.best_score desc) as rnk
            from public.leaderboard_scores ls
            where ls.best_score > 0
              and ls.difficulty = 'regular'  -- (2) no podium badge for topping a practice board
          ) r
          where r.user_id = p_user and r.rnk <= (v_req ->> 'target')::int
        );
      else
        v_met := false;
    end case;

    if v_met then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_user, a.id)
      on conflict do nothing;

      if a.credits_reward > 0 then
        perform public.award_credits(p_user, a.credits_reward, 'achievement', 'achievement', a.slug);
      end if;
      if a.xp_reward > 0 then
        perform public.add_xp(p_user, a.xp_reward);
      end if;

      if a.slug = 'leaderboard-top3' then
        insert into public.inventory_items (user_id, item_id, expires_at)
        select p_user, si.id, now() + interval '7 days'
        from public.shop_items si
        where si.slug = 'badge-podium'
        on conflict (user_id, item_id)
        do update set expires_at = greatest(public.inventory_items.expires_at, now() + interval '7 days');
      end if;

      insert into public.notifications (user_id, type, title, body, data)
      values (
        p_user, 'achievement', 'Achievement unlocked!',
        format('%s - %s', a.name, a.description),
        jsonb_build_object('slug', a.slug, 'icon', a.icon)
      );
      insert into public.activity_events (user_id, type, data)
      values (p_user, 'achievement_unlocked', jsonb_build_object('slug', a.slug, 'name', a.name));
    end if;
  end loop;
end;
$$;

-- ───────────────────────── writer ─────────────────────────

-- 0067's body, with the leaderboard upsert no longer gated on regular and the
-- difficulty carried into the conflict target.
-- NOTE the missing DEFAULT on p_difficulty, which is load-bearing. 0067 gave it
-- one while the three-argument overload still existed, so a three-argument call
-- matched both and Postgres refused to choose:
--
--   function public.submit_score(unknown, bigint, integer) is not unique
--
-- The deployed app calls it with exactly three arguments, so that ambiguity sat
-- between every finished game and its score. Without a default, three arguments
-- resolve to the wrapper and four to this, unambiguously.
drop function if exists public.submit_score(text, bigint, integer, text);

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

  select * into v_game from public.games where slug = p_slug and status = 'published';
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

-- Delegates, so the deployed app keeps saving scores and there is one body.
create or replace function public.submit_score(p_slug text, p_score bigint, p_duration integer default 0)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.submit_score(p_slug, p_score, p_duration, 'regular'::text);
$$;

revoke execute on function public.game_leaderboard(text, integer, text) from public;
grant execute on function public.game_leaderboard(text, integer, text) to anon, authenticated;
revoke execute on function public.submit_score(text, bigint, integer, text) from public, anon;
grant execute on function public.submit_score(text, bigint, integer, text) to authenticated;
revoke execute on function public.submit_score(text, bigint, integer) from public, anon;
grant execute on function public.submit_score(text, bigint, integer) to authenticated;
