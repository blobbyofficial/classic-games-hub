-- ═══════════════════════════════════════════════════════════════════════════
-- Classic Games Hub — 0005 seed data
-- 23-game catalog, achievements, shop cosmetics, feature flags
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.games
  (slug, title, tagline, description, how_to_play, category, tags, controls, engine_id,
   thumbnail_url, featured, sort_weight, difficulty, max_score, credit_divisor, max_credits_per_session)
values
  ('snake', 'Snake', 'The endless chase',
   'Guide a growing snake around a wrap-around board, eat food, and survive as long as you can without biting yourself.',
   'Steer with the arrow keys or WASD. Every snack makes you longer and faster. Crossing an edge wraps you to the other side — crossing your own tail ends the run.',
   'Arcade', array['classic','survival','reflex'],
   '[{"keys":"Arrow keys / WASD","action":"Steer"},{"keys":"P","action":"Pause"},{"keys":"R","action":"Restart"}]'::jsonb,
   'snake', '/games/thumbs/snake.svg', true, 100, 'easy', 10000, 20, 25),

  ('slithery', 'Slithery', 'The serpentine challenge',
   'A modern twist on the classic Snake formula. Navigate a growing snake through a maze of obstacles and power-ups.',
   'Steer with the arrow keys or WASD. Collect power-ups to gain special abilities. Avoid obstacles and your own tail to survive as long as possible.',
   'Arcade', array['modern','survival','reflex'],
   '[{"keys":"Arrow keys / WASD","action":"Steer"},{"keys":"P","action":"Pause"},{"keys":"R","action":"Restart"}]'::jsonb,
   'slithery', '/games/thumbs/slithery.svg', true, 101, 'medium', 15000, 30, 25),

  ('tetris', 'Tetris', 'Stack. Clear. Repeat.',
   'The timeless falling-block puzzle. Rotate and place tetrominoes to clear lines as the pace relentlessly climbs.',
   'Move with the arrow keys, rotate with Up, soft-drop with Down and hard-drop with Space. Clear multiple lines at once for big bonuses.',
   'Puzzle', array['classic','blocks','endless'],
   '[{"keys":"Left / Right","action":"Move"},{"keys":"Up","action":"Rotate"},{"keys":"Down","action":"Soft drop"},{"keys":"Space","action":"Hard drop"},{"keys":"P","action":"Pause"}]'::jsonb,
   'tetris', '/games/thumbs/tetris.svg', true, 99, 'normal', 999999, 250, 25),

  ('2048', '2048', 'Merge to the impossible tile',
   'Slide numbered tiles across a 4×4 grid, merging equal pairs into ever-bigger powers of two without locking the board.',
   'Use the arrow keys to slide every tile at once. Equal tiles that collide merge. Keep an escape lane open — the board fills fast.',
   'Puzzle', array['numbers','merge','strategy'],
   '[{"keys":"Arrow keys / WASD","action":"Slide tiles"},{"keys":"R","action":"Restart"}]'::jsonb,
   '2048', '/games/thumbs/2048.svg', true, 98, 'normal', 400000, 300, 25),

  ('breakout', 'Breakout', 'Brick by brick',
   'Bounce a ball off your paddle to demolish a wall of bricks. Clear the field to advance to faster, tougher layouts.',
   'Move the paddle with the mouse or arrow keys. Do not let the ball fall. The edge of the paddle adds spin — use it to aim.',
   'Arcade', array['classic','paddle','reflex'],
   '[{"keys":"Mouse / Left-Right","action":"Move paddle"},{"keys":"Space","action":"Launch"},{"keys":"P","action":"Pause"}]'::jsonb,
   'breakout', '/games/thumbs/breakout.svg', true, 97, 'normal', 20000, 60, 25),

  ('pong', 'Pong', 'The one that started it all',
   'The original video game. Outlast a sharpening AI paddle in first-to-seven table tennis.',
   'Move your paddle with the mouse or Up/Down keys. Score by getting the ball past the AI. First to 7 points wins the match.',
   'Arcade', array['classic','versus','paddle'],
   '[{"keys":"Mouse / Up-Down","action":"Move paddle"},{"keys":"P","action":"Pause"}]'::jsonb,
   'pong', '/games/thumbs/pong.svg', false, 90, 'easy', 2000, 25, 20),

  ('asteroids', 'Asteroids', 'Nowhere to hide in deep space',
   'Rotate, thrust and shoot drifting rocks that split into faster fragments, in the vector-graphics arcade legend.',
   'Rotate with Left/Right, thrust with Up, fire with Space. Big rocks split into smaller, faster ones. The field wraps at every edge.',
   'Shooter', array['classic','space','physics'],
   '[{"keys":"Left / Right","action":"Rotate"},{"keys":"Up","action":"Thrust"},{"keys":"Space","action":"Fire"},{"keys":"P","action":"Pause"}]'::jsonb,
   'asteroids', '/games/thumbs/asteroids.svg', true, 96, 'hard', 50000, 80, 25),

  ('invaders', 'Space Invaders', 'Hold the line',
   'An alien armada descends in formation. Pick them off from behind your barricades before they reach the ground.',
   'Move with Left/Right and fire with Space. The swarm speeds up as it thins. Waves get lower and meaner each round.',
   'Shooter', array['classic','space','waves'],
   '[{"keys":"Left / Right","action":"Move"},{"keys":"Space","action":"Fire"},{"keys":"P","action":"Pause"}]'::jsonb,
   'invaders', '/games/thumbs/invaders.svg', false, 89, 'normal', 50000, 80, 25),

  ('frogger', 'Frogger', 'Look both ways',
   'Hop a fearless frog through rush-hour traffic and across a river of drifting logs to reach the lily pads.',
   'Hop one tile at a time with the arrow keys. Dodge cars, ride logs, and never touch the water. Each frog home scores big.',
   'Arcade', array['classic','dodge','timing'],
   '[{"keys":"Arrow keys","action":"Hop"},{"keys":"P","action":"Pause"}]'::jsonb,
   'frogger', '/games/thumbs/frogger.svg', false, 88, 'normal', 20000, 60, 25),

  ('runner', 'Neon Runner', 'Do not stop',
   'An endless neon dash. Jump and slide through an accelerating obstacle course where one mistake ends the run.',
   'Jump with Space or Up, slide with Down. Obstacles come faster the longer you survive. Distance is score.',
   'Arcade', array['endless','runner','reflex'],
   '[{"keys":"Space / Up","action":"Jump"},{"keys":"Down","action":"Slide"},{"keys":"P","action":"Pause"}]'::jsonb,
   'runner', '/games/thumbs/runner.svg', false, 87, 'normal', 50000, 60, 25),

  ('target', 'Target Rush', 'Aim fast, click faster',
   'A pure aim trainer. Shrinking targets appear in bursts — hit them before they vanish and chain combos for multipliers.',
   'Click targets before they disappear. Consecutive hits build a combo multiplier; misses reset it. 60 seconds on the clock.',
   'Shooter', array['aim','timed','precision'],
   '[{"keys":"Mouse","action":"Aim & shoot"}]'::jsonb,
   'target', '/games/thumbs/target.svg', false, 86, 'easy', 30000, 60, 20),

  ('match3', 'Gem Cascade', 'Line up the sparkle',
   'Swap adjacent gems to line up three or more, and chase chain reactions in a 90-second score attack.',
   'Click or drag two adjacent gems to swap them. Matches of 3+ clear and refill the board — cascades multiply your score.',
   'Puzzle', array['match-3','timed','casual'],
   '[{"keys":"Mouse / Touch","action":"Swap gems"}]'::jsonb,
   'match3', '/games/thumbs/match3.svg', true, 95, 'easy', 30000, 60, 25),

  ('bubble', 'Bubble Pop', 'Clear the ceiling',
   'Aim and fire colored bubbles to form clusters of three or more before the ceiling grinds down on you.',
   'Aim with the mouse and click to fire. Match 3+ of a color to pop them — bubbles left hanging fall for bonus points.',
   'Puzzle', array['aim','match','casual'],
   '[{"keys":"Mouse","action":"Aim & fire"},{"keys":"P","action":"Pause"}]'::jsonb,
   'bubble', '/games/thumbs/bubble.svg', false, 85, 'easy', 30000, 60, 25),

  ('mines', 'Minesweeper', 'One wrong step',
   'The classic logic minefield. Use the number clues to flag every mine and clear the board without a single misstep.',
   'Left-click to reveal a tile, right-click to flag a suspected mine. Numbers count adjacent mines. Clear all safe tiles to win.',
   'Puzzle', array['logic','classic','deduction'],
   '[{"keys":"Left click","action":"Reveal"},{"keys":"Right click","action":"Flag"}]'::jsonb,
   'mines', '/games/thumbs/mines.svg', false, 84, 'normal', 10000, 40, 20),

  ('memory', 'Memory Match', 'Trust your brain',
   'Flip cards two at a time and clear the whole board by remembering where every symbol hides.',
   'Click cards to flip them. Match identical pairs to keep them face-up. Fewer moves and faster times score higher.',
   'Puzzle', array['memory','casual','pairs'],
   '[{"keys":"Mouse / Touch","action":"Flip cards"}]'::jsonb,
   'memory', '/games/thumbs/memory.svg', false, 83, 'easy', 10000, 40, 20),

  ('slide', '15 Puzzle', 'Order from chaos',
   'Slide numbered tiles around a single gap to restore the grid to perfect order in as few moves as possible.',
   'Click a tile next to the gap (or use arrow keys) to slide it. Arrange 1-15 in order. Fewer moves, better score.',
   'Puzzle', array['classic','sliding','logic'],
   '[{"keys":"Mouse / Arrow keys","action":"Slide tiles"},{"keys":"R","action":"Shuffle"}]'::jsonb,
   'slide', '/games/thumbs/slide.svg', false, 82, 'normal', 10000, 40, 20),

  ('mastermind', 'Mastermind', 'Crack the code',
   'Deduce a hidden four-color code in ten guesses, guided only by pegs that score each attempt.',
   'Build a guess from the color palette and submit it. A filled peg means right color, right spot; a hollow peg means right color, wrong spot.',
   'Strategy', array['logic','deduction','code'],
   '[{"keys":"Mouse","action":"Pick colors"},{"keys":"Enter","action":"Submit guess"}]'::jsonb,
   'mastermind', '/games/thumbs/mastermind.svg', false, 81, 'normal', 10000, 40, 20),

  ('hangman', 'Hangman', 'Letter by letter',
   'Guess the hidden word one letter at a time before the gallows drawing is complete. Arcade-themed word list included.',
   'Type or click letters to guess. Each wrong letter adds a piece to the drawing — eight mistakes and the word wins.',
   'Puzzle', array['words','classic','guessing'],
   '[{"keys":"A-Z","action":"Guess a letter"}]'::jsonb,
   'hangman', '/games/thumbs/hangman.svg', false, 80, 'easy', 10000, 40, 20),

  ('simon', 'Simon', 'Watch. Remember. Repeat.',
   'Repeat an ever-growing sequence of lights and tones. One wrong note and the round is over.',
   'Watch the panels light up, then click them back in the same order. Every round adds one more step to the sequence.',
   'Arcade', array['memory','audio','sequence'],
   '[{"keys":"Mouse / 1-4","action":"Press panels"}]'::jsonb,
   'simon', '/games/thumbs/simon.svg', false, 79, 'easy', 10000, 40, 20),

  ('tictactoe', 'Tic-Tac-Toe', 'Three in a row',
   'The playground classic against a clever AI. Take the center, set traps and never let it fork you.',
   'Click any empty cell to place your X. Beat the AI by making three in a row — it plays a mean minimax game.',
   'Strategy', array['board','vs-ai','classic'],
   '[{"keys":"Mouse / Touch","action":"Place mark"}]'::jsonb,
   'tictactoe', '/games/thumbs/tictactoe.svg', false, 78, 'easy', 5000, 30, 15),

  ('connect4', 'Connect Four', 'Drop and trap',
   'Drop discs into a seven-column grid and out-think the AI to line up four before it does.',
   'Click a column to drop your disc. Connect four in any direction — across, down or diagonally — to win the round.',
   'Strategy', array['board','vs-ai','classic'],
   '[{"keys":"Mouse / 1-7","action":"Drop disc"}]'::jsonb,
   'connect4', '/games/thumbs/connect4.svg', false, 77, 'normal', 5000, 30, 15),

  ('reversi', 'Reversi', 'Flip the board',
   'Sandwich enemy discs to flip them to your color, and own the board when the last square fills.',
   'Click a square that brackets enemy discs between yours — they all flip. Corners are gold. Most discs at the end wins.',
   'Strategy', array['board','vs-ai','territory'],
   '[{"keys":"Mouse / Touch","action":"Place disc"}]'::jsonb,
   'reversi', '/games/thumbs/reversi.svg', false, 76, 'hard', 5000, 30, 15),

  ('whack', 'Whack-a-Mole', 'Fastest mallet wins',
   'Moles pop out faster and faster for 45 frantic seconds. Bonk everything that moves — except the decoys.',
   'Click moles the instant they appear. Golden moles are worth triple; bomb decoys cost you points. Speed ramps up hard.',
   'Arcade', array['reflex','timed','casual'],
   '[{"keys":"Mouse / Touch","action":"Whack"}]'::jsonb,
   'whack', '/games/thumbs/whack.svg', false, 75, 'easy', 20000, 50, 20),

  ('lightsout', 'Lights Out', 'Total darkness, please',
   'Every press toggles a light and its neighbors. Extinguish the whole grid in as few moves as you can.',
   'Click a cell to toggle it and its four neighbors. Turn every light off to win. Fewer moves means a higher score.',
   'Puzzle', array['logic','toggle','minimal'],
   '[{"keys":"Mouse / Touch","action":"Toggle lights"},{"keys":"R","action":"New puzzle"}]'::jsonb,
   'lightsout', '/games/thumbs/lightsout.svg', false, 74, 'normal', 10000, 40, 20);

