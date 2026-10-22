-- Restore Slithery on databases where the initial catalog seed was not applied.
-- Idempotent: retain the existing game ID, scores, ratings, favourites and plays.
-- The client registry deliberately uses slug and engine_id 'slithery'.
insert into public.games (
  slug, title, tagline, description, how_to_play, category, tags,
  controls, engine_id, thumbnail_url, featured, sort_weight, difficulty,
  max_score, credit_divisor, max_credits_per_session, status, early_access_until
)
values (
  'slithery',
  'Slither',
  'Grow. Outmanoeuvre. Survive.',
  'Steer your snake through an open arena, collect glowing pellets, avoid rival snakes and grow as long as you can. Rival snakes are computer-controlled.',
  'Move your mouse, drag on the arena, or use WASD / arrow keys to steer. Hold mouse click, touch or Space to boost; boosting consumes length. Collect pellets to grow and avoid collisions with other snakes and the arena boundary.',
  'Arcade',
  array['modern', 'survival', 'reflex'],
  '[{"keys":"Mouse / touch drag / WASD / arrows","action":"Steer"},{"keys":"Hold click / touch / Space","action":"Boost (consumes length)"},{"keys":"P","action":"Pause"},{"keys":"R","action":"Restart after game over"}]'::jsonb,
  'slithery',
  '/games/thumbs/slithery.svg',
  true,
  101,
  'normal',
  15000,
  30,
  25,
  'published',
  null
)
on conflict (slug) do update set
  title = excluded.title,
  tagline = excluded.tagline,
  description = excluded.description,
  how_to_play = excluded.how_to_play,
  category = excluded.category,
  tags = excluded.tags,
  controls = excluded.controls,
  engine_id = excluded.engine_id,
  thumbnail_url = excluded.thumbnail_url,
  status = 'published',
  early_access_until = null;
