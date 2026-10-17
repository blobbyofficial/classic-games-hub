-- Make the existing Slithery engine available as Slither without creating a
-- duplicate game row or resetting favourites, scores or play history.
-- Preserve the original slug and engine_id for backwards compatibility.
update public.games
set title = 'Slither',
    tagline = 'Grow. Outmanoeuvre. Survive.',
    description = 'Steer your snake through an open arena, collect glowing pellets, avoid rival snakes and grow as long as you can. Rival snakes are computer-controlled.',
    how_to_play = 'Move your mouse, drag on the arena, or use WASD / arrow keys to steer. Hold mouse click, touch or Space to boost; boosting consumes length. Collect pellets to grow and avoid collisions with other snakes and the arena boundary.',
    controls = '[{"keys":"Mouse / touch drag / WASD / arrows","action":"Steer"},{"keys":"Hold click / touch / Space","action":"Boost (consumes length)"},{"keys":"P","action":"Pause"},{"keys":"R","action":"Restart after game over"}]'::jsonb,
    status = 'published',
    early_access_until = null
where slug = 'slithery'
  and engine_id = 'slithery';
