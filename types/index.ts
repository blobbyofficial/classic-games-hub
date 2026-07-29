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
export type PlayerSearchRow = Database["public"]["Functions"]["search_players"]["Returns"][number];

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
  event_multiplier?: number;
  rewarded?: boolean;
}

/** One player in a party, as returned by the `party_state` RPC. */
export interface PartyMember {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  is_leader: boolean;
  online: boolean;
  joined_at: string;
}

/** The whole lobby in one object - `party_state` returns exactly this. */
export type PartyState =
  | { in_party: false }
  | {
      in_party: true;
      id: string;
      name: string | null;
      invite_code: string;
      game_slug: string | null;
      max_size: number;
      is_leader: boolean;
      leader_id: string;
      created_at: string;
      members: PartyMember[];
    };

/** Resolved, display-ready config for the site-wide seasonal event. */
export interface SeasonalEvent {
  multiplier: number;
  title: string;
  message: string;
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
  /**
   * Play a move that arrived from the opponent. Only engines that opt into
   * head-to-head play (see `GameNetContext`) implement this.
   */
  applyRemoteMove?: (move: GameMove) => void;
}

/**
 * A move in a head-to-head board game, small enough to fit in a broadcast
 * payload. `i` is whatever index that game plays in: a board cell for
 * tic-tac-toe and reversi, a column for Connect 4.
 */
export interface GameMove {
  i: number;
}

/** Seat 1 always moves first; the leader assigns seats when the match starts. */
export type Seat = 1 | 2;

export type MatchOutcome = "win" | "loss" | "draw";

/**
 * Wiring handed to an engine that is playing a networked opponent rather than
 * the AI. Its presence is what switches the engine into head-to-head mode: the
 * AI and the local pass-and-play toggle both stay out of the way, and the
 * engine only accepts input on this seat's turn.
 */
export interface GameNetContext {
  seat: Seat;
  /** Opponent's display name, for on-canvas turn prompts. */
  opponentName: string;
  /** Send a move this player just made to the opponent. */
  send: (move: GameMove) => void;
  /** Called once the board resolves, from this seat's point of view. */
  onResult: (outcome: MatchOutcome) => void;
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
  /** Present only for an online head-to-head match; see `GameNetContext`. */
  net?: GameNetContext;
}

export type GameEngineFactory = (ctx: GameEngineContext) => GameEngineHandle;
