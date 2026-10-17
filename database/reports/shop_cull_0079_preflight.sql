-- Preflight ONLY: read-only impact report for 0079_shop_catalogue_cleanup.sql.
-- Run against staging and production before approving the migration.
with ranked as (
  select id, slug, name, kind, price, sort_weight,
    row_number() over (partition by kind order by sort_weight desc, price desc, slug) as rank_in_kind,
    count(*) over (partition by kind) as kind_count
  from public.shop_items
  where available and not staff_only and not seasonal and price > 0
    and kind not in ('xp_boost','credit_boost')
), retired as (
  select * from ranked
  where rank_in_kind > greatest(1, ceil(kind_count * 0.20)::integer)
), eligible_refunds as (
  select t.id, t.user_id, -t.amount as paid
  from public.credit_transactions t join retired r on r.slug = t.ref_id
  where t.reason = 'shop_purchase' and t.ref_type = 'shop_item' and t.amount < 0
    and not exists (
      select 1 from public.shop_catalogue_refunds rf
      where rf.purchase_transaction_id = t.id
    )
)
select
  (select count(*) from ranked) as eligible_regular_items,
  (select count(*) from retired) as to_retire,
  (select count(*) from public.shop_items where available) as currently_visible_items,
  (select count(*) from public.shop_items where available) - (select count(*) from retired) as remaining_visible_items,
  (select count(*) from eligible_refunds) as refundable_purchases,
  (select count(distinct user_id) from eligible_refunds) as users_to_refund,
  (select coalesce(sum(paid), 0) from eligible_refunds) as total_credits_to_refund;
-- Review which listings would be retired:
-- Reuse the ranked/retired CTE above and SELECT kind, slug, name, price FROM retired ORDER BY kind, slug.
