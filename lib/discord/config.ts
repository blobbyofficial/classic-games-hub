import "server-only";
import { botDb } from "./bot-db";

/**
 * Admin-editable bot configuration (`discord_bot_config`, migrations 0033 +
 * 0041). One shape per key, with defaults that make every feature safe to
 * leave unconfigured - a missing channel/role id simply disables that bit
 * instead of erroring.
 */

export type BotConfigKey =
  | "leveling"
  | "role_sync"
  | "verification"
  | "moderation"
  | "tickets"
  | "stats"
  | "level_roles"
  | "publishing"
  | "logging";

export interface VerificationConfig {
  enabled: boolean;
  mode: "button" | "captcha";
  verified_role_id: string | null;
  unverified_role_id: string | null;
  panel_channel_id: string | null;
  /** The panel message itself, so re-posting edits it instead of duplicating. */
  panel_message_id: string | null;
  log_channel_id: string | null;
  min_account_age_hours: number;
  panel_title: string;
  panel_body: string;
  button_label: string;
  success_message: string;
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

export interface TicketsConfig {
  enabled: boolean;
  /** Where the panel was last posted, so it can be re-posted from the site. */
  panel_channel_id: string | null;
  /** The panel message itself, so re-posting edits it instead of duplicating. */
  panel_message_id: string | null;
  category_id: string | null;
  staff_role_id: string | null;
  log_channel_id: string | null;
  panel_title: string;
  panel_body: string;
  button_label: string;
  open_message: string;
  max_open_per_user: number;
}

export interface StatsConfig {
  enabled: boolean;
  channels: {
    online: string | null;
    members: string | null;
    plays: string | null;
    discord_members: string | null;
  };
  templates: {
    online: string;
    members: string;
    plays: string;
    discord_members: string;
  };
}

export interface LevelRolesConfig {
  enabled: boolean;
  announce: boolean;
  remove_previous: boolean;
  milestones: number[];
  name_template: string;
  /** level (as a string key) → Discord role id */
  roles: Record<string, string>;
}

/**
 * Mirroring the website's update log and announcements into Discord.
 *
 * Both channels default to null, which switches that half off rather than
 * erroring - the same rule every other section here follows. `enabled` is the
 * master switch, so a server can keep its channel ids while a sync is paused.
 */
export interface PublishingConfig {
  enabled: boolean;
  /** Where releases are mirrored. Null disables the update-log sync. */
  update_channel_id: string | null;
  /** Where published announcements are mirrored. Null disables that sync. */
  announce_channel_id: string | null;
  /** Optionally pinged when a *new* release or announcement first appears. */
  update_ping_role_id: string | null;
  announce_ping_role_id: string | null;
  /** Post an announcement to Discord the moment it is published on the site. */
  announce_on_publish: boolean;
  /** How many announcements back the mirror keeps in step. */
  announce_limit: number;
}

/**
 * Server audit logging - what the gateway worker writes into the log channels.
 *
 * The shape is mirrored in `bot/src/hubConfig.ts`, which is the half that
 * actually reads it; this side exists so the admin panel and `/setup logging`
 * write something the worker recognises. Keep the two in step.
 */
export type LogCategory = "messages" | "members" | "server" | "voice" | "moderation";

export const LOG_EVENTS = [
  "message_delete",
  "message_edit",
  "message_bulk_delete",
  "member_join",
  "member_leave",
  "member_nickname",
  "member_roles",
  "member_timeout",
  "member_ban",
  "member_unban",
  "channel_create",
  "channel_delete",
  "channel_update",
  "thread_create",
  "thread_delete",
  "role_create",
  "role_delete",
  "role_update",
  "emoji_update",
  "sticker_update",
  "invite_create",
  "invite_delete",
  "voice_join",
  "voice_leave",
  "voice_move",
  "server_update",
  "webhook_update",
] as const;

export type LogEvent = (typeof LOG_EVENTS)[number];

export interface LoggingConfig {
  enabled: boolean;
  channel_id: string | null;
  channels: Record<LogCategory, string | null>;
  events: Record<LogEvent, boolean>;
  ignored_channel_ids: string[];
  ignored_role_ids: string[];
  ignored_user_ids: string[];
  ignore_bots: boolean;
  include_content: boolean;
}

export const LOGGING_DEFAULTS: LoggingConfig = {
  // Off until there is a channel to write to - see the worker's note.
  enabled: false,
  channel_id: null,
  channels: { messages: null, members: null, server: null, voice: null, moderation: null },
  events: Object.fromEntries(LOG_EVENTS.map((e) => [e, true])) as Record<LogEvent, boolean>,
  ignored_channel_ids: [],
  ignored_role_ids: [],
  ignored_user_ids: [],
  ignore_bots: true,
  include_content: true,
};

export const PUBLISHING_DEFAULTS: PublishingConfig = {
  enabled: true,
  update_channel_id: null,
  announce_channel_id: null,
  update_ping_role_id: null,
  announce_ping_role_id: null,
  announce_on_publish: true,
  announce_limit: 25,
};

export const VERIFICATION_DEFAULTS: VerificationConfig = {
  panel_message_id: null,
  enabled: true,
  mode: "button",
  verified_role_id: null,
  unverified_role_id: null,
  panel_channel_id: null,
  log_channel_id: null,
  min_account_age_hours: 0,
  panel_title: "✅ Verify yourself",
  panel_body: "Press the button below to get access to the server.",
  button_label: "Verify me",
  success_message: "You're verified - welcome in! 🎮",
  welcome_channel_id: null,
  welcome_message: "Welcome {user} to **{server}**! You're member #{count}. Play at {site}",
  dm_on_join: false,
  dm_message: "Welcome to {server}! Head to the verification channel to get access.",
};

export const AUTOMOD_DEFAULTS: AutomodConfig = {
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
};

export const MODERATION_DEFAULTS: ModerationConfig = {
  log_channel_id: null,
  dm_on_action: true,
  automod: AUTOMOD_DEFAULTS,
};

export const TICKETS_DEFAULTS: TicketsConfig = {
  panel_message_id: null,
  enabled: true,
  panel_channel_id: null,
  category_id: null,
  staff_role_id: null,
  log_channel_id: null,
  panel_title: "🎫 Support tickets",
  panel_body: "Need help? Open a private ticket and a staff member will be with you.",
  button_label: "Open a ticket",
  open_message: "Thanks {user} - describe your issue and staff will reply here.",
  max_open_per_user: 1,
};

export const STATS_DEFAULTS: StatsConfig = {
  enabled: true,
  channels: { online: null, members: null, plays: null, discord_members: null },
  templates: {
    online: "🟢 Online: {online}",
    members: "👥 Players: {members}",
    plays: "🎮 Plays today: {plays}",
    discord_members: "💬 Discord: {discord_members}",
  },
};

export const DEFAULT_MILESTONES = [1, 5, 10, 20, 30, 40, 50, 75, 100];

export const LEVEL_ROLES_DEFAULTS: LevelRolesConfig = {
  enabled: true,
  announce: true,
  remove_previous: false,
  milestones: DEFAULT_MILESTONES,
  name_template: "Level {level}",
  roles: {},
};

const DEFAULTS = {
  verification: VERIFICATION_DEFAULTS,
  moderation: MODERATION_DEFAULTS,
  tickets: TICKETS_DEFAULTS,
  stats: STATS_DEFAULTS,
  level_roles: LEVEL_ROLES_DEFAULTS,
  publishing: PUBLISHING_DEFAULTS,
  logging: LOGGING_DEFAULTS,
} as const;

type Configs = {
  verification: VerificationConfig;
  moderation: ModerationConfig;
  tickets: TicketsConfig;
  stats: StatsConfig;
  level_roles: LevelRolesConfig;
  publishing: PublishingConfig;
  logging: LoggingConfig;
};

/**
 * Reads one config key and merges it over the defaults. Nested objects
 * (`automod`, `stats.channels`, `stats.templates`, `logging.events`) are
 * merged one level deep so a partially-saved config never loses a field.
 */
export async function getBotConfig<K extends keyof Configs>(key: K): Promise<Configs[K]> {
  const raw = (await botDb.getConfig(key)) as Record<string, unknown> | null;
  return mergeConfig(key, raw);
}

export function mergeConfig<K extends keyof Configs>(
  key: K,
  raw: Record<string, unknown> | null | undefined,
): Configs[K] {
  const base = DEFAULTS[key] as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...base, ...(raw ?? {}) };
  for (const nested of ["automod", "channels", "templates", "events"]) {
    if (nested in base && typeof base[nested] === "object") {
      merged[nested] = {
        ...(base[nested] as Record<string, unknown>),
        ...((raw?.[nested] as Record<string, unknown>) ?? {}),
      };
    }
  }
  return merged as unknown as Configs[K];
}

/** Fills `{placeholder}` tokens in a configurable message template. */
export function template(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Milestone levels a member at `level` has earned, highest first. */
export function earnedMilestones(cfg: LevelRolesConfig, level: number): number[] {
  return [...(cfg.milestones ?? [])]
    .filter((m) => Number.isFinite(m) && level >= m)
    .sort((a, b) => b - a);
}
