-- 0031 (v1.2.2): trim the shop to a smaller, higher-quality set. Every owner of
-- a removed item is refunded the item's price (logged in the credit ledger),
-- then the removed items are deleted (cascading their inventory & wishlist rows).
-- Kept items are revamped separately.

-- 1. Refund owners (ledger entry showing the post-refund balance).
insert into public.credit_transactions (user_id, amount, balance_after, reason, ref_type)
select o.user_id, o.amount, p.credits + o.amount, 'shop_refund', 'shop_cull'
from (
  select ii.user_id, sum(s.price)::bigint as amount
  from public.inventory_items ii
  join public.shop_items s on s.id = ii.item_id
  where s.slug = any(array[
    'nameplate-emerald','nameplate-mono','nameplate-royal','nameplate-bubblegum',
    'frame-emerald-ring','frame-gold-laurel','frame-summer-wave','frame-pixel-fire','frame-shadow','frame-royal','frame-toxic',
    'effect-embers','theme-midnight','theme-rose-gold','theme-sunset','theme-terminal',
    'banner-arcade-floor','banner-pixel-sunset','banner-emerald-tide',
    'badge-night-owl','badge-curator','badge-community-heart','badge-on-fire','badge-rising-star','badge-sharpshooter','badge-speedrunner','badge-strategist','badge-summer-25',
    'collectible-cartridge','collectible-crt','collectible-joystick'
  ])
  group by ii.user_id
  having sum(s.price) > 0
) o
join public.profiles p on p.id = o.user_id;

-- 2. Apply the refund to balances.
update public.profiles p set credits = p.credits + o.amount
from (
  select ii.user_id, sum(s.price)::bigint as amount
  from public.inventory_items ii
  join public.shop_items s on s.id = ii.item_id
  where s.slug = any(array[
    'nameplate-emerald','nameplate-mono','nameplate-royal','nameplate-bubblegum',
    'frame-emerald-ring','frame-gold-laurel','frame-summer-wave','frame-pixel-fire','frame-shadow','frame-royal','frame-toxic',
    'effect-embers','theme-midnight','theme-rose-gold','theme-sunset','theme-terminal',
    'banner-arcade-floor','banner-pixel-sunset','banner-emerald-tide',
    'badge-night-owl','badge-curator','badge-community-heart','badge-on-fire','badge-rising-star','badge-sharpshooter','badge-speedrunner','badge-strategist','badge-summer-25',
    'collectible-cartridge','collectible-crt','collectible-joystick'
  ])
  group by ii.user_id
  having sum(s.price) > 0
) o
where p.id = o.user_id;

-- 3. Remove the culled items (cascades inventory_items + wishlist_items).
delete from public.shop_items where slug = any(array[
  'nameplate-emerald','nameplate-mono','nameplate-royal','nameplate-bubblegum',
  'frame-emerald-ring','frame-gold-laurel','frame-summer-wave','frame-pixel-fire','frame-shadow','frame-royal','frame-toxic',
  'effect-embers','theme-midnight','theme-rose-gold','theme-sunset','theme-terminal',
  'banner-arcade-floor','banner-pixel-sunset','banner-emerald-tide',
  'badge-night-owl','badge-curator','badge-community-heart','badge-on-fire','badge-rising-star','badge-sharpshooter','badge-speedrunner','badge-strategist','badge-summer-25',
  'collectible-cartridge','collectible-crt','collectible-joystick'
]);
