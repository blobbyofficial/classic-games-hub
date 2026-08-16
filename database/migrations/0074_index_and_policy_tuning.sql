-- 0074_index_and_policy_tuning.sql
--
-- Two things the Supabase linter has been saying for a while, and neither is a
-- behaviour change: every query that worked before this migration returns the
-- same rows after it. Only the plans get better.
--
-- 1. Thirty-three foreign keys with no covering index. Postgres does not index
--    the referencing side of a foreign key for you. Without one, every join
--    across that key is a sequential scan, and - the part that bites later -
--    every DELETE on the *referenced* table has to scan the whole referencing
--    table to check the constraint. Deleting one cosmetic item would scan all
--    of inventory_items, gift_tokens and wishlist_items.
--
-- 2. Ten RLS policies that call auth.uid() per row instead of once per query.
--    Postgres treats a bare auth.uid() in a policy as volatile and re-evaluates
--    it for every candidate row; wrapping it as (select auth.uid()) makes it an
--    InitPlan, evaluated once and reused. Same result, and the gap widens with
--    every row the table gains.
--
-- Both are cheap now and progressively less cheap to leave. The indexes take a
-- brief ACCESS EXCLUSIVE lock per table as they build; at current table sizes
-- that is milliseconds, which is why they are plain CREATE INDEX rather than
-- CONCURRENTLY (which cannot run inside a migration's transaction anyway).

-- ───────────────────── 1. Covering indexes for foreign keys ─────────────────
--
-- Named to the existing convention: <table>_<column>_idx. IF NOT EXISTS
-- throughout, so re-running this against a database where some were added by
-- hand is a no-op rather than an error.

-- Social graph and messaging - the hottest of these at read time.
create index if not exists messages_sender_idx
  on public.messages (sender_id);
create index if not exists message_reactions_user_idx
  on public.message_reactions (user_id);
create index if not exists message_streaks_user_a_idx
  on public.message_streaks (user_a);
create index if not exists message_streaks_user_b_idx
  on public.message_streaks (user_b);
create index if not exists conversations_owner_idx
  on public.conversations (owner_id);
create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id);
create index if not exists profile_views_viewer_idx
  on public.profile_views (viewer_id);

-- Parties. parties_game_slug_fkey matters for the games registry: deleting or
-- renaming a game currently scans every party ever created.
create index if not exists parties_leader_idx
  on public.parties (leader_id);
create index if not exists parties_game_slug_idx
  on public.parties (game_slug);

-- Economy and inventory. These are the DELETE-side scans described above:
-- every one of them points at shop_items.
create index if not exists inventory_items_item_idx
  on public.inventory_items (item_id);
create index if not exists wishlist_items_item_idx
  on public.wishlist_items (item_id);
create index if not exists gift_tokens_item_idx
  on public.gift_tokens (item_id);
create index if not exists gift_tokens_gifted_to_idx
  on public.gift_tokens (gifted_to);
create index if not exists booster_drops_item_idx
  on public.booster_drops (item_id);

-- Progression: challenges, collections, seasons, achievements.
create index if not exists challenge_progress_challenge_idx
  on public.challenge_progress (challenge_id);
create index if not exists collection_claims_collection_idx
  on public.collection_claims (collection_id);
create index if not exists collections_reward_item_idx
  on public.collections (reward_item_id);
create index if not exists season_claims_season_idx
  on public.season_claims (season_id);
create index if not exists season_tiers_reward_item_idx
  on public.season_tiers (reward_item_id);
create index if not exists user_achievements_achievement_idx
  on public.user_achievements (achievement_id);

-- Community events.
create index if not exists community_event_participants_user_idx
  on public.community_event_participants (user_id);
create index if not exists community_events_created_by_idx
  on public.community_events (created_by);

-- Moderation and admin. reports has three separate FKs to profiles and the
-- admin console filters on all three.
create index if not exists reports_reporter_idx
  on public.reports (reporter_id);
create index if not exists reports_target_user_idx
  on public.reports (target_user_id);
create index if not exists reports_resolved_by_idx
  on public.reports (resolved_by);
create index if not exists user_notes_target_idx
  on public.user_notes (target_id);
create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_id);
create index if not exists announcements_author_idx
  on public.announcements (author_id);

-- Status page authorship.
create index if not exists status_incidents_created_by_idx
  on public.status_incidents (created_by);
create index if not exists status_incident_updates_author_idx
  on public.status_incident_updates (author_id);
create index if not exists status_components_pinned_by_idx
  on public.status_components (pinned_by);
create index if not exists status_reports_user_idx
  on public.status_reports (user_id);

-- Discord linking.
create index if not exists discord_verifications_user_idx
  on public.discord_verifications (user_id);

-- ───────────────────── 2. auth.uid() as an InitPlan ─────────────────────────
--
-- ALTER POLICY rather than DROP + CREATE: the policy keeps its name, its
-- command and its roles, and there is no window mid-migration where the table
-- is readable without it. The predicates below are character-for-character the
-- existing ones with auth.uid() wrapped - deliberately not "improved" while
-- they are being touched, so this migration stays reviewable as a no-op.

alter policy discord_links_select_own on public.discord_links
  using ((select auth.uid()) = user_id);

alter policy user_boosts_select_own on public.user_boosts
  using ((select auth.uid()) = user_id);

alter policy community_event_participants_select_own on public.community_event_participants
  using ((select auth.uid()) = user_id);

alter policy message_streaks_select_members on public.message_streaks
  using (((select auth.uid()) = user_a) or ((select auth.uid()) = user_b));

alter policy loadout_presets_select_own on public.loadout_presets
  using (user_id = (select auth.uid()));

alter policy collection_claims_read_own on public.collection_claims
  using (user_id = (select auth.uid()));

alter policy season_claims_read_own on public.season_claims
  using (user_id = (select auth.uid()));

alter policy gift_tokens_read_own on public.gift_tokens
  using (user_id = (select auth.uid()));

-- The two party policies wrap an EXISTS. The InitPlan matters more here than
-- anywhere else on the list: without it auth.uid() is evaluated once per row
-- *of the subquery*, so the cost scales with party size rather than being flat.
alter policy parties_select_member on public.parties
  using (exists (
    select 1 from public.party_members m
    where m.party_id = parties.id
      and m.user_id = (select auth.uid())
  ));

alter policy party_members_select_member on public.party_members
  using (exists (
    select 1 from public.party_members m
    where m.party_id = party_members.party_id
      and m.user_id = (select auth.uid())
  ));

-- ───────────────────── 3. Schema version ────────────────────────────────────

insert into public.status_meta (key, value)
values ('schema', jsonb_build_object('version', '0074'))
on conflict (key) do update set value = excluded.value, updated_at = now();
