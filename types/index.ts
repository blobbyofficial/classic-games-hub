import type { Database, Tables } from "./database";

export type * from "./database";

export type Profile = Tables<"profiles">;
export type Game = Tables<"games">;
export type ShopItem = Tables<"shop_items">;
export type Achievement = Tables<"achievements">;
export type NotificationRow = Tables<"notifications">;
export type Challenge = Tables<"challenges">;
export type Announcement = Tables<"announcements">;
export type Report = Tables<"reports">;
export type FeatureFlag = Tables<"feature_flags">;
export type Message = Tables<"messages">;
export type UserSettings = Tables<"user_settings">;

/** A profile plus derived rating/favorite fields used across cards & pages. */
export type GameWithMeta = Game & {
  rating: number;
  is_favorite?: boolean;
};

export type LeaderboardRow = Database["public"]["Functions"]["game_leaderboard"]["Returns"][number];
export type GlobalRankRow = Database["public"]["Functions"]["global_leaderboard"]["Returns"][number];
export type FriendRow = Database["public"]["Functions"]["list_friends"]["Returns"][number];
export type FriendRequestRow = Database["public"]["Functions"]["list_friend_requests"]["Returns"][number];
export type ConversationRow = Database["public"]["Functions"]["list_conversations"]["Returns"][number];

export interface RpcResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export type BannerVariant = "info" | "success" | "warning" | "promo";

/** Resolved, display-ready config for a site-wide banner (from a feature flag payload). */
export interface BannerConfig {
  message: string;
  variant: BannerVariant;
  linkLabel: string | null;
  linkHref: string | null;
}

export interface ScoreResult extends RpcResult {
  credits_earned?: number;
  xp_earned?: number;
  best_score?: number;
  new_best?: boolean;
  ads_doubled?: boolean;
  rewarded?: boolean;
}

export interface ProfileStats {
  total_plays: number;
  games_played: number;
  achievements: number;
  friends: number;
  best_game: { slug: string; title: string; score: number } | null;
}

export type FriendshipRelation = "self" | "blocked" | "friends" | "outgoing" | "incoming" | "none";

/** A generic game engine contract every game implements. */
export interface GameEngineHandle {
  destroy: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
}

export interface GameEngineContext {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** Report the current/last score to the host (throttled UI). */
  onScore: (score: number) => void;
  /** Called by the engine when a run ends; host persists it. */
  onGameOver: (score: number, durationSeconds: number) => void;
  /** Report transient status text (e.g. "Paused", "Level 3"). */
  onStatus?: (status: string) => void;
  reducedMotion: boolean;
}

export type GameEngineFactory = (ctx: GameEngineContext) => GameEngineHandle;
