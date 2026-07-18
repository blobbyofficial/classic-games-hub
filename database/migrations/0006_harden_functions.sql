-- ═══════════════════════════════════════════════════════════════════════════
-- Classic Games Hub — 0006 harden function execution
--
-- By default Postgres grants EXECUTE on new functions to PUBLIC. That would let
-- any authenticated client call internal reward helpers (award_credits, add_xp,
-- bump_challenge_progress, …) directly and mint credits/XP. We revoke EXECUTE
-- from everyone and grant it back only to the intended surfaces:
--   • RLS helper predicates → anon + authenticated (policies evaluate them)
--   • player RPC entrypoints → authenticated only
-- Triggers run as the table owner, so they need no role grant at all.
-- ═══════════════════════════════════════════════════════════════════════════

-- Pin search_path on the two remaining mutable functions.
alter function public.touch_updated_at() set search_path = '';
alter function public.level_for_xp(bigint) set search_path = '';

-- Nuke the default PUBLIC/role EXECUTE grants.
revoke execute on all functions in schema public from public, anon, authenticated;

-- Predicates referenced by RLS policies must stay callable by querying roles.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.is_blocked_either_way(uuid, uuid) to authenticated;

-- Player-facing RPC entrypoints (each re-checks auth.uid()/role internally).
grant execute on function public.heartbeat() to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(bigint, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.claim_daily_reward() to authenticated;
grant execute on function public.claim_challenge(uuid) to authenticated;
grant execute on function public.purchase_shop_item(text) to authenticated;
grant execute on function public.equip_item(text) to authenticated;
grant execute on function public.unequip_item(text) to authenticated;
grant execute on function public.change_username(text) to authenticated;
grant execute on function public.submit_score(text, bigint, int) to authenticated;

-- Admin/staff RPCs (each starts with an is_admin()/is_staff() guard).
grant execute on function public.admin_adjust_credits(uuid, bigint, text) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;

-- Everything else — award_credits, add_xp, check_achievements,
-- bump_challenge_progress, ensure_daily_challenges, log_audit and all trigger
-- functions — remains EXECUTE-less for clients and reachable only from other
-- definer functions and triggers.
