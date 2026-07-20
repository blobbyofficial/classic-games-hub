-- 0011_nameplates_staff_flair.sql
-- Profile customization 2.0 — batch 1.
--
-- Adds a `nameplate` cosmetic kind (a styled plate rendered behind a player's
-- name, Discord-style) and a `staff_only` flag for exclusive admin/mod flair.
-- Extends equip/purchase guards accordingly. No new functions are created —
-- equip_item/purchase_shop_item are replaced in place, so their existing
-- grants (from 0006) are preserved.

-- ── schema ───────────────────────────────────────────────────────────────
alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (kind in (
  'avatar_frame', 'profile_theme', 'badge', 'effect', 'banner', 'nameplate',
  'collectible', 'xp_boost', 'credit_boost'
));

alter table public.shop_items add column if not exists staff_only boolean not null default false;

-- ── equip: allow nameplates, block staff-only items for non-staff ─────────
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
  if v_item.kind not in ('avatar_frame', 'profile_theme', 'badge', 'effect', 'banner', 'nameplate') then
    return jsonb_build_object('ok', false, 'error', 'This item cannot be equipped');
  end if;
  if v_item.staff_only and not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'This item is staff-only');
  end if;

  update public.profiles
  set equipped = equipped || jsonb_build_object(v_item.kind, v_item.slug)
  where id = v_me;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── purchase: block staff-only items for non-staff ────────────────────────
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

  if v_item.staff_only and not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'This item is staff-only');
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

-- ── seed: nameplates (purchasable) + staff-only flair (free, staff-gated) ──
insert into public.shop_items (slug, name, description, kind, price, rarity, preview, seasonal, sort_weight, staff_only) values
  ('nameplate-emerald', 'Emerald Plate', 'A cool emerald slab behind your name.', 'nameplate', 200, 'common', '{"colors":["#059669","#10b981"]}', false, 96, false),
  ('nameplate-cyber', 'Cyberwave', 'Neon cyan-to-blue nameplate with a subtle sheen.', 'nameplate', 400, 'rare', '{"colors":["#22d3ee","#3b82f6"]}', false, 95, false),
  ('nameplate-sunset', 'Sunset Strip', 'Warm sunset gradient nameplate.', 'nameplate', 400, 'rare', '{"colors":["#f97316","#ec4899"]}', false, 94, false),
  ('nameplate-royal', 'Royal Violet', 'A regal violet-and-gold nameplate.', 'nameplate', 900, 'epic', '{"colors":["#7c3aed","#f59e0b"]}', false, 93, false),
  ('nameplate-aurora', 'Aurora', 'Shifting aurora hues behind your name.', 'nameplate', 1500, 'legendary', '{"colors":["#22d3ee","#a855f7","#f472b6"]}', false, 92, false),
  ('nameplate-staff', 'Staff Plate', 'Exclusive nameplate for Hub staff.', 'nameplate', 0, 'legendary', '{"colors":["#f43f5e","#8b5cf6"]}', false, 91, true),
  ('frame-staff-aura', 'Staff Aura', 'A commanding aura frame, staff only.', 'avatar_frame', 0, 'legendary', '{"colors":["#f43f5e","#f59e0b"]}', false, 90, true),
  ('effect-staff-shimmer', 'Staff Shimmer', 'A prestige shimmer effect for staff profiles.', 'effect', 0, 'legendary', '{"icon":"sparkles","colors":["#f43f5e","#8b5cf6"]}', false, 68, true)
on conflict (slug) do nothing;

-- Grant the staff-only cosmetics to everyone who is currently staff.
insert into public.inventory_items (user_id, item_id)
select p.id, si.id
from public.profiles p
cross join public.shop_items si
where p.role in ('admin', 'moderator')
  and si.staff_only
on conflict (user_id, item_id) do nothing;
