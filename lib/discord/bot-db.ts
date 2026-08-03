import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { BotConfigKey } from "./config";

/**
 * Typed wrappers around the service_role-only `bot_*` RPCs (migrations
 * 0018/0019/0033) for the serverless interaction handler and cron jobs.
 * Every call returns null when the secret key isn't configured or the RPC
 * fails, so command handlers can reply with a friendly error.
 */

export interface BotProfile {
  ok: boolean;
  error?: string;
  username?: string;
  display_name?: string | null;
  level?: number;
  xp?: number;
  credits?: number;
  role?: string;
  is_banned?: boolean;
  nameplate?: string | null;
}

export interface DiscordRank {
  ok: boolean;
  error?: string;
  level?: number;
  xp?: number;
  messages?: number;
  rank?: number;
  level_floor_xp?: number;
  next_level_xp?: number;
  hub_username?: string | null;
}

export interface RoleState {
  ok: boolean;
  linked: boolean;
  username?: string;
  role?: "user" | "moderator" | "admin";
  is_banned?: boolean;
  hub_level?: number;
  discord_level?: number;
  nameplate?: string | null;
  badges?: string[];
  achievements?: string[];
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  // The admin client is typed against the public schema; bot RPC names are in
  // the Functions map, so this stays type-checked at the call sites below.
  const { data, error } = await admin.rpc(
    fn as never,
    args as never,
  );
  if (error) {
    console.error(`[discord] RPC ${fn} failed: ${error.message}`);
    return null;
  }
  return data as T;
}

