-- 0058_rubiks_cube.sql
-- Roadmap v1.5.0 "More 3D titles": a playable 3x3 Rubik's cube
-- (engine: lib/games/engines/rubiks.ts).
--
-- Software-rendered on a 2D canvas rather than through a 3D library, for the
-- same reason the rest of the arcade is: 54 stickers is cheap to transform by
-- hand, and a WebGL runtime would cost more than every other engine combined.
--
-- Economy sits alongside Lights Out, the closest existing game: a puzzle with
-- no fail state, where the score falls with the move count and the clock. A
-- solve tops out near 8000, so credit_divisor 40 pays a good solve roughly
-- what a good Lights Out board does.

insert into public.games
  (slug, title, tagline, description, how_to_play, category, tags, controls, engine_id,
   thumbnail_url, featured, sort_weight, difficulty, max_score, credit_divisor, max_credits_per_session)
values
  ('rubiks', 'Cube', 'Six faces, one colour each',
   'The classic 3x3 twisty puzzle, playable in the browser. Drag a sticker to turn its layer, drag the background to look around, and work the whole thing back to six solid faces. Scored on moves and time, so a tidy solve beats a lucky one.',
   'Drag any sticker in the direction you want it to travel and that layer turns. Drag the background (or anywhere off the cube) to orbit the view. On a keyboard, the standard letters turn a face clockwise - U, D, L, R, F, B - and holding Shift turns it the other way. Press R for a fresh scramble. Fewer moves and less time means a higher score.',
   'Puzzle', array['3d','logic','classic'],
   '[{"keys":"Drag a sticker","action":"Turn that layer"},{"keys":"Drag the background","action":"Orbit the cube"},{"keys":"U / D / L / R / F / B","action":"Turn a face clockwise"},{"keys":"Shift + letter","action":"Turn a face anticlockwise"},{"keys":"R","action":"New scramble"}]'::jsonb,
   'rubiks', '/games/thumbs/rubiks.svg', true, 85, 'hard', 8000, 40, 20)
on conflict (slug) do nothing;
