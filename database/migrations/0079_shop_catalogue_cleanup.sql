-- Shop catalogue reduction: retire approximately 80% of regular purchasable cosmetics.
-- Keeps every existing inventory item and equipped appearance intact.
-- Refunds the exact historical credits charged for purchased retired items,
-- including subsequent price changes, with one-time ledger-based idempotency.
-- Seasonal, staff-only, free and consumable boost items are not culled.
-- Review the candidate list and impact before running against production.

create table if not exists public.shop_catalogue_refunds (
  purchase_transaction_id bigint primary key references public.credit_transactions(id),
  user_id uuid not null references public.profiles(id),
  amount bigint not null check (amount > 0),
  processed_at timestamptz not null default now()
);
alter table public.shop_catalogue_refunds enable row level security;
-- No user-facing access: credit transaction history already exposes the refund.

do $$
declare
  v_purchase record;
  v_inserted integer;
  v_retired integer;
  v_refunds integer := 0;
  v_refund_total bigint := 0;
begin
  -- Serialize catalogue mutations against shop purchases during the migration.
  lock table public.shop_items in share row exclusive mode;
  lock table public.credit_transactions in share row exclusive mode;

  -- Keep the strongest ~20% *in each cosmetic kind*, so categories aren't
  -- accidentally wiped out. Do not rely on static slugs that may have changed.
  create temporary table _retired_shop_items on commit drop as
  with ranked as (
    select id, slug, kind, price,
      row_number() over (partition by kind order by sort_weight desc, price desc, slug) as rank_in_kind,
      count(*) over (partition by kind) as kind_count
    from public.shop_items
    where available = true and staff_only = false
      and seasonal = false and price > 0
      and kind not in ('xp_boost', 'credit_boost')
  )
  select id, slug, kind, price from ranked
  where rank_in_kind > greatest(1, ceil(kind_count * 0.20)::integer);

  select count(*) into v_retired from _retired_shop_items;

  -- Hiding the item, instead of deleting it, keeps inventory, gifts,
  -- collections, existing equips and past purchase history usable.
  update public.shop_items s set available = false
  from _retired_shop_items r where r.id = s.id;

  -- Refund only actual purchases. Gifted, achievement-granted, promotional
  -- and staff cosmetics have no purchase charge and earn no credit refund.
  -- A previous refund record prevents paying the same purchase twice.
  for v_purchase in
    select t.id, t.user_id, -t.amount as paid, t.ref_id as slug
    from public.credit_transactions t
    join _retired_shop_items r on r.slug = t.ref_id
    where t.reason = 'shop_purchase'
      and t.ref_type = 'shop_item'
      and t.amount < 0
      and not exists (
        select 1 from public.shop_catalogue_refunds rf
        where rf.purchase_transaction_id = t.id
      )
    order by t.id
  loop
    insert into public.shop_catalogue_refunds
      (purchase_transaction_id, user_id, amount)
    values (v_purchase.id, v_purchase.user_id, v_purchase.paid)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 1 then
      perform public.award_credits(
        v_purchase.user_id, v_purchase.paid, 'shop_refund',
        'shop_cull', v_purchase.slug,
        jsonb_build_object('purchase_transaction_id', v_purchase.id)
      );
      v_refunds := v_refunds + 1;
      v_refund_total := v_refund_total + v_purchase.paid;
    end if;
  end loop;

  raise notice 'Shop cull: % listings retired, % purchases refunded, % credits returned',
    v_retired, v_refunds, v_refund_total;
end;
$$;
