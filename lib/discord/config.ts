import "server-only";
import { botDb } from "./bot-db";

/**
 * Admin-editable bot configuration (`discord_bot_config`, migrations 0033 +
 * 0041). One shape per key, with defaults that make every feature safe to
 * leave unconfigured — a missing channel/role id simply disables that bit
 * instead of erroring.
 */

export type BotConfigKey =
  | "leveling"
  | "role_sync"
  | "verification"
  | "moderation"
  | "tickets"
  | "stats"
  | "level_roles";

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
  success_message: "You're verified — welcome in! 🎮",
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
  open_message: "Thanks {user} — describe your issue and staff will reply here.",
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
} as const;

type Configs = {
  verification: VerificationConfig;
  moderation: ModerationConfig;
  tickets: TicketsConfig;
  stats: StatsConfig;
  level_roles: LevelRolesConfig;
};

/**
 * Reads one config key and merges it over the defaults. Nested objects
 * (`automod`, `stats.channels`, `stats.templates`) are merged one level deep
 * so a partially-saved config never loses a field.
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
  for (const nested of ["automod", "channels", "templates"]) {
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
