-- 0036_living_arcade.sql
-- Roadmap v1.3 "Living Arcade" — the economy & engagement batch:
--
--   1. Stacking boosts + effect queue (5× cap, 10× for Discord boosters)
--   2. Discord-booster detection + perks (bigger daily reward, tenure badges)
--   3. Message streaks (per-DM daily streaks with milestone rewards)
--   4. Community mega-events (server-wide co-op goals with shared rewards)
--   5. Background music tracks (new 'track' shop kind, level-5 gate)
--   6. Mythic rarity + the level-50 exclusive cosmetic
--   7. Feature-flag rows backing the admin ads centre, editable roadmap and
--      customisable home screen
--
-- Everything follows the house rules: RLS on every table, all mutations via
-- SECURITY DEFINER RPCs with explicit grants.

-- ───────────────────── 1. Stacking boosts + queue ─────────────────────

create table if not exists public.user_boosts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('credit_boost', 'xp_boost')),
  stacks int not null default 0,
  expires_at timestamptz,
  queued int not null default 0,
  primary key (user_id, kind)
);

alter table public.user_boosts enable row level security;
create policy user_boosts_select_own on public.user_boosts
  for select using (auth.uid() = user_id);

-- Booster status lives on the profile (stamped by Discord role sync).
alter table public.profiles add column if not exists booster_since timestamptz;

-- Advance a user's boost state: queued windows take over the moment the
-- current one runs out (each queued unit = a fresh 24h ×2 window).
create or replace function public.settle_user_boosts(p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.user_boosts%rowtype;
begin
  for r in select * from public.user_boosts where user_id = p_user for update loop
    -- A queued boost activates the moment the previous window ends. Anchor the
    -- new window to now() (never to a long-past expiry) so a boost that ran out
    -- days ago still hands its queued successor a full, live 24-hour window.
    while r.queued > 0 and (r.expires_at is null or r.expires_at <= now()) loop
      r.expires_at := greatest(coalesce(r.expires_at, now()), now()) + interval '24 hours';
      r.stacks := 1;
      r.queued := r.queued - 1;
    end loop;
    if r.expires_at is null or r.expires_at <= now() then
      r.stacks := 0;
    end if;
    update public.user_boosts
    set stacks = r.stacks, expires_at = r.expires_at, queued = r.queued
    where user_id = r.user_id and kind = r.kind;
  end loop;
end;
$$;
revoke execute on function public.settle_user_boosts(uuid) from public, anon, authenticated;

-- Multiplier for a kind right now: 1 + active stacks, capped (5× / 10× boosters).
create or replace function public.boost_multiplier(p_user uuid, p_kind text)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_stacks int;
  v_cap int;
begin
  select stacks into v_stacks from public.user_boosts
  where user_id = p_user and kind = p_kind and expires_at > now();
  if coalesce(v_stacks, 0) = 0 then
    return 1;
  end if;
  select case when booster_since is not null then 9 else 4 end into v_cap
  from public.profiles where id = p_user;
  return 1 + least(v_stacks, coalesce(v_cap, 4));
end;
$$;
revoke execute on function public.boost_multiplier(uuid, text) from public, anon, authenticated;

-- The signed-in player's boost state for the inventory UI.
create or replace function public.my_boosts()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    return '[]'::jsonb;
  end if;
  perform public.settle_user_boosts(v_me);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind', kind,
      'stacks', stacks,
      'multiplier', public.boost_multiplier(v_me, kind),
      'expires_at', expires_at,
      'queued', queued
    ))
    from public.user_boosts
    where user_id = v_me and (queued > 0 or expires_at > now())
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.my_boosts() from public, anon;
grant execute on function public.my_boosts() to authenticated;

-- ───────────────────── 2. Booster detection + tenure badges ─────────────────────

