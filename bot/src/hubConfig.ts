import { db } from "./db.js";

/**
 * The worker reads the same admin-editable configuration the website does
 * (`discord_bot_config`), in one round trip, cached for a minute. Shapes
 * mirror lib/discord/config.ts - keep the two in step.
 */

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

export interface VerificationConfig {
  enabled: boolean;
  mode: "button" | "captcha";
  verified_role_id: string | null;
  unverified_role_id: string | null;
  log_channel_id: string | null;
  welcome_channel_id: string | null;
  welcome_message: string;
  dm_on_join: boolean;
  dm_message: string;
}

export interface AutomodConfig {
  enabled: boolean;
  block_invites: boolean;
  block_links: boolean;
  max_mentions: number;
  spam_messages: number;
  spam_window_seconds: number;
  action: "delete" | "timeout";
  timeout_minutes: number;
  exempt_role_ids: string[];
  exempt_channel_ids: string[];
}

export interface ModerationConfig {
  log_channel_id: string | null;
  dm_on_action: boolean;
  automod: AutomodConfig;
}

export interface StatsConfig {
  enabled: boolean;
  channels: Record<"online" | "members" | "plays" | "discord_members", string | null>;
  templates: Record<"online" | "members" | "plays" | "discord_members", string>;
}

export interface LevelRolesConfig {
  enabled: boolean;
  announce: boolean;
  remove_previous: boolean;
  milestones: number[];
  name_template: string;
  roles: Record<string, string>;
}

/**
 * Server audit logging - the Sapphire-style "what just happened here" feed.
 *
 * Events are grouped into five categories so a server can put message churn in
 * one channel and role/channel changes in another, which is what stops the
 * useful entries being buried by 400 edit logs a day. Each category falls back
 * to `channel_id`, so the simple setup is one channel and nothing else.
 */
export type LogCategory = "messages" | "members" | "server" | "voice" | "moderation";

export type LogEvent =
  | "message_delete"
  | "message_edit"
  | "message_bulk_delete"
  | "member_join"
  | "member_leave"
  | "member_nickname"
  | "member_roles"
  | "member_timeout"
  | "member_ban"
  | "member_unban"
  | "channel_create"
  | "channel_delete"
  | "channel_update"
  | "thread_create"
  | "thread_delete"
  | "role_create"
  | "role_delete"
  | "role_update"
  | "emoji_update"
  | "sticker_update"
  | "invite_create"
  | "invite_delete"
  | "voice_join"
  | "voice_leave"
  | "voice_move"
  | "server_update"
  | "webhook_update";

/** Which channel each event's embed is routed to when one is configured. */
export const EVENT_CATEGORY: Record<LogEvent, LogCategory> = {
  message_delete: "messages",
  message_edit: "messages",
  message_bulk_delete: "messages",
  member_join: "members",
  member_leave: "members",
  member_nickname: "members",
  member_roles: "members",
  member_timeout: "moderation",
  member_ban: "moderation",
  member_unban: "moderation",
  channel_create: "server",
  channel_delete: "server",
  channel_update: "server",
  thread_create: "server",
  thread_delete: "server",
  role_create: "server",
  role_delete: "server",
  role_update: "server",
  emoji_update: "server",
  sticker_update: "server",
  invite_create: "server",
  invite_delete: "server",
  voice_join: "voice",
  voice_leave: "voice",
  voice_move: "voice",
  server_update: "server",
  webhook_update: "server",
};

export const LOG_EVENTS = Object.keys(EVENT_CATEGORY) as LogEvent[];

export interface LoggingConfig {
  enabled: boolean;
  /** Catch-all channel. Used for any category without one of its own. */
  channel_id: string | null;
  channels: Record<LogCategory, string | null>;
  events: Record<LogEvent, boolean>;
  ignored_channel_ids: string[];
  ignored_role_ids: string[];
  ignored_user_ids: string[];
  /** Bots are the loudest thing in a log channel and the least interesting. */
  ignore_bots: boolean;
  /**
   * Whether deleted/edited message bodies are quoted in the log.
   *
   * On by default because a delete log without the message is close to
   * useless, but it is a real privacy decision, so it is one switch rather
   * than something buried per-event.
   */
  include_content: boolean;
}

export interface BotConfig {
  leveling: LevelingConfig;
  role_sync: RoleSyncConfig;
  verification: VerificationConfig;
  moderation: ModerationConfig;
  stats: StatsConfig;
  level_roles: LevelRolesConfig;
  logging: LoggingConfig;
}