-- ── achievements ────────────────────────────────────────────────────────────
insert into public.achievements (slug, name, description, icon, category, xp_reward, credits_reward, secret, requirement) values
  ('first-play', 'Insert Coin', 'Play your first game.', 'gamepad-2', 'plays', 25, 20, false, '{"type":"total_plays","target":1}'),
  ('plays-10', 'Regular', 'Play 10 games.', 'gamepad-2', 'plays', 50, 30, false, '{"type":"total_plays","target":10}'),
  ('plays-50', 'Arcade Rat', 'Play 50 games.', 'joystick', 'plays', 100, 60, false, '{"type":"total_plays","target":50}'),
  ('plays-250', 'Cabinet Legend', 'Play 250 games.', 'crown', 'plays', 250, 150, false, '{"type":"total_plays","target":250}'),
  ('explorer-5', 'Explorer', 'Play 5 different games.', 'compass', 'variety', 50, 30, false, '{"type":"distinct_games","target":5}'),
  ('explorer-12', 'Connoisseur', 'Play 12 different games.', 'map', 'variety', 100, 60, false, '{"type":"distinct_games","target":12}'),
  ('explorer-all', 'Completionist', 'Play every game on the platform.', 'trophy', 'variety', 300, 200, false, '{"type":"distinct_games","target":23}'),
  ('level-5', 'Warming Up', 'Reach level 5.', 'trending-up', 'levels', 75, 50, false, '{"type":"level","target":5}'),
  ('level-10', 'Seasoned', 'Reach level 10.', 'flame', 'levels', 150, 100, false, '{"type":"level","target":10}'),
  ('level-25', 'Arcade Veteran', 'Reach level 25.', 'award', 'levels', 400, 300, false, '{"type":"level","target":25}'),
  ('friend-1', 'Player Two', 'Make your first friend.', 'users', 'social', 40, 25, false, '{"type":"friends","target":1}'),
  ('friend-5', 'Party Up', 'Have 5 friends.', 'users', 'social', 80, 50, false, '{"type":"friends","target":5}'),
  ('friend-15', 'Community Pillar', 'Have 15 friends.', 'heart-handshake', 'social', 150, 100, false, '{"type":"friends","target":15}'),
  ('streak-3', 'Habit Forming', 'Claim daily rewards 3 days in a row.', 'calendar-check', 'daily', 50, 40, false, '{"type":"daily_streak","target":3}'),
  ('streak-7', 'One Full Week', 'Claim daily rewards 7 days in a row.', 'calendar-heart', 'daily', 120, 80, false, '{"type":"daily_streak","target":7}'),
  ('streak-30', 'Iron Discipline', 'Claim daily rewards 30 days in a row.', 'medal', 'daily', 500, 400, false, '{"type":"daily_streak","target":30}'),
  ('rich-1k', 'Coin Purse', 'Earn 1,000 credits in total.', 'coins', 'economy', 60, 40, false, '{"type":"credits_earned","target":1000}'),
  ('rich-10k', 'High Roller', 'Earn 10,000 credits in total.', 'gem', 'economy', 200, 150, false, '{"type":"credits_earned","target":10000}'),
  ('collector-5', 'Collector', 'Own 5 items from the shop.', 'shopping-bag', 'economy', 80, 0, false, '{"type":"items_owned","target":5}'),
  ('snake-500', 'Serpent King', 'Score 500+ in Snake.', 'worm', 'mastery', 100, 75, false, '{"type":"game_score","game":"snake","target":500}'),
  ('tetris-10k', 'Line Machine', 'Score 10,000+ in Tetris.', 'layout-grid', 'mastery', 150, 100, false, '{"type":"game_score","game":"tetris","target":10000}'),
  ('2048-win', 'Power of Two', 'Score 20,000+ in 2048.', 'grid-2x2', 'mastery', 150, 100, false, '{"type":"game_score","game":"2048","target":20000}'),
  ('sharpshooter', 'Sharpshooter', 'Score 5,000+ in Target Rush.', 'crosshair', 'mastery', 120, 80, true, '{"type":"game_score","game":"target","target":5000}');

