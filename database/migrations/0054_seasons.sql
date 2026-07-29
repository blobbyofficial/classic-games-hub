-- 0054_seasons.sql
-- Seasons: a themed track of rewards you work through over a few months.
--
-- Three product questions were outstanding on this, and rather than guess at
-- any of them the schema is arranged so that all three are DATA, not
-- structure. Getting them wrong now costs an UPDATE, not a migration:
--
--   How long is a season?      starts_at / ends_at per season. Quarterly,
--                              monthly or ad-hoc all work; nothing here
--                              assumes a length.
--   Is there a paid track?     Not built. This is the free track only. A paid
--                              tier would be an additive boolean on
--                              season_tiers plus a payment integration that
--                              does not exist anywhere in this codebase yet,
--                              so building one would be a much larger decision
--                              than a schema choice.
--   Do old cosmetics return?   Operational, not schema. A past season's item
--                              comes back only if someone adds it to a new
--                              season's tiers. The default is that it does not.
--
-- Season XP is DERIVED, never stored: it is the XP a player earned from play
-- sessions inside the season's window. play_sessions already records
-- xp_earned and created_at, so the number is a sum away and can never drift
-- from what actually happened. This also means seasons need no hook into
-- add_xp or submit_score - nothing on the hot path changes at all.
--
-- As with collections, the one thing stored is the claim, because "have they
-- already taken this tier" is not derivable from progress.

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  icon text not null default 'sparkles',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.season_tiers (
  season_id uuid not null references public.seasons (id) on delete cascade,
  tier int not null check (tier > 0),
  xp_required int not null check (xp_required >= 0),
  reward_credits bigint not null default 0 check (reward_credits >= 0),
  reward_item_id uuid references public.shop_items (id) on delete set null,
  primary key (season_id, tier)
);

create table if not exists public.season_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  tier int not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, season_id, tier)
);

-- The window query behind every season XP total.
create index if not exists play_sessions_user_time_idx
  on public.play_sessions (user_id, created_at);

alter table public.seasons enable row level security;
alter table public.season_tiers enable row level security;
alter table public.season_claims enable row level security;

drop policy if exists "seasons_read" on public.seasons;
create policy "seasons_read" on public.seasons for select using (active or public.is_staff());

drop policy if exists "season_tiers_read" on public.season_tiers;
create policy "season_tiers_read" on public.season_tiers for select using (true);

drop policy if exists "season_claims_read_own" on public.season_claims;
create policy "season_claims_read_own" on public.season_claims
  for select using (user_id = auth.uid());

-- ── Progress ───────────────────────────────────────────────────────────────

/** XP a player earned inside a season's window. Derived from play_sessions. */
create or replace function public.season_xp(p_user uuid, p_season uuid)
returns bigint
language sql stable
security definer
set search_path = public
as $$
  select coalesce(sum(ps.xp_earned), 0)::bigint
  from public.play_sessions ps
  join public.seasons s on s.id = p_season
  where ps.user_id = p_user
    and ps.created_at >= s.starts_at
    and ps.created_at < s.ends_at;
$$;

revoke execute on function public.season_xp(uuid, uuid) from public, anon;
grant execute on function public.season_xp(uuid, uuid) to authenticated;

create or replace function public.my_season()
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select case when s.id is null then null else jsonb_build_object(
    'slug', s.slug,
    'name', s.name,
    'description', s.description,
    'icon', s.icon,
    'starts_at', s.starts_at,
    'ends_at', s.ends_at,
    'xp', public.season_xp(auth.uid(), s.id),
    'tiers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tier', st.tier,
        'xp_required', st.xp_required,
        'reward_credits', st.reward_credits,
        'reward_item', (
          select jsonb_build_object('slug', si.slug, 'name', si.name, 'kind', si.kind, 'rarity', si.rarity)
          from public.shop_items si where si.id = st.reward_item_id
        ),
        'claimed', exists (
          select 1 from public.season_claims sc
          where sc.season_id = s.id and sc.tier = st.tier and sc.user_id = auth.uid()
        )
      ) order by st.tier)
      from public.season_tiers st where st.season_id = s.id
    ), '[]'::jsonb)
  ) end
  from (
    select * from public.seasons
    where active and now() >= starts_at and now() < ends_at
    order by starts_at desc limit 1
  ) s;
$$;

