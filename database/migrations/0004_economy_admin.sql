-- ═══════════════════════════════════════════════════════════════════════════
-- Classic Games Hub — 0004 economy, progression & admin
-- Shop, inventory, achievements, daily rewards, challenges, events,
-- reports, announcements, audit log, feature flags, submit_score
-- ═══════════════════════════════════════════════════════════════════════════

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  kind text not null check (kind in (
    'avatar_frame', 'profile_theme', 'badge', 'effect', 'banner',
    'collectible', 'xp_boost', 'credit_boost'
  )),
  price int not null check (price >= 0),
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  preview jsonb not null default '{}'::jsonb,
  seasonal boolean not null default false,
  available boolean not null default true,
  sort_weight int not null default 0,
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.shop_items (id) on delete cascade,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, item_id)
);

create index inventory_items_user_idx on public.inventory_items (user_id);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null,
  icon text not null default 'trophy',
  category text not null default 'general',
  xp_reward int not null default 50,
  credits_reward int not null default 25,
  secret boolean not null default false,
  requirement jsonb not null,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index user_achievements_user_idx on public.user_achievements (user_id, unlocked_at desc);

create table public.daily_reward_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  claim_date date not null,
  streak int not null default 1,
  credits_awarded int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  kind text not null default 'daily' check (kind in ('daily', 'weekly', 'event')),
  requirement jsonb not null,
  credits_reward int not null default 30,
  xp_reward int not null default 40,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index challenges_window_idx on public.challenges (starts_at, ends_at);

create table public.challenge_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  progress int not null default 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  primary key (user_id, challenge_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  banner_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  data jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'message', 'review')),
  target_user_id uuid references public.profiles (id) on delete set null,
  target_id text,
  reason text not null check (char_length(reason) between 3 and 100),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  title text not null,
  body text not null,
  level text not null default 'info' check (level in ('info', 'update', 'event', 'alert')),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger feature_flags_touch before update on public.feature_flags
for each row execute function public.touch_updated_at();

-- ── audit helper ────────────────────────────────────────────────────────────
create or replace function public.log_audit(
  p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}'::jsonb
)
returns void
language sql security definer
set search_path = public
as $$
  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, p_details);
$$;

-- ── achievements engine ─────────────────────────────────────────────────────
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

-- ── daily challenges ────────────────────────────────────────────────────────
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

