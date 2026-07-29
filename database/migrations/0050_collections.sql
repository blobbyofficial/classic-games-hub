-- 0050_collections.sql
-- Collectable cosmetic sets (roadmap v1.5.0, the first half of "Collections &
-- seasons").
--
-- A collection is a named set of shop items. Own every item in it and you can
-- claim the set: credits, plus an exclusive badge that cannot be bought at any
-- price. That badge is the whole point - it is proof you finished something,
-- which is a different kind of prize from anything the shop sells.
--
-- Progress is derived, never stored. "Do you own these six things" is a join
-- away at any moment, and a stored counter would only be a second copy of the
-- truth that could drift when an item expires or a purchase is refunded. The
-- one thing that IS stored is the claim, because "have they already taken the
-- reward" is not derivable from ownership - and that is exactly the row that
-- has to be unique to stop a set paying out twice.
--
-- Seasons are deliberately NOT here. Season length, whether there is a paid
-- track, and whether past-season cosmetics ever return are open product
-- questions, and they change the schema. Collections stand on their own and do
-- not need those answers; `collections.season` is left as a nullable text tag
-- so a future seasons migration has somewhere to hang without a rewrite.

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  icon text not null default 'gift',
  -- Free-text for now; a future seasons migration can promote this to a FK.
  season text,
  reward_credits bigint not null default 0 check (reward_credits >= 0),
  reward_item_id uuid references public.shop_items (id) on delete set null,
  sort_weight int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  item_id uuid not null references public.shop_items (id) on delete cascade,
  primary key (collection_id, item_id)
);

create table if not exists public.collection_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (user_id, collection_id)
);

create index if not exists collection_items_item_idx on public.collection_items (item_id);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.collection_claims enable row level security;

-- The catalogue is public: knowing what a set contains is the point.
drop policy if exists "collections_read" on public.collections;
create policy "collections_read" on public.collections for select using (active or public.is_staff());

drop policy if exists "collection_items_read" on public.collection_items;
create policy "collection_items_read" on public.collection_items for select using (true);

-- Claims are private, and writable only through claim_collection().
drop policy if exists "collection_claims_read_own" on public.collection_claims;
create policy "collection_claims_read_own" on public.collection_claims
  for select using (user_id = auth.uid());

-- ── Reads ──────────────────────────────────────────────────────────────────

create or replace function public.my_collections()
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(c order by c.sort_weight desc, c.name), '[]'::jsonb)
  from (
    select
      col.sort_weight,
      col.name,
      jsonb_build_object(
        'slug', col.slug,
        'name', col.name,
        'description', col.description,
        'icon', col.icon,
        'season', col.season,
        'reward_credits', col.reward_credits,
        'reward_item', (
          select jsonb_build_object('slug', si.slug, 'name', si.name, 'kind', si.kind, 'rarity', si.rarity)
          from public.shop_items si where si.id = col.reward_item_id
        ),
        'claimed', exists (
          select 1 from public.collection_claims cc
          where cc.collection_id = col.id and cc.user_id = auth.uid()
        ),
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'slug', si.slug,
            'name', si.name,
            'kind', si.kind,
            'rarity', si.rarity,
            'owned', exists (
              select 1 from public.inventory_items ii
              where ii.item_id = si.id
                and ii.user_id = auth.uid()
                and (ii.expires_at is null or ii.expires_at > now())
            )
          ) order by si.sort_weight desc, si.name)
          from public.collection_items ci
          join public.shop_items si on si.id = ci.item_id
          where ci.collection_id = col.id
        ), '[]'::jsonb)
      ) as c
    from public.collections col
    where col.active
  ) c;
$$;

revoke execute on function public.my_collections() from public, anon;
grant execute on function public.my_collections() to authenticated;

-- ── Claiming ───────────────────────────────────────────────────────────────

create or replace function public.claim_collection(p_slug text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_col public.collections;
  v_total int;
  v_owned int;
  v_balance bigint;
  v_reward_slug text;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'You must be signed in');
  end if;

  select * into v_col from public.collections where slug = p_slug and active;
  if v_col.id is null then
    return jsonb_build_object('ok', false, 'error', 'That collection does not exist');
  end if;

  -- The claim row is the guard against double payouts. Insert it first and let
  -- the primary key refuse a second attempt, rather than checking-then-writing
  -- and leaving a window between the two.
  begin
    insert into public.collection_claims (user_id, collection_id) values (v_me, v_col.id);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'You have already claimed this collection');
  end;

  select count(*) into v_total from public.collection_items where collection_id = v_col.id;

  select count(*) into v_owned
  from public.collection_items ci
  join public.inventory_items ii on ii.item_id = ci.item_id and ii.user_id = v_me
  where ci.collection_id = v_col.id
    and (ii.expires_at is null or ii.expires_at > now());

  if v_total = 0 or v_owned < v_total then
    -- Not finished after all: undo the claim so it can be earned properly.
    delete from public.collection_claims where user_id = v_me and collection_id = v_col.id;
    return jsonb_build_object(
      'ok', false,
      'error', format('You own %s of %s items in this collection', v_owned, v_total)
    );
  end if;

  if v_col.reward_credits > 0 then
    v_balance := public.award_credits(
      v_me, v_col.reward_credits, 'collection', 'collection', v_col.slug,
      jsonb_build_object('name', v_col.name)
    );
  else
    select credits into v_balance from public.profiles where id = v_me;
  end if;

  if v_col.reward_item_id is not null then
    insert into public.inventory_items (user_id, item_id)
    values (v_me, v_col.reward_item_id)
    on conflict (user_id, item_id) do nothing;
    select slug into v_reward_slug from public.shop_items where id = v_col.reward_item_id;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_me, 'badge', 'Collection complete!',
    format('You completed "%s" and earned %s credits.', v_col.name, v_col.reward_credits),
    jsonb_build_object('collection', v_col.slug, 'reward', v_reward_slug)
  );

  return jsonb_build_object(
    'ok', true,
    'credits', v_col.reward_credits,
    'balance', v_balance,
    'reward', v_reward_slug
  );
