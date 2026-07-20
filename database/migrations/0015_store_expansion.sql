-- 0015_store_expansion.sql
-- Living economy & events — bigger store.
--
-- Adds a fresh batch of cosmetics: nameplates, avatar frames and profile
-- effects. Each has matching front-end rendering (nameplate/frame style maps
-- and the ProfileEffects renderer).

insert into public.shop_items (slug, name, description, kind, price, rarity, preview, seasonal, sort_weight, staff_only) values
  -- nameplates
  ('nameplate-mono', 'Monochrome', 'A sleek slate-to-black nameplate.', 'nameplate', 200, 'common', '{"colors":["#334155","#0f172a"]}', false, 86, false),
  ('nameplate-bubblegum', 'Bubblegum', 'A soft pink pop nameplate.', 'nameplate', 400, 'rare', '{"colors":["#f472b6","#f9a8d4"]}', false, 85, false),
  ('nameplate-galaxy', 'Galaxy', 'A deep-space nameplate with a cyan star.', 'nameplate', 900, 'epic', '{"colors":["#4c1d95","#1e1b4b","#0ea5e9"]}', false, 84, false),
  -- frames
  ('frame-emerald-ring', 'Emerald Ring', 'A crisp emerald ring for your avatar.', 'avatar_frame', 250, 'common', '{"colors":["#10b981","#059669"]}', false, 96, false),
  ('frame-frostbite', 'Frostbite', 'A chilled cyan aura frame.', 'avatar_frame', 500, 'rare', '{"colors":["#38bdf8","#22d3ee"]}', false, 95, false),
  -- effects
  ('effect-snow', 'Snowfall', 'Gentle snow drifts across your banner.', 'effect', 450, 'rare', '{"icon":"snowflake","colors":["#e0f2fe","#bae6fd"]}', false, 67, false),
  ('effect-embers', 'Embers', 'Glowing embers rise across your banner.', 'effect', 600, 'epic', '{"icon":"flame","colors":["#f97316","#ef4444"]}', false, 66, false)
on conflict (slug) do nothing;