create or replace function public.bump_challenge_progress(
  p_user uuid, p_type text, p_amount int, p_category text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  c record;
  v_progress int;
  v_target int;
begin
  for c in
    select * from public.challenges
    where now() between starts_at and ends_at
      and requirement ->> 'type' = p_type
      and (p_type <> 'play_category' or requirement ->> 'category' = p_category)
  loop
    v_target := (c.requirement ->> 'target')::int;

    insert into public.challenge_progress (user_id, challenge_id, progress)
    values (p_user, c.id, least(p_amount, v_target))
    on conflict (user_id, challenge_id)
    do update set progress = least(public.challenge_progress.progress + p_amount, v_target)
    where public.challenge_progress.completed_at is null
    returning progress into v_progress;

    if v_progress >= v_target then
      update public.challenge_progress
      set completed_at = now()
      where user_id = p_user and challenge_id = c.id and completed_at is null;

      if found then
        insert into public.notifications (user_id, type, title, body, data)
        values (
          p_user, 'challenge', 'Challenge complete!',
          format('"%s" is done — claim your %s credits.', c.name, c.credits_reward),
          jsonb_build_object('challenge_id', c.id, 'slug', c.slug)
        );
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.claim_challenge(p_challenge uuid)
returns jsonb
language plpgsql security definer
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

-- ── daily reward ────────────────────────────────────────────────────────────
create or replace function public.claim_daily_reward()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_streak int := 1;
  v_credits int;
  v_ads boolean;
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

  select ads_enabled into v_ads from public.user_settings where user_id = v_me;
  if coalesce(v_ads, false) then
    v_credits := v_credits * 2;
  end if;

  insert into public.daily_reward_claims (user_id, claim_date, streak, credits_awarded)
  values (v_me, v_today, v_streak, v_credits);

  perform public.award_credits(v_me, v_credits, 'daily_reward', 'daily', v_today::text,
    jsonb_build_object('streak', v_streak, 'ads_doubled', coalesce(v_ads, false)));
  perform public.add_xp(v_me, 20);
  perform public.ensure_daily_challenges();
  perform public.check_achievements(v_me);

  return jsonb_build_object('ok', true, 'credits', v_credits, 'streak', v_streak,
                            'ads_doubled', coalesce(v_ads, false));
end;
$$;

-- ── shop ────────────────────────────────────────────────────────────────────
create or replace function public.purchase_shop_item(p_slug text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_item public.shop_items;
  v_credits bigint;
  v_boost boolean;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;

  select * into v_item from public.shop_items where slug = p_slug and available;
  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'Item not available');
  end if;

  v_boost := v_item.kind in ('xp_boost', 'credit_boost');

  if not v_boost and exists (
    select 1 from public.inventory_items where user_id = v_me and item_id = v_item.id
  ) then
    return jsonb_build_object('ok', false, 'error', 'You already own this item');
  end if;

  select credits into v_credits from public.profiles where id = v_me;
  if v_credits < v_item.price then
    return jsonb_build_object('ok', false, 'error', 'Not enough credits');
  end if;

  perform public.award_credits(v_me, -v_item.price, 'shop_purchase', 'shop_item', v_item.slug);

  if v_boost then
    insert into public.inventory_items (user_id, item_id, expires_at)
    values (v_me, v_item.id, now() + interval '24 hours')
    on conflict (user_id, item_id)
    do update set expires_at = greatest(public.inventory_items.expires_at, now()) + interval '24 hours';
  else
    insert into public.inventory_items (user_id, item_id) values (v_me, v_item.id);
  end if;

  insert into public.activity_events (user_id, type, data)
  values (v_me, 'item_purchased', jsonb_build_object('slug', v_item.slug, 'name', v_item.name, 'rarity', v_item.rarity));

  perform public.check_achievements(v_me);

  return jsonb_build_object('ok', true, 'item', v_item.slug);
end;
$$;

create or replace function public.equip_item(p_slug text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_item public.shop_items;
begin
  select si.* into v_item
  from public.shop_items si
  join public.inventory_items ii on ii.item_id = si.id and ii.user_id = v_me
  where si.slug = p_slug
    and (ii.expires_at is null or ii.expires_at > now());

  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'You do not own this item');
  end if;
  if v_item.kind not in ('avatar_frame', 'profile_theme', 'badge', 'effect', 'banner') then
    return jsonb_build_object('ok', false, 'error', 'This item cannot be equipped');
  end if;

  update public.profiles
  set equipped = equipped || jsonb_build_object(v_item.kind, v_item.slug)
  where id = v_me;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.unequip_item(p_kind text)
returns void
language sql security definer
set search_path = public
as $$
  update public.profiles
  set equipped = equipped - p_kind
  where id = (select auth.uid());
$$;

-- ── username change (paid) ──────────────────────────────────────────────────
create or replace function public.change_username(p_new text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_cost int := 500;
  v_credits bigint;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;
  if p_new !~ '^[a-zA-Z0-9_]{3,24}$' then
    return jsonb_build_object('ok', false, 'error', 'Usernames are 3-24 letters, numbers or underscores');
  end if;
  if exists (select 1 from public.profiles where username = p_new and id <> v_me) then
    return jsonb_build_object('ok', false, 'error', 'That username is taken');
  end if;

  select credits into v_credits from public.profiles where id = v_me;
  if v_credits < v_cost then
    return jsonb_build_object('ok', false, 'error', format('Changing your username costs %s credits', v_cost));
  end if;

  perform public.award_credits(v_me, -v_cost, 'username_change');
  update public.profiles set username = p_new where id = v_me;

  return jsonb_build_object('ok', true, 'username', p_new);
end;
$$;

-- ── score submission (the core game loop) ───────────────────────────────────
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
    'rewarded', v_rewarded
  );
end;
$$;

-- ── admin operations ────────────────────────────────────────────────────────
create or replace function public.admin_adjust_credits(p_user uuid, p_amount bigint, p_reason text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  perform public.award_credits(p_user, p_amount, 'admin_adjust', 'admin', p_reason);
  perform public.log_audit('adjust_credits', 'user', p_user::text,
    jsonb_build_object('amount', p_amount, 'reason', p_reason));
  insert into public.notifications (user_id, type, title, body)
  values (p_user, 'credits',
          case when p_amount >= 0 then 'Credits received' else 'Credits adjusted' end,
          format('An admin adjusted your balance by %s credits: %s', p_amount, p_reason));
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_role not in ('user', 'moderator', 'admin') then
    raise exception 'invalid role';
  end if;
  update public.profiles set role = p_role where id = p_user;
  perform public.log_audit('set_role', 'user', p_user::text, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'cannot ban an admin';
  end if;
  update public.profiles set is_banned = p_banned where id = p_user;
  perform public.log_audit(case when p_banned then 'ban_user' else 'unban_user' end,
                           'user', p_user::text);
end;
$$;

-- Announcement publish → notify everyone.
create or replace function public.handle_announcement_published()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    new.published_at := now();
    insert into public.notifications (user_id, type, title, body, data)
    select p.id, 'announcement', new.title, left(new.body, 140),
           jsonb_build_object('announcement_id', new.id, 'level', new.level)
    from public.profiles p;
  end if;
  return new;
end;
$$;

create trigger on_announcement_published
before insert or update on public.announcements
for each row execute function public.handle_announcement_published();

-- Audit any staff change to the games catalog.
create or replace function public.audit_game_changes()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.log_audit(
    lower(tg_op) || '_game', 'game', coalesce(new.slug, old.slug),
    case when tg_op = 'DELETE' then '{}'::jsonb
         else jsonb_build_object('title', new.title, 'status', new.status) end
  );
  return coalesce(new, old);
end;
$$;

create trigger games_audit
after insert or update or delete on public.games
for each row execute function public.audit_game_changes();

-- ── row level security ──────────────────────────────────────────────────────
alter table public.shop_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_reward_claims enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.events enable row level security;
alter table public.reports enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.feature_flags enable row level security;

create policy "shop is public" on public.shop_items
  for select using (available or public.is_staff());
create policy "staff manage shop" on public.shop_items
  for all using (public.is_staff()) with check (public.is_staff());

create policy "own inventory" on public.inventory_items
  for select using ((select auth.uid()) = user_id or public.is_staff());

create policy "achievements are public" on public.achievements
  for select using (true);
create policy "staff manage achievements" on public.achievements
  for all using (public.is_staff()) with check (public.is_staff());

create policy "user achievements are public" on public.user_achievements
  for select using (true);

create policy "own daily claims" on public.daily_reward_claims
  for select using ((select auth.uid()) = user_id);

create policy "challenges are public" on public.challenges
  for select using (true);
create policy "staff manage challenges" on public.challenges
  for all using (public.is_staff()) with check (public.is_staff());

create policy "own challenge progress" on public.challenge_progress
  for select using ((select auth.uid()) = user_id);

create policy "published events are public" on public.events
  for select using (published or public.is_staff());
create policy "staff manage events" on public.events
  for all using (public.is_staff()) with check (public.is_staff());

create policy "users file reports" on public.reports
  for insert with check ((select auth.uid()) = reporter_id);
create policy "read own or staff reports" on public.reports
  for select using ((select auth.uid()) = reporter_id or public.is_staff());
create policy "staff resolve reports" on public.reports
  for update using (public.is_staff()) with check (public.is_staff());

create policy "published announcements are public" on public.announcements
  for select using (published or public.is_staff());
create policy "staff manage announcements" on public.announcements
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff read audit" on public.audit_logs
  for select using (public.is_staff());

create policy "flags are public" on public.feature_flags
  for select using (true);
create policy "admins manage flags" on public.feature_flags
  for all using (public.is_admin()) with check (public.is_admin());

-- Progression tables mutate only through definer functions.
revoke insert, update, delete on public.inventory_items from authenticated, anon;
revoke insert, update, delete on public.user_achievements from authenticated, anon;
revoke insert, update, delete on public.daily_reward_claims from authenticated, anon;
revoke insert, update, delete on public.challenge_progress from authenticated, anon;
revoke insert, update, delete on public.audit_logs from authenticated, anon;