export const botDb = {
  profile: (discordId: string) => rpc<BotProfile>("bot_profile", { p_discord: discordId }),
  claimDaily: (discordId: string) =>
    rpc<{ ok: boolean; error?: string; credits?: number; streak?: number }>("bot_claim_daily", {
      p_discord: discordId,
    }),
  pay: (from: string, to: string, amount: number) =>
    rpc<{ ok: boolean; error?: string; amount?: number }>("bot_pay", {
      p_from: from,
      p_to: to,
      p_amount: amount,
    }),
  topPlayers: (limit: number) =>
    rpc<
      { rank: number; username: string; display_name: string | null; level: number; xp: number }[]
    >("bot_top_players", { p_limit: limit }),
  createLinkCode: (discordId: string, username: string) =>
    rpc<{ ok: boolean; error?: string; code?: string; username?: string; expires_in_minutes?: number }>(
      "bot_create_link_code",
      { p_discord: discordId, p_username: username },
    ),
  linkStatus: (discordId: string) =>
    rpc<{ ok: boolean; linked: boolean; username?: string; via?: string }>("bot_link_status", {
      p_discord: discordId,
    }),
  unlink: (discordId: string) =>
    rpc<{ ok: boolean; error?: string }>("bot_unlink", { p_discord: discordId }),
  awardDiscordXp: (discordId: string, username: string | null) =>
    rpc<{
      ok: boolean;
      error?: string;
      cooldown?: boolean;
      leveled_up?: boolean;
      level?: number;
      xp?: number;
      next_level_xp?: number;
    }>("bot_award_discord_xp", { p_discord: discordId, p_username: username }),
  discordRank: (discordId: string) => rpc<DiscordRank>("bot_discord_rank", { p_discord: discordId }),
  discordLeaderboard: (limit: number) =>
    rpc<
      {
        rank: number;
        discord_id: string;
        discord_username: string | null;
        level: number;
        xp: number;
        hub_username: string | null;
      }[]
    >("bot_discord_leaderboard", { p_limit: limit }),
  roleState: (discordId: string) => rpc<RoleState>("bot_role_state", { p_discord: discordId }),
  allLinked: () => rpc<string[]>("bot_all_linked", {}),
  getConfig: (key: BotConfigKey) => rpc<Record<string, Json>>("bot_get_config", { p_key: key }),
  /**
   * The gateway worker's heartbeat (0043). Not a `BotConfigKey`: the worker
   * writes it, nothing edits it, and it must never appear in the admin
   * settings UI alongside things a person is meant to change.
   */
  workerStatus: () =>
    rpc<{ last_seen?: string; version?: string } | null>("bot_get_config", { p_key: "worker" }),
  allConfig: () => rpc<Record<string, Record<string, Json>>>("bot_all_config", {}),
  patchConfig: (key: BotConfigKey, patch: Record<string, unknown>) =>
    rpc<{ ok: boolean; error?: string }>("bot_patch_config", { p_key: key, p_patch: patch }),
  verifyMember: (discordId: string, username: string | null, method: string) =>
    rpc<{
      ok: boolean;
      error?: string;
      first_time?: boolean;
      verified_role_id?: string | null;
      unverified_role_id?: string | null;
      success_message?: string | null;
      linked?: boolean;
    }>("bot_verify_member", { p_discord: discordId, p_username: username, p_method: method }),
  addCase: (input: {
    actor: string;
    target: string;
    action: string;
    reason?: string | null;
    minutes?: number | null;
    targetUsername?: string | null;
  }) =>
    rpc<{ ok: boolean; case?: number }>("bot_add_case", {
      p_actor: input.actor,
      p_target: input.target,
      p_action: input.action,
      p_reason: input.reason ?? null,
      p_minutes: input.minutes ?? null,
      p_target_username: input.targetUsername ?? null,
    }),
  listCases: (target: string, limit = 10) =>
    rpc<
      {
        case: number;
        action: string;
        reason: string | null;
        actor: string | null;
        minutes: number | null;
        at: string;
      }[]
    >("bot_list_cases", { p_target: target, p_limit: limit }),
  openTicketCount: (discordId: string) =>
    rpc<{ count: number; channels: string[]; next: number }>("bot_open_ticket_count", {
      p_discord: discordId,
    }),
  ticketOpen: (channelId: string, discordId: string, username: string | null, subject: string | null) =>
    rpc<{ ok: boolean; ticket?: number }>("bot_ticket_open", {
      p_channel: channelId,
      p_discord: discordId,
      p_username: username,
      p_subject: subject,
    }),
  ticketClose: (channelId: string, by: string | null) =>
    rpc<{ ok: boolean; error?: string; ticket?: number; opener?: string; subject?: string | null }>(
      "bot_ticket_close",
      { p_channel: channelId, p_by: by },
    ),
  statsExtended: () =>
    rpc<{
      members: number;
      online: number;
      plays_today: number;
      plays_total: number;
      linked: number;
    }>("bot_stats_extended", {}),
  logMod: (actor: string, target: string, action: string, reason: string) =>
    rpc<{ ok: boolean }>("bot_log_mod", {
      p_actor_discord: actor,
      p_target_discord: target,
      p_action: action,
      p_reason: reason,
    }),
  /** ref → the Discord message mirroring it (migration 0063). */
  posts: (kind: "release" | "announcement") =>
    rpc<Record<string, { channel_id: string; message_id: string; digest: string }>>("bot_posts", {
      p_kind: kind,
    }),
  recordPost: (
    kind: "release" | "announcement",
    ref: string,
    channelId: string,
    messageId: string,
    digest: string,
  ) =>
    rpc<{ ok: boolean; error?: string }>("bot_record_post", {
      p_kind: kind,
      p_ref: ref,
      p_channel: channelId,
      p_message: messageId,
      p_digest: digest,
    }),
  forgetPost: (kind: "release" | "announcement", ref: string) =>
    rpc<{ ok: boolean }>("bot_forget_post", { p_kind: kind, p_ref: ref }),
  publishedAnnouncements: (limit: number) =>
    rpc<
      {
        id: string;
        title: string;
        body: string;
        level: string;
        link_label: string | null;
        link_href: string | null;
        published_at: string;
      }[]
    >("bot_published_announcements", { p_limit: limit }),
  discordIdFor: (userId: string) => rpc<string | null>("bot_discord_id", { p_user: userId }),
  setBooster: (discordId: string, since: string | null) =>
    rpc<{ ok: boolean }>("bot_set_booster", { p_discord: discordId, p_since: since }),
  purgeLinkCodes: () => rpc<undefined>("bot_purge_link_codes", {}),
};
