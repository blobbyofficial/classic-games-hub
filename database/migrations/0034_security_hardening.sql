-- 0034_security_hardening.sql
-- Follow-ups from the Supabase security advisor (July 2026 audit).
--
-- Principle: SECURITY DEFINER functions should be callable only by the roles
-- that actually need them. The user-facing RPCs (submit_score, follow_user, …)
-- intentionally remain executable by `authenticated` — they check auth.uid()
-- internally. `is_admin`/`is_staff` intentionally remain executable by `anon`
-- because RLS policies evaluate them as the querying role.
--
-- NOT changed here, with reasons:
--   * citext lives in the public schema (advisor: extension_in_public).
--     Moving an extension that types live columns (profiles.username) requires
--     a rebuild; the risk of breaking auth flows outweighs the linter tidy-up.
--   * Leaked-password protection is a Dashboard toggle (Auth → Passwords),
--     not SQL — enable "Prevent use of compromised passwords" manually.

-- Trigger functions: never legitimately callable via the API surface.
revoke execute on function public.grant_admin_friend_badge() from public, anon, authenticated;
revoke execute on function public.sync_discord_linked() from public, anon, authenticated;

-- Challenge generation is invoked internally by SECURITY DEFINER game-loop
-- functions; nobody should call it straight from PostgREST while signed out.
revoke execute on function public.ensure_weekly_challenges() from anon;
revoke execute on function public.ensure_daily_challenges() from anon;

-- Signed-in-only reads that are meaningless (or empty) for anon — remove the
-- anonymous surface entirely.
revoke execute on function public.friendship_status(uuid) from anon;
revoke execute on function public.list_conversations() from anon;
revoke execute on function public.list_friends() from anon;
revoke execute on function public.list_friend_requests() from anon;