revoke execute on function public.my_season() from public, anon;
grant execute on function public.my_season() to authenticated;

-- ── Claiming ───────────────────────────────────────────────────────────────

create or replace function public.claim_season_tier(p_tier int)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_season public.seasons;
  v_tier public.season_tiers;
  v_xp bigint;
  v_balance bigint;
  v_reward_slug text;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'You must be signed in');
  end if;

  select * into v_season from public.seasons
  where active and now() >= starts_at and now() < ends_at
  order by starts_at desc limit 1;

  if v_season.id is null then
    return jsonb_build_object('ok', false, 'error', 'No season is running right now');
  end if;

  select * into v_tier from public.season_tiers
  where season_id = v_season.id and tier = p_tier;

  if v_tier.season_id is null then
    return jsonb_build_object('ok', false, 'error', 'That tier does not exist');
  end if;

  -- Progress is re-derived here rather than trusted from the client, so a
  -- stale page cannot claim a tier that has not been reached.
  v_xp := public.season_xp(v_me, v_season.id);
  if v_xp < v_tier.xp_required then
    return jsonb_build_object(
      'ok', false,
      'error', format('Tier %s needs %s season XP - you have %s', p_tier, v_tier.xp_required, v_xp)
    );
  end if;

  -- Same guard as collections: insert first and let the primary key refuse a
  -- second attempt, rather than checking and then writing.
  begin
    insert into public.season_claims (user_id, season_id, tier) values (v_me, v_season.id, p_tier);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'You have already claimed this tier');
  end;

  if v_tier.reward_credits > 0 then
    v_balance := public.award_credits(
      v_me, v_tier.reward_credits, 'season', 'season', v_season.slug,
      jsonb_build_object('tier', p_tier)
    );
  else
    select credits into v_balance from public.profiles where id = v_me;
  end if;

  if v_tier.reward_item_id is not null then
    insert into public.inventory_items (user_id, item_id)
    values (v_me, v_tier.reward_item_id)
    on conflict (user_id, item_id) do nothing;
    select slug into v_reward_slug from public.shop_items where id = v_tier.reward_item_id;
  end if;

  return jsonb_build_object(
    'ok', true, 'tier', p_tier, 'credits', v_tier.reward_credits,
    'balance', v_balance, 'reward', v_reward_slug
  );
end;
$$;

revoke execute on function public.claim_season_tier(int) from public, anon;
grant execute on function public.claim_season_tier(int) to authenticated;

-- ── Season 1 ───────────────────────────────────────────────────────────────

-- Rewards are unbuyable: available = false and no purchase route, so the only
-- way to hold one is to have played through the season it belonged to.
insert into public.shop_items
  (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only, min_level)
values
  ('badge-neon-summer', 'Neon Summer', 'Awarded during the Neon Summer season.', 'badge', 0, 'epic', '{"icon":"sun","colors":["#f472b6","#fbbf24"]}', true, false, 0, false, 0),
  ('pframe-neon-summer', 'Neon Summer', 'A season-one profile frame. Not sold.', 'profile_frame', 0, 'legendary', '{"colors":["#f472b6","#22d3ee"]}', true, false, 0, false, 0),
  ('deco-shades', 'Shades', 'Season one. Worn indoors, obviously.', 'decoration', 0, 'legendary', '{"decoration":"shades","colors":["#0b0a14","#f472b6"]}', true, false, 0, false, 0)
on conflict (slug) do nothing;

insert into public.seasons (slug, name, description, icon, starts_at, ends_at)
values (
  'neon-summer', 'Neon Summer',
  'The first season. Play anything to earn season XP and work down the track.',
  'sun', '2026-07-01T00:00:00Z', '2026-10-01T00:00:00Z'
)
on conflict (slug) do nothing;

insert into public.season_tiers (season_id, tier, xp_required, reward_credits, reward_item_id)
select s.id, v.tier, v.xp, v.credits,
       (select id from public.shop_items where slug = v.item)
from (values
  (1,  500,  750::bigint, null),
  (2, 1500,  500::bigint, 'badge-neon-summer'),
  (3, 3000, 1500::bigint, null),
  (4, 5000, 1000::bigint, 'pframe-neon-summer'),
  (5, 8000, 2500::bigint, 'deco-shades')
) as v(tier, xp, credits, item)
cross join public.seasons s
where s.slug = 'neon-summer'
on conflict (season_id, tier) do nothing;
