-- 0025: expand the cosmetics catalogue — new profile themes, banners, avatar
-- frames and effects to match the expanded rendering catalogs. Idempotent.

insert into public.shop_items (slug, name, description, kind, price, rarity, preview, sort_weight, staff_only) values
  -- profile themes
  ('theme-aurora', 'Aurora Theme', 'A shimmering aurora backdrop for your profile.', 'profile_theme', 800, 'epic', '{"colors":["#22d3ee","#a855f7","#f472b6"],"icon":"sparkles"}', 50, false),
  ('theme-sunset', 'Sunset Theme', 'Warm dusk gradient across your profile.', 'profile_theme', 400, 'rare', '{"colors":["#f59e0b","#ef4444","#7c3aed"],"icon":"sunset"}', 49, false),
  ('theme-ocean', 'Ocean Theme', 'Deep blue ocean gradient.', 'profile_theme', 400, 'rare', '{"colors":["#0ea5e9","#2563eb","#1e1b4b"],"icon":"waves"}', 48, false),
  ('theme-rose-gold', 'Rose Gold Theme', 'Soft rose-gold sheen.', 'profile_theme', 400, 'rare', '{"colors":["#fda4af","#f59e0b"],"icon":"gem"}', 47, false),
  ('theme-midnight', 'Midnight Theme', 'A calm midnight sky.', 'profile_theme', 150, 'common', '{"colors":["#1e3a8a","#0f172a"],"icon":"moon"}', 46, false),
  -- banners
  ('banner-nebula', 'Nebula Banner', 'A swirling deep-space nebula.', 'banner', 800, 'epic', '{"colors":["#7c3aed","#1e1b4b","#020617"],"icon":"sparkles"}', 45, false),
  ('banner-emerald-tide', 'Emerald Tide Banner', 'Cool emerald-to-cyan wash.', 'banner', 400, 'rare', '{"colors":["#059669","#0ea5e9"],"icon":"waves"}', 44, false),
  ('banner-candy', 'Candy Banner', 'Sweet pastel gradient.', 'banner', 400, 'rare', '{"colors":["#f472b6","#c084fc","#22d3ee"],"icon":"candy"}', 43, false),
  ('banner-molten', 'Molten Banner', 'Fiery molten gradient.', 'banner', 800, 'epic', '{"colors":["#b91c1c","#f97316","#fbbf24"],"icon":"flame"}', 42, false),
  -- avatar frames
  ('frame-rainbow', 'Rainbow Frame', 'A glowing rainbow ring.', 'avatar_frame', 1500, 'legendary', '{"colors":["#f472b6","#a855f7"],"icon":"sparkles"}', 41, false),
  ('frame-shadow', 'Shadow Frame', 'A sleek dark ring.', 'avatar_frame', 150, 'common', '{"colors":["#334155","#0f172a"],"icon":"circle"}', 40, false),
  ('frame-royal', 'Royal Frame', 'Gold-and-violet royalty.', 'avatar_frame', 800, 'epic', '{"colors":["#f59e0b","#7c3aed"],"icon":"crown"}', 39, false),
  ('frame-toxic', 'Toxic Frame', 'A radioactive green glow.', 'avatar_frame', 400, 'rare', '{"colors":["#84cc16","#22c55e"],"icon":"biohazard"}', 38, false),
  -- effects
  ('effect-aurora', 'Aurora Effect', 'Drifting aurora light on your banner.', 'effect', 800, 'epic', '{"colors":["#22d3ee","#a855f7"],"icon":"sparkles"}', 37, false),
  ('effect-fireflies', 'Fireflies Effect', 'Gentle floating fireflies.', 'effect', 400, 'rare', '{"colors":["#fcd34d","#f59e0b"],"icon":"bug"}', 36, false),
  -- staff-only
  ('frame-dev-aura', 'Developer Aura', 'A shifting aura reserved for the dev team.', 'avatar_frame', 0, 'legendary', '{"colors":["#22d3ee","#7c3aed"],"icon":"code"}', 100, true)
on conflict (slug) do nothing;