end;
$$;

revoke execute on function public.claim_collection(text) from public, anon;
grant execute on function public.claim_collection(text) to authenticated;

-- ── The opening sets ───────────────────────────────────────────────────────

-- Completion badges. Unbuyable at any price: available = false and no route to
-- purchase them, so the only way to hold one is to have finished the set.
insert into public.shop_items
  (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only, min_level)
values
  ('badge-set-aurora', 'Aurora Collector', 'Awarded for completing the Aurora collection.', 'badge', 0, 'epic', '{"icon":"sparkles","colors":["#22d3ee","#a855f7"]}', false, false, 0, false, 0),
  ('badge-set-neon', 'Neon Collector', 'Awarded for completing the Neon Nights collection.', 'badge', 0, 'epic', '{"icon":"zap","colors":["#22d3ee","#f43f5e"]}', false, false, 0, false, 0),
  ('badge-set-space', 'Deep Space Collector', 'Awarded for completing the Deep Space collection.', 'badge', 0, 'epic', '{"icon":"moon","colors":["#6366f1","#0b0a12"]}', false, false, 0, false, 0),
  ('badge-set-dressed', 'Fully Accessorised', 'Awarded for owning every avatar decoration.', 'badge', 0, 'legendary', '{"icon":"crown","colors":["#fbbf24","#f97316"]}', false, false, 0, false, 0),
  ('badge-set-audiophile', 'Audiophile', 'Awarded for owning the whole soundtrack.', 'badge', 0, 'legendary', '{"icon":"music","colors":["#34d399","#0ea5e9"]}', false, false, 0, false, 0)
on conflict (slug) do nothing;

insert into public.collections (slug, name, description, icon, reward_credits, reward_item_id, sort_weight)
select v.slug, v.name, v.description, v.icon, v.credits,
       (select id from public.shop_items where slug = v.reward), v.weight
from (values
  ('aurora',   'Aurora',       'Cool greens and violets, drifting.',                'sparkles', 1500::bigint, 'badge-set-aurora',     50),
  ('neon',     'Neon Nights',  'Cyan, magenta and a synthwave bassline.',           'zap',      2000::bigint, 'badge-set-neon',       49),
  ('space',    'Deep Space',   'Nebulae, starfields and the long dark.',            'moon',     1500::bigint, 'badge-set-space',      48),
  ('dressed',  'Head to Toe',  'Every avatar decoration, all seven of them.',       'crown',    3000::bigint, 'badge-set-dressed',    47),
  ('soundtrack','Full Soundtrack','Every track in the library.',                    'music',    2500::bigint, 'badge-set-audiophile', 46)
) as v(slug, name, description, icon, credits, reward, weight)
on conflict (slug) do nothing;

-- Membership, resolved by slug so this stays readable.
insert into public.collection_items (collection_id, item_id)
select c.id, si.id
from (values
  ('aurora', 'effect-aurora'), ('aurora', 'nameplate-aurora'), ('aurora', 'theme-aurora'),
  ('neon', 'frame-neon-ring'), ('neon', 'nameplate-cyber'), ('neon', 'theme-synthwave'), ('neon', 'track-neon-drift'),
  ('space', 'theme-deep-space'), ('space', 'banner-nebula'), ('space', 'nameplate-galaxy'),
  ('dressed', 'deco-cat-ears'), ('dressed', 'deco-halo'), ('dressed', 'deco-crown'), ('dressed', 'deco-sparkles'),
  ('dressed', 'deco-flames'), ('dressed', 'deco-headphones'), ('dressed', 'deco-storm'),
  ('soundtrack', 'track-neon-drift'), ('soundtrack', 'track-starlight'), ('soundtrack', 'track-arcade-heart'), ('soundtrack', 'track-deep-focus')
) as v(col, item)
join public.collections c on c.slug = v.col
join public.shop_items si on si.slug = v.item
on conflict do nothing;
