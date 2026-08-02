-- 0060_labyrinth.sql
-- Roadmap v1.5.0 "True 3D titles": Labyrinth, a first-person maze
-- (engine: lib/games/engines/maze3d.ts, renderer: lib/games/engine3d.ts).
--
-- The first title with the camera inside the scene rather than looking at it.
-- Turbo Horizon faked depth with scanline scaling and Cube rendered a solid
-- object from outside; this one needs a real pipeline - near-plane clipping,
-- world-fixed lighting, fog - which now lives in a shared renderer so the next
-- 3D title starts from something rather than from trigonometry. Still canvas
-- 2D, still no WebGL dependency.
--
-- A run is three mazes of rising size and there is no fail state, so scoring
-- is time-based like the other puzzles: each maze pays up to 4000, falling 45
-- a second, giving a realistic ceiling near 11000 against a 12000 cap.

insert into public.games
  (slug, title, tagline, description, how_to_play, category, tags, controls, engine_id,
   thumbnail_url, featured, sort_weight, difficulty, max_score, credit_divisor, max_credits_per_session)
values
  ('labyrinth', 'Labyrinth', 'Three mazes, no map',
   'A first-person maze in real 3D. Corridors you cannot see round, walls that light properly as you turn, and a green post marking the way out. Three mazes to a run, each bigger than the last, with a map that fills itself in only where you have actually been.',
   'On a keyboard: W and S walk, A and D step sideways, the left and right arrows turn, and dragging with the mouse looks around. On touch, drag on the left half of the screen to walk and on the right half to look. Reach the glowing green post to clear a maze; clear all three to finish the run. Faster is worth more. Press R to start again.',
   'Puzzle', array['3d','maze','first-person'],
   '[{"keys":"W / S","action":"Walk"},{"keys":"A / D","action":"Step sideways"},{"keys":"Left / Right","action":"Turn"},{"keys":"Drag","action":"Look around"},{"keys":"Drag left half","action":"Walk (touch)"},{"keys":"Drag right half","action":"Look (touch)"},{"keys":"R","action":"New run"}]'::jsonb,
   'maze3d', '/games/thumbs/labyrinth.svg', true, 87, 'normal', 12000, 60, 25)
on conflict (slug) do nothing;
