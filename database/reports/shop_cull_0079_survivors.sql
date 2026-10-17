-- Read-only preview: exactly which currently available items survive 0079.
-- Run before migration. The production catalogue can differ from seed files.
with retired as (
 select slug from public.shop_items where available and not staff_only and not seasonal and price > 0 and kind not in ('xp_boost','credit_boost') and slug not in ('frame-neon-ring','frame-violet-pulse','badge-champion','banner-nebula','trail-comet','deco-crown','deco-headphones','effect-matrix','effect-fireflies','entrance-glitch','nameplate-cyber','pframe-obsidian','pframe-prism','theme-deep-space','track-neon-drift')
)
select s.kind,s.slug,s.name,s.rarity,s.price,s.staff_only,s.seasonal,
  case when s.slug in (select slug from retired) then 'RETIRE' else 'KEEP' end as decision
from public.shop_items s
where s.available
order by decision desc,s.kind,s.sort_weight desc,s.slug;
