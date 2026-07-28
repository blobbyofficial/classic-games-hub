-- 0046_booster_daily_challenges.sql
-- A fourth daily challenge, for server boosters only.
--
-- `challenges.booster_only` marks a challenge as a boosters' perk.
-- ensure_daily_challenges() now seeds a fourth daily ("Booster Bonus", worth
-- roughly double a normal daily) alongside the usual three, and the guard at
-- the top of the function checks for both the first daily and the booster
-- daily so days seeded before this migration still gain the new one.
--
-- The eligibility check lives in claim_challenge(), not in the query that
-- lists challenges: hiding a row in the UI is presentation, and presentation
-- is not a security boundary. Staff pass the check too, so they can verify the
-- flow without boosting.

alter table public.challenges add column if not exists booster_only boolean not null default false;

create or replace function public.ensure_daily_challenges()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day text := to_char(now() at time zone 'utc', 'YYYYMMDD');
  v_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_end timestamptz := v_start + interval '1 day';
  v_categories text[] := array['Arcade', 'Puzzle', 'Strategy', 'Shooter'];
  v_category text;
begin
  perform public.ensure_weekly_challenges();

  if exists (select 1 from public.challenges where slug = 'daily-' || v_day || '-1')
     and exists (select 1 from public.challenges where slug = 'daily-' || v_day || '-boost') then
    return;
  end if;

  v_category := v_categories[1 + (extract(doy from now())::int % array_length(v_categories, 1))];

  insert into public.challenges (slug, name, description, kind, requirement, credits_reward, xp_reward, starts_at, ends_at)
  values
    ('daily-' || v_day || '-1', 'Warm Up', 'Play 3 games today.', 'daily',
     jsonb_build_object('type', 'play_games', 'target', 3), 30, 40, v_start, v_end),
    ('daily-' || v_day || '-2', 'Coin Collector', 'Earn 50 credits from playing today.', 'daily',
     jsonb_build_object('type', 'earn_credits', 'target', 50), 40, 50, v_start, v_end),
    ('daily-' || v_day || '-3', v_category || ' Specialist', 'Play 2 ' || v_category || ' games today.', 'daily',
     jsonb_build_object('type', 'play_category', 'category', v_category, 'target', 2), 35, 45, v_start, v_end)
  on conflict (slug) do nothing;

  insert into public.challenges (slug, name, description, kind, requirement, credits_reward, xp_reward, starts_at, ends_at, booster_only)
  values
    ('daily-' || v_day || '-boost', 'Booster Bonus',
     'Play 5 games today — a thank-you for boosting the server.', 'daily',
     jsonb_build_object('type', 'play_games', 'target', 5), 80, 100, v_start, v_end, true)
  on conflict (slug) do nothing;
end;
$$;
revoke execute on function public.ensure_daily_challenges() from public, anon;
grant execute on function public.ensure_daily_challenges() to authenticated, service_role;

create or replace function public.claim_challenge(p_challenge uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_challenge public.challenges;
  v_progress public.challenge_progress;
begin
  select * into v_challenge from public.challenges where id = p_challenge;
  select * into v_progress from public.challenge_progress
  where user_id = v_me and challenge_id = p_challenge;

  -- Booster-only rewards stay booster-only whatever the client sends.
  if coalesce(v_challenge.booster_only, false) and not exists (
    select 1 from public.profiles
    where id = v_me and (booster_since is not null or role in ('admin', 'moderator'))
  ) then
    return jsonb_build_object('ok', false, 'error', 'That reward is for server boosters');
  end if;

  if v_progress.completed_at is null then
    return jsonb_build_object('ok', false, 'error', 'Challenge not completed yet');
  end if;
  if v_progress.claimed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'Already claimed');
  end if;

  update public.challenge_progress
  set claimed_at = now()
  where user_id = v_me and challenge_id = p_challenge;

  perform public.award_credits(v_me, v_challenge.credits_reward, 'challenge', 'challenge', v_challenge.slug);
  perform public.add_xp(v_me, v_challenge.xp_reward);

  return jsonb_build_object('ok', true, 'credits', v_challenge.credits_reward, 'xp', v_challenge.xp_reward);
end;
$$;
revoke execute on function public.claim_challenge(uuid) from public, anon;
grant execute on function public.claim_challenge(uuid) to authenticated;

select public.ensure_daily_challenges();
