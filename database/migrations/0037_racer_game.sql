-- 0037_racer_game.sql
-- Roadmap v1.4 "New Dimensions" — first pseudo-3D title: Turbo Horizon,
-- an OutRun-style perspective racer (engine: lib/games/engines/racer.ts).

insert into public.games
  (slug, title, tagline, description, how_to_play, category, tags, controls, engine_id,
   thumbnail_url, featured, sort_weight, difficulty, max_score, credit_divisor, max_credits_per_session)
values
  ('racer', 'Turbo Horizon', 'Chase the sunset',
   'A pseudo-3D arcade racer in the classic OutRun mould: a winding, hilly neon highway, traffic to slip past and a sun that never quite sets. Stay on the tarmac, thread the gaps and let the speed build.',
   'Steer with the left/right arrow keys or A/D — or hold the left/right half of the screen on touch. Your car accelerates automatically; running off-road scrubs speed and hitting traffic ends the run. Overtakes are worth big bonus points. Press R (or tap after a crash) to restart.',
   'Arcade', array['racing','3d','reflex'],
   '[{"keys":"Left / Right or A / D","action":"Steer"},{"keys":"Hold screen halves","action":"Steer (touch)"},{"keys":"R","action":"Restart"}]'::jsonb,
   'racer', '/games/thumbs/racer.svg', true, 86, 'normal', 100000, 80, 25)
on conflict (slug) do nothing;