-- ── shop catalog ────────────────────────────────────────────────────────────
insert into public.shop_items (slug, name, description, kind, price, rarity, preview, seasonal, sort_weight) values
  ('frame-neon-ring', 'Neon Ring', 'A cyan glow that circles your avatar.', 'avatar_frame', 250, 'common', '{"colors":["#22d3ee","#0ea5e9"]}', false, 100),
  ('frame-violet-pulse', 'Violet Pulse', 'A pulsing violet aura frame.', 'avatar_frame', 400, 'rare', '{"colors":["#8b5cf6","#d946ef"]}', false, 99),
  ('frame-gold-laurel', 'Gold Laurel', 'A gilded laurel for proven champions.', 'avatar_frame', 900, 'epic', '{"colors":["#f59e0b","#fbbf24"]}', false, 98),
  ('frame-pixel-fire', 'Pixel Fire', 'Animated 8-bit flames lick your avatar.', 'avatar_frame', 1500, 'legendary', '{"colors":["#f97316","#ef4444"]}', false, 97),
  ('theme-synthwave', 'Synthwave', 'Sunset gradients for your profile page.', 'profile_theme', 350, 'rare', '{"colors":["#f472b6","#8b5cf6","#312e81"]}', false, 90),
  ('theme-terminal', 'Terminal', 'Phosphor-green hacker aesthetics.', 'profile_theme', 350, 'rare', '{"colors":["#22c55e","#052e16"]}', false, 89),
  ('theme-deep-space', 'Deep Space', 'A star-flecked void for your profile.', 'profile_theme', 500, 'epic', '{"colors":["#312e81","#0f172a","#22d3ee"]}', false, 88),
  ('badge-og', 'OG Badge', 'You were here for the beginning.', 'badge', 200, 'rare', '{"icon":"sparkles","colors":["#fbbf24"]}', false, 80),
  ('badge-night-owl', 'Night Owl', 'For players who never sleep.', 'badge', 150, 'common', '{"icon":"moon","colors":["#8b5cf6"]}', false, 79),
  ('badge-speedrunner', 'Speedrunner', 'Gotta go fast.', 'badge', 300, 'rare', '{"icon":"zap","colors":["#22d3ee"]}', false, 78),
  ('badge-strategist', 'Strategist', 'Ten moves ahead, always.', 'badge', 300, 'rare', '{"icon":"brain","colors":["#34d399"]}', false, 77),
  ('effect-confetti', 'Confetti Burst', 'Confetti rains on your profile visits.', 'effect', 450, 'rare', '{"icon":"party-popper","colors":["#f472b6","#22d3ee","#fbbf24"]}', false, 70),
  ('effect-matrix', 'Code Rain', 'Falling glyphs across your banner.', 'effect', 600, 'epic', '{"icon":"binary","colors":["#22c55e"]}', false, 69),
  ('banner-arcade-floor', 'Arcade Floor', 'A neon-lit cabinet row banner.', 'banner', 300, 'common', '{"colors":["#312e81","#8b5cf6"]}', false, 60),
  ('banner-pixel-sunset', 'Pixel Sunset', 'A retro sun sinking into scanlines.', 'banner', 450, 'rare', '{"colors":["#f97316","#f472b6","#312e81"]}', false, 59),
  ('collectible-cartridge', 'Golden Cartridge', 'A shelf trophy for true collectors.', 'collectible', 800, 'epic', '{"icon":"save","colors":["#fbbf24"]}', false, 50),
  ('collectible-crt', 'Mini CRT', 'A tiny humming CRT for your shelf.', 'collectible', 500, 'rare', '{"icon":"tv","colors":["#8b5cf6"]}', false, 49),
  ('collectible-joystick', 'Chrome Joystick', 'Polished chrome, zero input lag.', 'collectible', 650, 'rare', '{"icon":"joystick","colors":["#94a3b8"]}', false, 48),
  ('boost-xp-24h', 'XP Boost (24h)', 'Double all XP from games for 24 hours.', 'xp_boost', 150, 'common', '{"icon":"rocket","colors":["#22d3ee"]}', false, 40),
  ('boost-credits-24h', 'Credit Boost (24h)', 'Double base credits from games for 24 hours.', 'credit_boost', 200, 'common', '{"icon":"coins","colors":["#fbbf24"]}', false, 39),
  ('frame-summer-wave', 'Summer Wave', 'Limited seasonal chrome-wave frame.', 'avatar_frame', 700, 'epic', '{"colors":["#22d3ee","#fbbf24"]}', true, 30),
  ('badge-summer-25', 'Summer ''26', 'Seasonal badge for Summer 2026.', 'badge', 250, 'rare', '{"icon":"sun","colors":["#fbbf24"]}', true, 29);

-- ── feature flags ───────────────────────────────────────────────────────────
insert into public.feature_flags (key, enabled, description) values
  ('rewarded_ads', true, 'Offer the optional "ads for 2x credits" program'),
  ('shop', true, 'Enable the credits shop'),
  ('messaging', true, 'Enable direct messages'),
  ('seasonal_event', false, 'Show the seasonal event banner'),
  ('maintenance_banner', false, 'Show a maintenance warning site-wide');

-- ── launch announcement ─────────────────────────────────────────────────────
insert into public.announcements (title, body, level, published)
values ('Welcome to the new Classic Games Hub',
        'The Hub has been rebuilt from the ground up: accounts, friends, messaging, credits, achievements, leaderboards and 23 playable classics. Have a look around — and claim your daily reward!',
        'update', true);
