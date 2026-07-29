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

export interface BotConfig {
  leveling: LevelingConfig;
  role_sync: RoleSyncConfig;
  verification: VerificationConfig;
  moderation: ModerationConfig;
  stats: StatsConfig;
  level_roles: LevelRolesConfig;
}

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
};

const TTL_MS = 60_000;
let cache: BotConfig = DEFAULTS;
let cachedAt = 0;

function merge<T extends object>(base: T, raw: unknown): T {
  if (!raw || typeof raw !== "object") return base;
  const out = { ...base, ...(raw as Record<string, unknown>) } as Record<string, unknown>;
  for (const key of ["automod", "channels", "templates"]) {
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
    };
    cachedAt = Date.now();
  }
  return cache;
}

/** Fills `{placeholder}` tokens in a configurable message template. */
export function template(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
