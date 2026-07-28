import { supabase } from "./supabase.js";

/** Typed wrappers around the bot_* RPCs used by the companion worker. */

export interface FeedEvent {
  id: number;
  type: "high_score" | "achievement_unlocked";
  username: string;
  display_name: string | null;
  data: Record<string, unknown>;
}

export interface RoleState {
  ok: boolean;
  linked: boolean;
  role?: "user" | "moderator" | "admin";
  is_banned?: boolean;
  hub_level?: number;
  discord_level?: number;
  nameplate?: string | null;
  badges?: string[];
  achievements?: string[];
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(`RPC ${fn} failed:`, error.message);
    return null;
  }
  return data as T;
}

export const db = {
  awardDiscordXp: (discordId: string, username: string | null) =>
    rpc<{
      ok: boolean;
      error?: string;
      cooldown?: boolean;
      leveled_up?: boolean;
      level?: number;
      xp?: number;
    }>("bot_award_discord_xp", { p_discord: discordId, p_username: username }),
  /** Every config key in one round trip (migration 0041). */
  allConfig: () => rpc<Record<string, unknown>>("bot_all_config", {}),
  roleState: (discordId: string) => rpc<RoleState>("bot_role_state", { p_discord: discordId }),
  serverStats: () =>
    rpc<{
      members: number;
      online: number;
      plays_today: number;
      plays_total: number;
      linked: number;
    }>("bot_stats_extended", {}),
  recentFeed: (after: number) => rpc<FeedEvent[]>("bot_recent_feed", { p_after: after }),
  verifyMember: (discordId: string, username: string | null, method: string) =>
    rpc<{ ok: boolean; error?: string; first_time?: boolean }>("bot_verify_member", {
      p_discord: discordId,
      p_username: username,
      p_method: method,
    }),
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
  /** Writes `last_seen` into discord_bot_config; drives /status on the site. */
  heartbeat: (version: string | null) => rpc<{ ok: boolean }>("bot_heartbeat", { p_version: version }),
};