/** Every event on. Turning noise *off* is the easier edit to discover. */
const ALL_EVENTS = Object.fromEntries(LOG_EVENTS.map((e) => [e, true])) as Record<LogEvent, boolean>;

const DEFAULTS: BotConfig = {
  leveling: {
    enabled: true,
    xp_min: 15,
    xp_max: 25,
    cooldown_seconds: 60,
    announce_level_ups: true,
    announce_channel_id: null,
    no_xp_channel_ids: [],
    hub_xp_share: 0.2,
  },
  role_sync: { enabled: true, role_map: {} },
  verification: {
    enabled: true,
    mode: "button",
    verified_role_id: null,
    unverified_role_id: null,
    log_channel_id: null,
    welcome_channel_id: null,
    welcome_message: "Welcome {user} to **{server}**! You're member #{count}. Play at {site}",
    dm_on_join: false,
    dm_message: "Welcome to {server}! Head to the verification channel to get access.",
  },
  moderation: {
    log_channel_id: null,
    dm_on_action: true,
    automod: {
      enabled: false,
      block_invites: true,
      block_links: false,
      max_mentions: 6,
      spam_messages: 6,
      spam_window_seconds: 8,
      action: "timeout",
      timeout_minutes: 10,
      exempt_role_ids: [],
      exempt_channel_ids: [],
    },
  },
  stats: {
    enabled: true,
    channels: { online: null, members: null, plays: null, discord_members: null },
    templates: {
      online: "🟢 Online: {online}",
      members: "👥 Players: {members}",
      plays: "🎮 Plays today: {plays}",
      discord_members: "💬 Discord: {discord_members}",
    },
  },
  level_roles: {
    enabled: true,
    announce: true,
    remove_previous: false,
    milestones: [1, 5, 10, 20, 30, 40, 50, 75, 100],
    name_template: "Level {level}",
    roles: {},
  },
  logging: {
    // Off until a channel is chosen: a log feed with nowhere to go is just a
    // wasted audit-log fetch on every event.
    enabled: false,
    channel_id: null,
    channels: { messages: null, members: null, server: null, voice: null, moderation: null },
    events: ALL_EVENTS,
    ignored_channel_ids: [],
    ignored_role_ids: [],
    ignored_user_ids: [],
    ignore_bots: true,
    include_content: true,
  },
};

const TTL_MS = 60_000;
/**
 * How long a failed read is trusted for. Without this the worker re-tried the
 * RPC on *every message* while Supabase was unreachable, turning a database
 * blip into a request storm - and the answer was never going to change inside
 * the same second anyway.
 */
const FAILURE_TTL_MS = 15_000;
let cache: BotConfig = DEFAULTS;
let cachedAt = 0;

function merge<T extends object>(base: T, raw: unknown): T {
  if (!raw || typeof raw !== "object") return base;
  const out = { ...base, ...(raw as Record<string, unknown>) } as Record<string, unknown>;
  for (const key of ["automod", "channels", "templates", "events"]) {
    const baseVal = (base as Record<string, unknown>)[key];
    if (baseVal && typeof baseVal === "object") {
      out[key] = { ...(baseVal as object), ...((raw as Record<string, unknown>)[key] as object) };
    }
  }
  return out as T;
}

/** Whole configuration, refreshed at most once a minute. */
export async function getConfig(): Promise<BotConfig> {
  if (Date.now() - cachedAt < TTL_MS) return cache;
  const raw = await db.allConfig();
  if (raw) {
    cache = {
      leveling: merge(DEFAULTS.leveling, raw.leveling),
      role_sync: merge(DEFAULTS.role_sync, raw.role_sync),
      verification: merge(DEFAULTS.verification, raw.verification),
      moderation: merge(DEFAULTS.moderation, raw.moderation),
      stats: merge(DEFAULTS.stats, raw.stats),
      level_roles: merge(DEFAULTS.level_roles, raw.level_roles),
      logging: merge(DEFAULTS.logging, raw.logging),
    };
    cachedAt = Date.now();
  } else {
    // Keep serving the last good config (or the defaults) rather than asking
    // again on the very next event.
    cachedAt = Date.now() - TTL_MS + FAILURE_TTL_MS;
  }
  return cache;
}

/** Fills `{placeholder}` tokens in a configurable message template. */
export function template(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
