import { supabase } from "./supabase.js";

/** Typed wrappers around the bot_* RPCs (see migration 0018). */

export interface BotProfile {
  ok: boolean;
  error?: string;
  id?: string;
  username?: string;
  display_name?: string | null;
  level?: number;
  xp?: number;
  credits?: number;
  role?: string;
  is_banned?: boolean;
  nameplate?: string | null;
}

export interface TopPlayer {
  rank: number;
  username: string;
  display_name: string | null;
  level: number;
  xp: number;
}

export interface UserAwards {
  ok: boolean;
  error?: string;
  badges?: string[];
  achievements?: string[];
  nameplate?: string | null;
  is_staff?: boolean;
}

export interface FeedEvent {
  id: number;
  type: "high_score" | "achievement_unlocked";
  username: string;
  display_name: string | null;
  data: Record<string, unknown>;
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
  addChatXp: (discordId: string, amount: number) =>
    rpc<{ ok: boolean; error?: string; level?: number; xp?: number; leveled_up?: boolean }>(
      "bot_add_chat_xp",
      { p_discord: discordId, p_amount: amount },
    ),
  topPlayers: (limit: number) => rpc<TopPlayer[]>("bot_top_players", { p_limit: limit }),
  userAwards: (discordId: string) => rpc<UserAwards>("bot_user_awards", { p_discord: discordId }),
  logMod: (actor: string, target: string, action: string, reason: string) =>
    rpc<{ ok: boolean }>("bot_log_mod", {
      p_actor_discord: actor,
      p_target_discord: target,
      p_action: action,
      p_reason: reason,
    }),
  serverStats: () =>
    rpc<{ members: number; online: number; plays_today: number }>("bot_server_stats", {}),
  recentFeed: (after: number) => rpc<FeedEvent[]>("bot_recent_feed", { p_after: after }),
};
