-- 0063_noughts_and_crosses.sql
--
-- Renames Tic-Tac-Toe to Noughts and Crosses. The rest of the site is written
-- in British English ("customise", "colour"), so this title has been the odd
-- one out since it was seeded in 0005.
--
-- The slug deliberately stays `tictactoe`. It is the join key for every score,
-- leaderboard row, play session and favourite, it is baked into the party
-- protocol's game identifiers, and it is what shared links point at - so
-- renaming it would break all of that to change a string nobody sees.

update public.games
set title = 'Noughts and Crosses'
where slug = 'tictactoe';
