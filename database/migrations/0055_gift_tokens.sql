-- 0055_gift_tokens.sql
-- The monthly booster gift token (roadmap v1.5.0).
--
-- One token a month while you are boosting. Spend it to give a friend a
-- cosmetic for 30 days, free. The point is to pull people in: a booster's
-- perks become something their friends can see and try, rather than something
-- only the booster benefits from.
--
-- Two things were decided here rather than asked, both reversible:
--
--   30 days   The roadmap says "temporary" without saying how long. A month
--             matches the token's own cadence: the gift lasts until roughly
--             the next one arrives, so a friend who is gifted every month
--             keeps the cosmetic continuously, and one who is gifted once
--             gets a proper trial rather than a glimpse.
--   No stacking  A token is per calendar month and does not accumulate. Left
--             to pile up, a long-time booster could hand out a dozen at once,
--             which turns a steady trickle into a windfall and makes the perk
--             hard to reason about.
--
-- The temporary grant rides `inventory_items.expires_at`, which already exists
-- for boosts and is already respected by equip_item, apply_loadout_preset and
-- every ownership check. Nothing new had to learn about expiry.

create table if not exists public.gift_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Always the first of the month, so one token per person per month falls out
  -- of the primary key rather than needing a guard.
  month date not null check (month = date_trunc('month', month)::date),
  granted_at timestamptz not null default now(),
  used_at timestamptz,
  gifted_to uuid references public.profiles (id) on delete set null,
  item_id uuid references public.shop_items (id) on delete set null,
  primary key (user_id, month)
);

alter table public.gift_tokens enable row level security;

drop policy if exists "gift_tokens_read_own" on public.gift_tokens;
create policy "gift_tokens_read_own" on public.gift_tokens
  for select using (user_id = auth.uid());

-- ── Granting ───────────────────────────────────────────────────────────────

create or replace function public.grant_gift_tokens()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', now() at time zone 'utc')::date;
  v_granted int := 0;
begin
  with granted as (
    insert into public.gift_tokens (user_id, month)
    select p.id, v_month
    from public.profiles p
    where p.booster_since is not null
    on conflict (user_id, month) do nothing
    returning user_id
  ),
  told as (
    insert into public.notifications (user_id, type, title, body, data)
    select g.user_id, 'gift', 'Gift token ready',
           'Your monthly gift token is here - give a friend a cosmetic for 30 days, on us.',
           jsonb_build_object('month', v_month)
    from granted g
    returning 1
  )
  select count(*) into v_granted from told;

  return jsonb_build_object('ok', true, 'month', v_month, 'granted', v_granted);
end;
$$;

revoke execute on function public.grant_gift_tokens() from public, anon, authenticated;
grant execute on function public.grant_gift_tokens() to service_role;

-- ── Reading ────────────────────────────────────────────────────────────────

create or replace function public.my_gift_token()
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'boosting', (select booster_since is not null from public.profiles where id = auth.uid()),
    'month', to_char(date_trunc('month', now() at time zone 'utc'), 'YYYY-MM'),
    'token', (
      select jsonb_build_object(
        'used', gt.used_at is not null,
        'used_at', gt.used_at,
        'gifted_to', (select username from public.profiles where id = gt.gifted_to),
        'item', (select name from public.shop_items where id = gt.item_id)
      )
      from public.gift_tokens gt
      where gt.user_id = auth.uid()
        and gt.month = date_trunc('month', now() at time zone 'utc')::date
    )
  );
$$;

revoke execute on function public.my_gift_token() from public, anon;
grant execute on function public.my_gift_token() to authenticated;

-- ── Spending ───────────────────────────────────────────────────────────────

create or replace function public.gift_with_token(p_slug text, p_to uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_month date := date_trunc('month', now() at time zone 'utc')::date;
  v_item public.shop_items;
  v_expires timestamptz := now() + interval '30 days';
  v_used int;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'You must be signed in');
  end if;
  if v_me = p_to then
    return jsonb_build_object('ok', false, 'error', 'You cannot gift yourself');
  end if;

  -- Same guards as gift_item(): a free gift must not be a way around any of
  -- the rules a paid one respects.
  select * into v_item from public.shop_items where slug = p_slug and available;
  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'Item not found');
  end if;
  if v_item.kind in ('xp_boost', 'credit_boost') then
    return jsonb_build_object('ok', false, 'error', 'Boosts cannot be gifted');
  end if;
  if v_item.staff_only then
    return jsonb_build_object('ok', false, 'error', 'That item cannot be gifted');
  end if;
  if public.is_blocked_either_way(v_me, p_to) then
    return jsonb_build_object('ok', false, 'error', 'Unable to gift this player');
  end if;
  if exists (
    select 1 from public.inventory_items
    where user_id = p_to and item_id = v_item.id
      and (expires_at is null or expires_at > now())
  ) then
    return jsonb_build_object('ok', false, 'error', 'They already have this');
  end if;

  -- Claiming the token IS the guard against spending it twice: the update only
  -- matches an unused row, so two concurrent calls cannot both win.
  update public.gift_tokens
  set used_at = now(), gifted_to = p_to, item_id = v_item.id
  where user_id = v_me and month = v_month and used_at is null;
  get diagnostics v_used = row_count;

  if v_used = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', case
        when exists (select 1 from public.gift_tokens where user_id = v_me and month = v_month)
          then 'You have already used this month''s gift token'
        else 'You do not have a gift token this month - boost the server to get one'
      end
    );
  end if;

  -- A previously expired copy is refreshed rather than duplicated; the unique
  -- key on (user_id, item_id) means there is only ever one row to extend.
  insert into public.inventory_items (user_id, item_id, expires_at)
  values (p_to, v_item.id, v_expires)
  on conflict (user_id, item_id) do update set expires_at = v_expires;

  delete from public.wishlist_items where user_id = p_to and item_id = v_item.id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_to, 'gift', 'You received a gift!',
    format('A friend used their booster gift token to give you %s for 30 days.', v_item.name),
    jsonb_build_object('slug', v_item.slug, 'from', v_me, 'expires_at', v_expires)
  );

  return jsonb_build_object('ok', true, 'item', v_item.slug, 'expires_at', v_expires);
end;
$$;

revoke execute on function public.gift_with_token(text, uuid) from public, anon;
grant execute on function public.gift_with_token(text, uuid) to authenticated;
