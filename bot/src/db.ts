import { supabase } from "./supabase.js";

/** Typed wrappers around the bot_* RPCs used by the companion worker. */

export interface FeedEvent {
  id: number;
  type: "high_score" | "achievement_unlocked";
  username: string;
  display_name: string | null;
  data: Record<string, unknown>;
}

export interface LevelingConfig {
  enabled: boolean;
  xp_min: number;
  xp_max: number;
  cooldown_seconds: number;
  announce_level_ups: boolean;
  announce_channel_id: string | null;
  no_xp_channel_ids: string[];
  hub_xp_share: number;
}

export interface RoleSyncConfig {
  enabled: boolean;
  role_map: Record<string, string>;
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
  getConfig: <T>(key: "leveling" | "role_sync") => rpc<T>("bot_get_config", { p_key: key }),
  roleState: (discordId: string) => rpc<RoleState>("bot_role_state", { p_discord: discordId }),
  serverStats: () =>
    rpc<{ members: number; online: number; plays_today: number }>("bot_server_stats", {}),
  recentFeed: (after: number) => rpc<FeedEvent[]>("bot_recent_feed", { p_after: after }),
};