insert into public.shop_items (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only) values
  ('badge-booster-1m', 'Booster · 1 Month', 'Boosted the Discord server for a month.', 'badge', 0, 'rare', '{"icon":"rocket","colors":["#f472b6","#a78bfa"]}', false, false, 0, false),
  ('badge-booster-3m', 'Booster · 3 Months', 'Boosted the Discord server for three months.', 'badge', 0, 'epic', '{"icon":"rocket","colors":["#e879f9","#818cf8"]}', false, false, 0, false),
  ('badge-booster-6m', 'Booster · 6 Months', 'Boosted the Discord server for six months.', 'badge', 0, 'epic', '{"icon":"rocket","colors":["#d946ef","#6366f1"]}', false, false, 0, false),
  ('badge-booster-12m', 'Booster · 1 Year', 'Boosted the Discord server for a whole year.', 'badge', 0, 'legendary', '{"icon":"rocket","colors":["#c026d3","#4f46e5"]}', false, false, 0, false)
on conflict (slug) do nothing;

-- Stamped by role sync: records booster status and grants tenure badges.
create or replace function public.bot_set_booster(p_discord text, p_since timestamptz)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := public.bot_uid(p_discord);
  v_months numeric;
  v_slug text;
begin
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;
  update public.profiles set booster_since = p_since where id = v_id;
  if p_since is not null then
    v_months := extract(epoch from (now() - p_since)) / 2629800; -- avg month
    for v_slug in
      select s from unnest(array[
        case when v_months >= 1 then 'badge-booster-1m' end,
        case when v_months >= 3 then 'badge-booster-3m' end,
        case when v_months >= 6 then 'badge-booster-6m' end,
        case when v_months >= 12 then 'badge-booster-12m' end
      ]) as s where s is not null
    loop
      insert into public.inventory_items (user_id, item_id)
      select v_id, id from public.shop_items where slug = v_slug
      on conflict (user_id, item_id) do nothing;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'booster', p_since is not null);
end;
$$;
revoke execute on function public.bot_set_booster(text, timestamptz) from public, anon, authenticated;
grant execute on function public.bot_set_booster(text, timestamptz) to service_role;

-- Bigger daily reward while boosting (+50%), web + Discord paths.
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

  select ads_enabled into v_ads from public.user_settings where user_id = v_me;
  if coalesce(v_ads, false) then
    v_credits := v_credits * 2;
  end if;

  insert into public.daily_reward_claims (user_id, claim_date, streak, credits_awarded)
  values (v_me, v_today, v_streak, v_credits);

  perform public.award_credits(v_me, v_credits, 'daily_reward', 'daily', v_today::text,
    jsonb_build_object('streak', v_streak, 'ads_doubled', coalesce(v_ads, false),
                       'booster_bonus', coalesce(v_booster, false)));
  perform public.add_xp(v_me, 20);
  perform public.ensure_daily_challenges();
  perform public.check_achievements(v_me);

  return jsonb_build_object('ok', true, 'credits', v_credits, 'streak', v_streak,
                            'ads_doubled', coalesce(v_ads, false),
                            'booster_bonus', coalesce(v_booster, false));
end;
$$;

