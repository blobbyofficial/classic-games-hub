-- Read-only preview: exactly which currently available items survive 0079.
-- Run before migration. The production catalogue can differ from seed files.
with ranked as (
 select slug,name,kind,rarity,price,sort_weight,staff_only,seasonal,
 row_number() over (partition by kind order by sort_weight desc,price desc,slug) as rank_in_kind,
 count(*) over (partition by kind) as kind_count
 from public.shop_items
 where available and not staff_only and not seasonal and price > 0
 and kind not in ('xp_boost','credit_boost')
), retired as (
 select slug from ranked
 where rank_in_kind > greatest(1,ceil(kind_count*0.20)::integer)
)
select s.kind,s.slug,s.name,s.rarity,s.price,s.staff_only,s.seasonal,
  case when s.slug in (select slug from retired) then 'RETIRE' else 'KEEP' end as decision
from public.shop_items s
where s.available
order by decision desc,s.kind,s.sort_weight desc,s.slug;
