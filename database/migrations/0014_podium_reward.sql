-- 0014_podium_reward.sql
-- Living economy & events — top-3 auto-reward.
--
-- The "Podium Finish" achievement (requirement type `leaderboard_top3`) had no
-- evaluator, so it never unlocked. Add the evaluator, and when it unlocks grant
-- a temporary "Podium" badge (7-day expiry). check_achievements already runs
-- after every scored play, so no change to submit_score is needed.

-- A non-purchasable temporary badge granted on podium finishes.
insert into public.shop_items (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only)
values (
  'badge-podium', 'Podium', 'Awarded for a top-3 leaderboard finish. Lasts 7 days.',
  'badge', 0, 'epic', '{"icon":"medal","colors":["#f59e0b","#fbbf24"]}', false, false, 0, false
)
on conflict (slug) do nothing;

create or replace function public.check_achievements(p_user uuid)
returns void
language plpgsql security definer
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

      -- Podium finish also grants a temporary badge (7 days).
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
        format('%s — %s', a.name, a.description),
        jsonb_build_object('slug', a.slug, 'icon', a.icon)
      );
      insert into public.activity_events (user_id, type, data)
      values (p_user, 'achievement_unlocked', jsonb_build_object('slug', a.slug, 'name', a.name));
    end if;
  end loop;
end;
$$;