create or replace function public.bot_claim_daily(p_discord text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.bot_uid(p_discord);
  v_today date := (now() at time zone 'utc')::date;
  v_streak int := 1;
  v_credits int;
  v_booster boolean;
begin
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;
  if exists (select 1 from public.daily_reward_claims where user_id = v_id and claim_date = v_today) then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;

  select streak + 1 into v_streak
  from public.daily_reward_claims
  where user_id = v_id and claim_date = v_today - 1;
  v_streak := coalesce(v_streak, 1);
  v_credits := 50 + least(v_streak - 1, 6) * 10;

  select booster_since is not null into v_booster from public.profiles where id = v_id;
  if coalesce(v_booster, false) then
    v_credits := floor(v_credits * 1.5)::int;
  end if;

  insert into public.daily_reward_claims (user_id, claim_date, streak, credits_awarded)
  values (v_id, v_today, v_streak, v_credits);

  perform public.award_credits(v_id, v_credits, 'daily_reward', 'daily', v_today::text,
    jsonb_build_object('streak', v_streak, 'via', 'discord', 'booster_bonus', coalesce(v_booster, false)));
  perform public.add_xp(v_id, 20);
  perform public.check_achievements(v_id);

  return jsonb_build_object('ok', true, 'credits', v_credits, 'streak', v_streak);
end;
$$;
revoke execute on function public.bot_claim_daily(text) from public, anon, authenticated;
grant execute on function public.bot_claim_daily(text) to service_role;

-- ───────────────────── 3. Message streaks ─────────────────────

create table if not exists public.message_streaks (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  a_last date,
  b_last date,
  last_counted date,
  streak int not null default 0,
  best int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.message_streaks enable row level security;
create policy message_streaks_select_members on public.message_streaks
  for select using (auth.uid() in (user_a, user_b));

create or replace function public.bump_message_streak()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_members uuid[];
  v_row public.message_streaks%rowtype;
  v_other uuid;
  v_reward int;
begin
  begin
    -- DMs only (exactly two members, not a group).
    if exists (select 1 from public.conversations c where c.id = new.conversation_id and coalesce(c.is_group, false)) then
      return null;
    end if;
    select array_agg(user_id order by user_id) into v_members
    from public.conversation_members where conversation_id = new.conversation_id;
    if v_members is null or array_length(v_members, 1) <> 2 then
      return null;
    end if;

    insert into public.message_streaks (conversation_id, user_a, user_b)
    values (new.conversation_id, v_members[1], v_members[2])
    on conflict (conversation_id) do nothing;

    select * into v_row from public.message_streaks
    where conversation_id = new.conversation_id for update;

    if new.sender_id = v_row.user_a then
      v_row.a_last := v_today;
    elsif new.sender_id = v_row.user_b then
      v_row.b_last := v_today;
    else
      return null;
    end if;

    -- A streak day counts when BOTH sides have messaged today. Missing a full
    -- day (last counted day before yesterday) resets the run.
    if v_row.a_last = v_today and v_row.b_last = v_today
       and (v_row.last_counted is null or v_row.last_counted < v_today) then
      if v_row.last_counted = v_today - 1 then
        v_row.streak := v_row.streak + 1;
      else
        v_row.streak := 1;
      end if;
      v_row.last_counted := v_today;
      v_row.best := greatest(v_row.best, v_row.streak);

      -- Milestone rewards for both sides.
      v_reward := case v_row.streak
        when 3 then 30 when 7 then 75 when 14 then 150
        when 30 then 300 when 50 then 500 when 100 then 1000
        else 0 end;
      if v_reward > 0 then
        perform public.award_credits(v_row.user_a, v_reward, 'message_streak', 'conversation', new.conversation_id::text,
          jsonb_build_object('streak', v_row.streak));
        perform public.award_credits(v_row.user_b, v_reward, 'message_streak', 'conversation', new.conversation_id::text,
          jsonb_build_object('streak', v_row.streak));
        insert into public.notifications (user_id, type, title, body, data)
        select u, 'streak', '🔥 ' || v_row.streak || '-day chat streak!',
               'You both kept the conversation going ' || v_row.streak || ' days in a row — ' || v_reward || ' credits each.',
               jsonb_build_object('conversation_id', new.conversation_id, 'streak', v_row.streak)
        from unnest(array[v_row.user_a, v_row.user_b]) u;
      end if;
    elsif v_row.last_counted is not null and v_row.last_counted < v_today - 1 then
      -- The run is dead; show 0 until a new both-sides day starts it again.
      v_row.streak := 0;
    end if;

    update public.message_streaks set
      a_last = v_row.a_last, b_last = v_row.b_last, last_counted = v_row.last_counted,
      streak = v_row.streak, best = v_row.best, updated_at = now()
    where conversation_id = new.conversation_id;
  exception when others then
    null; -- streaks must never block message delivery
  end;
  return null;
end;
$$;
revoke execute on function public.bump_message_streak() from public, anon, authenticated;

drop trigger if exists messages_bump_streak on public.messages;
create trigger messages_bump_streak
after insert on public.messages
for each row execute function public.bump_message_streak();

-- Streak readout for the chat header.
create or replace function public.conversation_streak(p_conversation uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_row public.message_streaks%rowtype;
  v_today date := (now() at time zone 'utc')::date;
  v_alive boolean;
begin
  select * into v_row from public.message_streaks
  where conversation_id = p_conversation and v_me in (user_a, user_b);
  if v_row.conversation_id is null then
    return jsonb_build_object('streak', 0, 'alive', false, 'best', 0, 'at_risk', false);
  end if;
  v_alive := v_row.streak > 0 and v_row.last_counted >= v_today - 1;
  return jsonb_build_object(
    'streak', case when v_alive then v_row.streak else 0 end,
    'best', v_row.best,
    'alive', v_alive,
    -- At risk = yesterday counted but today hasn't yet.
    'at_risk', v_alive and v_row.last_counted = v_today - 1
  );
end;
$$;
revoke execute on function public.conversation_streak(uuid) from public, anon;
grant execute on function public.conversation_streak(uuid) to authenticated;

-- ───────────────────── 4. Community mega-events ─────────────────────

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  goal_type text not null default 'plays' check (goal_type in ('plays')),
  target bigint not null check (target > 0),
  progress bigint not null default 0,
  credits_reward int not null default 100 check (credits_reward between 0 and 10000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  completed_at timestamptz,
  rewarded boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.community_events enable row level security;
create policy community_events_select_all on public.community_events
  for select using (true);

create table if not exists public.community_event_participants (
  event_id uuid not null references public.community_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  contributions bigint not null default 0,
  primary key (event_id, user_id)
);

alter table public.community_event_participants enable row level security;
create policy community_event_participants_select_own on public.community_event_participants
  for select using (auth.uid() = user_id);

create index if not exists community_events_active_idx
  on public.community_events (ends_at desc) where completed_at is null;

-- Called from submit_score: count a play toward any live event, and settle
-- rewards the moment the goal is crossed.
create or replace function public.bump_community_event(p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_event public.community_events%rowtype;
  v_count int;
begin
  select * into v_event from public.community_events
  where completed_at is null and now() between starts_at and ends_at
  order by created_at desc limit 1
  for update;
  if v_event.id is null then
    return;
  end if;

  update public.community_events set progress = progress + 1 where id = v_event.id;
  insert into public.community_event_participants as p (event_id, user_id, contributions)
  values (v_event.id, p_user, 1)
  on conflict (event_id, user_id) do update set contributions = p.contributions + 1;

  if v_event.progress + 1 >= v_event.target then
    update public.community_events
    set completed_at = now(), rewarded = true
    where id = v_event.id;

    select count(*) into v_count from public.community_event_participants where event_id = v_event.id;

    -- Everyone who took part gets the reward + a notification.
    perform public.award_credits(user_id, v_event.credits_reward, 'community_event', 'event', v_event.id::text,
      jsonb_build_object('title', v_event.title))
    from public.community_event_participants where event_id = v_event.id;

    insert into public.notifications (user_id, type, title, body, data)
    select user_id, 'event', '🎊 ' || v_event.title || ' — goal reached!',
           'The community hit the goal together. You earned ' || v_event.credits_reward || ' credits for taking part.',
           jsonb_build_object('event_id', v_event.id)
    from public.community_event_participants where event_id = v_event.id;
  end if;
end;
$$;
revoke execute on function public.bump_community_event(uuid) from public, anon, authenticated;

-- Active (or latest finished) event + the caller's contribution, for the home page.
create or replace function public.current_community_event()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_event public.community_events%rowtype;
  v_mine bigint := 0;
begin
  select * into v_event from public.community_events
  where now() between starts_at and ends_at or completed_at > now() - interval '2 days'
  order by (completed_at is null) desc, created_at desc limit 1;
  if v_event.id is null then
    return null;
  end if;
  if auth.uid() is not null then
    select contributions into v_mine from public.community_event_participants
    where event_id = v_event.id and user_id = auth.uid();
  end if;
  return jsonb_build_object(
    'id', v_event.id, 'title', v_event.title, 'description', v_event.description,
    'target', v_event.target, 'progress', least(v_event.progress, v_event.target),
    'credits_reward', v_event.credits_reward,
    'ends_at', v_event.ends_at, 'completed_at', v_event.completed_at,
    'participants', (select count(*) from public.community_event_participants where event_id = v_event.id),
    'my_contributions', coalesce(v_mine, 0)
  );
end;
$$;
revoke execute on function public.current_community_event() from public;
grant execute on function public.current_community_event() to anon, authenticated;

-- Admin management.
create or replace function public.admin_create_community_event(
  p_title text, p_description text, p_target bigint, p_reward int, p_hours int
)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if coalesce(trim(p_title), '') = '' or coalesce(p_target, 0) < 1 or coalesce(p_hours, 0) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Fill in a title, target and duration');
  end if;
  if exists (select 1 from public.community_events where completed_at is null and ends_at > now()) then
    return jsonb_build_object('ok', false, 'error', 'An event is already running — end it first');
  end if;
  insert into public.community_events (title, description, target, credits_reward, ends_at, created_by)
  values (left(trim(p_title), 80), nullif(left(coalesce(p_description,''), 300), ''),
          p_target, greatest(0, least(coalesce(p_reward, 100), 10000)),
          now() + make_interval(hours => least(p_hours, 24*30)), auth.uid());
  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'community_event_create', 'community_event', p_title,
          jsonb_build_object('target', p_target, 'reward', p_reward, 'hours', p_hours));
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.admin_create_community_event(text, text, bigint, int, int) from public, anon;
grant execute on function public.admin_create_community_event(text, text, bigint, int, int) to authenticated;

create or replace function public.admin_end_community_event(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  update public.community_events set ends_at = now(), completed_at = coalesce(completed_at, now())
  where id = p_id;
  insert into public.audit_logs (actor_id, action, target_type, target_id)
  values (auth.uid(), 'community_event_end', 'community_event', p_id::text);
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.admin_end_community_event(uuid) from public, anon;
grant execute on function public.admin_end_community_event(uuid) to authenticated;

-- ───────────────────── 5. Music tracks + 6. Mythic rarity ─────────────────────

alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (kind in (
  'avatar_frame', 'profile_theme', 'badge', 'effect', 'banner', 'nameplate',
  'collectible', 'xp_boost', 'credit_boost', 'track'
));

alter table public.shop_items drop constraint if exists shop_items_rarity_check;
alter table public.shop_items add constraint shop_items_rarity_check check (rarity in (
  'common', 'rare', 'epic', 'legendary', 'mythic'
));

alter table public.shop_items add column if not exists min_level int not null default 0;

-- Original in-house tracks: rendered procedurally in the browser (Web Audio),
-- so there are zero copyright concerns and nothing to host.
insert into public.shop_items (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only, min_level) values
  ('track-neon-drift', 'Neon Drift', 'A laid-back synthwave loop for late-night runs.', 'track', 300, 'common', '{"track":"neon-drift","colors":["#22d3ee","#7a3dff"]}', false, true, 40, false, 5),
  ('track-starlight', 'Starlight', 'Gentle ambient chimes under a slow pad.', 'track', 400, 'rare', '{"track":"starlight","colors":["#a78bfa","#f0abfc"]}', false, true, 39, false, 5),
  ('track-arcade-heart', 'Arcade Heart', 'Upbeat chiptune with a bouncing bassline.', 'track', 500, 'rare', '{"track":"arcade-heart","colors":["#fbbf24","#fb7185"]}', false, true, 38, false, 5),
  ('track-deep-focus', 'Deep Focus', 'A minimal pulse for high-score concentration.', 'track', 650, 'epic', '{"track":"deep-focus","colors":["#34d399","#0ea5e9"]}', false, true, 37, false, 5)
on conflict (slug) do nothing;

-- The level-50 exclusive: unbuyable, granted automatically at level 50.
insert into public.shop_items (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only, min_level) values
  ('effect-singularity', 'Singularity', 'A slowly collapsing star orbits your profile. Reached only at level 50.', 'effect', 0, 'mythic', '{"effect":"singularity","colors":["#7a3dff","#0b0a12"]}', false, false, 0, false, 50)
on conflict (slug) do nothing;

-- purchase_shop_item: level gates, 'track' kind, and stacking boost purchases.
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
  v_level int;
  v_cap int;
  v_state public.user_boosts%rowtype;
  v_queued boolean := false;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;

  select * into v_item from public.shop_items where slug = p_slug and available;
  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'Item not available');
  end if;

  if v_item.staff_only and not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'This item is staff-only');
  end if;

  select level into v_level from public.profiles where id = v_me;
  if coalesce(v_item.min_level, 0) > coalesce(v_level, 1) then
    return jsonb_build_object('ok', false, 'error',
      'Reach level ' || v_item.min_level || ' to unlock this');
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
    -- Stacking + queue: a fresh boost starts a ×2 window; more purchases stack
    -- the multiplier (to 5×, or 10× for Discord boosters); beyond the cap they
    -- queue and take over automatically when the window ends.
    perform public.settle_user_boosts(v_me);
    select case when booster_since is not null then 9 else 4 end into v_cap
    from public.profiles where id = v_me;

    insert into public.user_boosts (user_id, kind, stacks, expires_at, queued)
    values (v_me, v_item.kind, 0, null, 0)
    on conflict (user_id, kind) do nothing;

    select * into v_state from public.user_boosts
    where user_id = v_me and kind = v_item.kind for update;

    if v_state.expires_at is null or v_state.expires_at <= now() then
      update public.user_boosts set stacks = 1, expires_at = now() + interval '24 hours'
      where user_id = v_me and kind = v_item.kind;
    elsif v_state.stacks < v_cap then
      update public.user_boosts set stacks = stacks + 1
      where user_id = v_me and kind = v_item.kind;
    else
      update public.user_boosts set queued = queued + 1
      where user_id = v_me and kind = v_item.kind;
      v_queued := true;
    end if;

    -- Keep the historical inventory record too.
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

  return jsonb_build_object('ok', true, 'item', v_item.slug, 'queued', v_queued);
end;
$$;

-- add_xp: grant the level-50 mythic on the way past 50.
create or replace function public.add_xp(p_user uuid, p_amount bigint)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_old_level int;
  v_new_level int;
  v_xp bigint;
  v_granted int;
begin
  update public.profiles
  set xp = xp + p_amount
  where id = p_user
  returning xp, level into v_xp, v_old_level;

  v_new_level := public.level_for_xp(v_xp);

  if v_new_level <> v_old_level then
    update public.profiles set level = v_new_level where id = p_user;
    if v_new_level > v_old_level then
      perform public.award_credits(p_user, v_new_level * 25, 'level_up', 'level', v_new_level::text);
      insert into public.notifications (user_id, type, title, body, data)
      values (
        p_user, 'level_up', 'Level up!',
        format('You reached level %s and earned %s credits.', v_new_level, v_new_level * 25),
        jsonb_build_object('level', v_new_level)
      );

      if v_new_level >= 50 then
        insert into public.inventory_items (user_id, item_id)
        select p_user, id from public.shop_items where slug = 'effect-singularity'
        on conflict (user_id, item_id) do nothing;
        get diagnostics v_granted = row_count;
        if v_granted > 0 then
          insert into public.notifications (user_id, type, title, body, data)
          values (p_user, 'badge', '🌌 Singularity unlocked',
            'You reached level 50 and earned the mythic Singularity profile effect.',
            jsonb_build_object('slug', 'effect-singularity'));
        end if;
      end if;
    end if;
  end if;
end;
$$;

-- submit_score: stacked boost multipliers + mega-event contribution.
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

    perform public.settle_user_boosts(v_me);
    v_credit_mult := public.boost_multiplier(v_me, 'credit_boost');
    v_xp_mult := public.boost_multiplier(v_me, 'xp_boost');

    v_base_credits := least(2 + (v_score / v_game.credit_divisor)::int, v_game.max_credits_per_session);
    v_credits := v_base_credits * v_credit_mult;
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

    v_xp := (5 + v_base_credits * 3) * v_xp_mult;
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
    perform public.bump_community_event(v_me);
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
    'credit_multiplier', v_credit_mult,
    'rewarded', v_rewarded
  );
end;
$$;

-- ───────────────────── 7. Admin-editable surfaces (flag rows) ─────────────────────

insert into public.feature_flags (key, enabled, description, payload) values
  ('ads_placements', true, 'Where rewarded ads may appear when the programme is live.',
   '{"home":true,"games":true,"shop":false}'::jsonb),
  ('roadmap_override', false, 'When enabled, /roadmap renders this JSON instead of the built-in roadmap.',
   '{}'::jsonb),
  ('home_layout', false, 'When enabled, the home page renders sections in this order.',
   '{"order":["daily","recent","featured","categories","all_games"],"hidden":[]}'::jsonb)
on conflict (key) do nothing;
