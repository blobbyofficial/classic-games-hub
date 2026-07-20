-- 0017_weekly_challenges.sql
-- Living economy & events — self-updating weekly challenges.
--
-- Mirrors the daily generator for a Monday–Sunday (UTC) window with bigger
-- targets and rewards. ensure_daily_challenges (already called on every scored
-- play) now also ensures the current week's challenges, so submit_score is
-- untouched. bump_challenge_progress already updates challenges of any kind.

create or replace function public.ensure_weekly_challenges()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_wk text := to_char(now() at time zone 'utc', 'IYYYIW');
  v_start timestamptz := date_trunc('week', now() at time zone 'utc') at time zone 'utc';
  v_end timestamptz := v_start + interval '7 days';
  v_categories text[] := array['Arcade', 'Puzzle', 'Strategy', 'Shooter'];
  v_category text;
begin
  if exists (select 1 from public.challenges where slug = 'weekly-' || v_wk || '-1') then
    return;
  end if;

  v_category := v_categories[1 + (to_char(now() at time zone 'utc', 'IW')::int % array_length(v_categories, 1))];

  insert into public.challenges (slug, name, description, kind, requirement, credits_reward, xp_reward, starts_at, ends_at)
  values
    ('weekly-' || v_wk || '-1', 'Marathon', 'Play 25 games this week.', 'weekly',
     jsonb_build_object('type', 'play_games', 'target', 25), 200, 250, v_start, v_end),
    ('weekly-' || v_wk || '-2', 'Treasury', 'Earn 500 credits from playing this week.', 'weekly',
     jsonb_build_object('type', 'earn_credits', 'target', 500), 250, 300, v_start, v_end),
    ('weekly-' || v_wk || '-3', v_category || ' Devotee', 'Play 10 ' || v_category || ' games this week.', 'weekly',
     jsonb_build_object('type', 'play_category', 'category', v_category, 'target', 10), 220, 280, v_start, v_end)
  on conflict (slug) do nothing;
end;
$$;

create or replace function public.ensure_daily_challenges()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_day text := to_char(now() at time zone 'utc', 'YYYYMMDD');
  v_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_end timestamptz := v_start + interval '1 day';
  v_categories text[] := array['Arcade', 'Puzzle', 'Strategy', 'Shooter'];
  v_category text;
begin
  -- Keep the weekly set fresh too (cheap, guarded by its own existence check).
  perform public.ensure_weekly_challenges();

  if exists (select 1 from public.challenges where slug = 'daily-' || v_day || '-1') then
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
end;
$$;

-- Seed the current week immediately so it is live without waiting for a play.
do $$ begin perform public.ensure_weekly_challenges(); end $$;
