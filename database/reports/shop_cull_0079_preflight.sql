-- Preflight ONLY: read-only impact report for 0079_shop_catalogue_cleanup.sql.
-- Run against staging and production before approving the migration.
with retired as (
 select slug from public.shop_items where available and not staff_only and not seasonal and price > 0 and kind not in ('xp_boost','credit_boost') and slug not in ('frame-neon-ring','frame-violet-pulse','badge-champion','banner-nebula','trail-comet','deco-crown','deco-headphones','effect-matrix','effect-fireflies','entrance-glitch','nameplate-cyber','pframe-obsidian','pframe-prism','theme-deep-space','track-neon-drift')
), eligible_refunds as (
  select t.id, t.user_id, -t.amount as paid
  from public.credit_transactions t join retired r on r.slug = t.ref_id
  where t.reason = 'shop_purchase' and t.ref_type = 'shop_item' and t.amount < 0
)
select
  (select count(*) from public.shop_items where available and not staff_only and not seasonal and price > 0 and kind not in ('xp_boost','credit_boost')) as eligible_regular_items,
  (select count(*) from retired) as to_retire,
  (select count(*) from public.shop_items where available) as currently_visible_items,
  (select count(*) from public.shop_items where available) - (select count(*) from retired) as remaining_visible_items,
  (select count(*) from eligible_refunds) as refundable_purchases,
  (select count(distinct user_id) from eligible_refunds) as users_to_refund,
  (select coalesce(sum(paid), 0) from eligible_refunds) as total_credits_to_refund;
-- Review which listings would be retired:
-- Reuse the ranked/retired CTE above and SELECT kind, slug, name, price FROM retired ORDER BY kind, slug.
