-- 0040_close_public_execute_gap.sql
-- Fix an ineffective revoke in 0034.
--
-- Postgres grants EXECUTE to the PUBLIC pseudo-role by default when a
-- function is created, and every role (including anon) inherits privileges
-- granted to PUBLIC unless PUBLIC's own grant is also revoked. 0034 only ran
-- `revoke execute on function ... from anon`, which strips anon's own grant
-- but leaves anon still able to execute via the untouched PUBLIC grant — so
-- the five signed-in-only functions below stayed callable by anon the whole
-- time. Confirmed via has_function_privilege('anon', …) after 0034 landed.
--
-- The fix is `revoke ... from public`, which also revokes it for anon (anon
-- has no separate grant to lose). `authenticated` is unaffected — each of
-- these functions already holds its own explicit grant to `authenticated`,
-- independent of the PUBLIC grant being removed here.

revoke execute on function public.ensure_weekly_challenges() from public;
revoke execute on function public.friendship_status(uuid) from public;
revoke execute on function public.list_conversations() from public;
revoke execute on function public.list_friends() from public;
revoke execute on function public.list_friend_requests() from public;

-- Also pin search_path on two pure-math helpers flagged by the advisor
-- (function_search_path_mutable). They touch no tables, so this closes the
-- lint with zero behaviour change.
alter function public.discord_xp_for_level(int, int, int, int) set search_path = public;
alter function public.discord_level_for_xp(bigint, int, int, int) set search_path = public;
