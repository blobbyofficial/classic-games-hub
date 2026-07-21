-- 0030 (v1.2.2): pull the least-played games back to "coming soon" so the
-- weakest games leave the public "play now" shelf while they are rebuilt to a
-- higher quality bar, then republished.
update public.games
set status = 'coming_soon'
where slug in ('reversi','target','bubble','lightsout','slide','simon','tictactoe','connect4')
  and status = 'published';
