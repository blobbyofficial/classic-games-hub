import "server-only";
import { botDb } from "./bot-db";
import { getBotConfig, type LogEvent, type LoggingConfig } from "./config";
import { discordEnv } from "./env";
import { discordRest, type AuditLogChange, type AuditLogEntry } from "./rest";
import type { Embed } from "./types";

/**
 * Server logging **without the gateway worker**.
 *
 * The worker (`bot/src/features/logging`) is the better half of this feature
 * and always will be: it sees messages as they are deleted and edited, catches
 * joins and leaves, and reports in real time. But it needs a host that stays
 * up, and this deployment has not got one - so the choice was between a
 * logging feature nobody can run and a smaller one that runs on the free
 * infrastructure already in place.
 *
 * This is the smaller one. It polls `GET /guilds/{id}/audit-logs` from a cron
 * route and renders the entries into the same log channels, which covers
 * everything structural: channels created, renamed, moved and deleted, roles
 * created, recoloured and re-permissioned, members kicked, banned, unbanned,
 * timed out, renamed and given roles, invites, webhooks, emoji, stickers,
 * threads, and messages deleted **by a moderator**.
 *
 * What it cannot do, because Discord's audit log genuinely does not contain it:
 *
 *   - **message content.** A delete entry names the channel and a count. The
 *     text is gone, and no amount of polling brings it back.
 *   - **message edits**, which are not audited at all.
 *   - **messages people delete themselves**, likewise unaudited.
 *   - **joins and leaves**, which are gateway events, not audit entries.
 *   - **voice movement**, same.
 *
 * Both halves write to the same channels and read the same `logging` config,
 * and both are safe to run at once: the worker skips nothing, and this skips
 * anything it has already posted by cursor. Running both simply means the
 * structural entries arrive twice, so turn this cron off if the worker is up.
 */

// ── Discord's audit-log action types ─────────────────────────────────
// Numeric rather than an enum import: this file is the only place they appear,
// and the numbers are a stable part of Discord's API.

const Action = {
  GuildUpdate: 1,
  ChannelCreate: 10,
  ChannelUpdate: 11,
  ChannelDelete: 12,
  ChannelOverwriteCreate: 13,
  ChannelOverwriteUpdate: 14,
  ChannelOverwriteDelete: 15,
  MemberKick: 20,
  MemberPrune: 21,
  MemberBanAdd: 22,
  MemberBanRemove: 23,
  MemberUpdate: 24,
  MemberRoleUpdate: 25,
  BotAdd: 28,
  RoleCreate: 30,
  RoleUpdate: 31,
  RoleDelete: 32,
  InviteCreate: 40,
  InviteDelete: 42,
  WebhookCreate: 50,
  WebhookUpdate: 51,
  WebhookDelete: 52,
  EmojiCreate: 60,
  EmojiUpdate: 61,
  EmojiDelete: 62,
  MessageDelete: 72,
  MessageBulkDelete: 73,
  MessagePin: 74,
  MessageUnpin: 75,
  StickerCreate: 100,
  StickerUpdate: 101,
  StickerDelete: 102,
  ThreadCreate: 110,
  ThreadUpdate: 111,
  ThreadDelete: 112,
} as const;

const CREATE = 0x22c55e;
const DELETE = 0xef4444;
const UPDATE = 0xf59e0b;
const INFO = 0x3b82f6;
const MODERATION = 0xdc2626;

/** How each action is presented, and which `logging.events` switch gates it. */
interface Shape {
  event: LogEvent;
  title: string;
  colour: number;
}

const SHAPES: Record<number, Shape> = {
  [Action.GuildUpdate]: { event: "server_update", title: "⚙️ Server settings updated", colour: UPDATE },

  [Action.ChannelCreate]: { event: "channel_create", title: "📁 Channel created", colour: CREATE },
  [Action.ChannelUpdate]: { event: "channel_update", title: "✏️ Channel updated", colour: UPDATE },
  [Action.ChannelDelete]: { event: "channel_delete", title: "🗑️ Channel deleted", colour: DELETE },
  [Action.ChannelOverwriteCreate]: { event: "channel_update", title: "🔐 Channel permission added", colour: UPDATE },
  [Action.ChannelOverwriteUpdate]: { event: "channel_update", title: "🔐 Channel permissions changed", colour: UPDATE },
  [Action.ChannelOverwriteDelete]: { event: "channel_update", title: "🔐 Channel permission removed", colour: UPDATE },

  [Action.MemberKick]: { event: "member_leave", title: "👢 Member kicked", colour: DELETE },
  [Action.MemberPrune]: { event: "member_leave", title: "🧹 Members pruned", colour: DELETE },
  [Action.MemberBanAdd]: { event: "member_ban", title: "🔨 Member banned", colour: MODERATION },
  [Action.MemberBanRemove]: { event: "member_unban", title: "♻️ Member unbanned", colour: CREATE },
  // Split at render time: MEMBER_UPDATE carries both nickname and timeout.
  [Action.MemberUpdate]: { event: "member_nickname", title: "👤 Member updated", colour: UPDATE },
  [Action.MemberRoleUpdate]: { event: "member_roles", title: "🎭 Roles changed", colour: UPDATE },
  [Action.BotAdd]: { event: "member_join", title: "🤖 Bot added", colour: CREATE },

  [Action.RoleCreate]: { event: "role_create", title: "🎭 Role created", colour: CREATE },
  [Action.RoleUpdate]: { event: "role_update", title: "🎭 Role updated", colour: UPDATE },
  [Action.RoleDelete]: { event: "role_delete", title: "🎭 Role deleted", colour: DELETE },

  [Action.InviteCreate]: { event: "invite_create", title: "🔗 Invite created", colour: INFO },
  [Action.InviteDelete]: { event: "invite_delete", title: "🔗 Invite deleted", colour: DELETE },

  [Action.WebhookCreate]: { event: "webhook_update", title: "🪝 Webhook created", colour: CREATE },
  [Action.WebhookUpdate]: { event: "webhook_update", title: "🪝 Webhook updated", colour: UPDATE },
  [Action.WebhookDelete]: { event: "webhook_update", title: "🪝 Webhook deleted", colour: DELETE },

  [Action.EmojiCreate]: { event: "emoji_update", title: "😀 Emoji created", colour: CREATE },
  [Action.EmojiUpdate]: { event: "emoji_update", title: "😀 Emoji renamed", colour: UPDATE },
  [Action.EmojiDelete]: { event: "emoji_update", title: "😀 Emoji deleted", colour: DELETE },

  [Action.StickerCreate]: { event: "sticker_update", title: "🏷️ Sticker created", colour: CREATE },
  [Action.StickerUpdate]: { event: "sticker_update", title: "🏷️ Sticker updated", colour: UPDATE },
  [Action.StickerDelete]: { event: "sticker_update", title: "🏷️ Sticker deleted", colour: DELETE },

  [Action.MessageDelete]: { event: "message_delete", title: "🗑️ Message deleted by a moderator", colour: DELETE },
  [Action.MessageBulkDelete]: { event: "message_bulk_delete", title: "🧹 Messages purged", colour: DELETE },
  [Action.MessagePin]: { event: "message_edit", title: "📌 Message pinned", colour: INFO },
  [Action.MessageUnpin]: { event: "message_edit", title: "📌 Message unpinned", colour: INFO },

  [Action.ThreadCreate]: { event: "thread_create", title: "🧵 Thread created", colour: CREATE },
  [Action.ThreadUpdate]: { event: "thread_create", title: "🧵 Thread updated", colour: UPDATE },
  [Action.ThreadDelete]: { event: "thread_delete", title: "🧵 Thread deleted", colour: DELETE },
};

/** Which log channel an event goes to, mirroring the worker's routing. */
const CATEGORY: Record<string, "messages" | "members" | "server" | "voice" | "moderation"> = {
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
  voice_join: "voice",
  voice_leave: "voice",
  voice_move: "voice",
};

function channelFor(cfg: LoggingConfig, event: LogEvent): string | null {
  const category = CATEGORY[event] ?? "server";
  return cfg.channels?.[category] || cfg.channel_id || null;
}

// ── Rendering a change list ──────────────────────────────────────────

/** Field names Discord uses, in words a person reading a log would use. */
const FIELD_NAMES: Record<string, string> = {
  name: "Name",
  topic: "Topic",
  color: "Colour",
  colour: "Colour",
  hoist: "Shown separately",
  mentionable: "Mentionable",
  permissions: "Permissions",
  position: "Position",
  parent_id: "Category",
  nsfw: "Age-restricted",
  rate_limit_per_user: "Slowmode",
  bitrate: "Bitrate",
  user_limit: "User limit",
  nick: "Nickname",
  communication_disabled_until: "Timed out until",
  deny: "Denied permissions",
  allow: "Allowed permissions",
  archived: "Archived",
  locked: "Locked",
  description: "Description",
  vanity_url_code: "Vanity URL",
  owner_id: "Owner",
  verification_level: "Verification level",
  explicit_content_filter: "Explicit content filter",
  system_channel_id: "System channel",
  afk_channel_id: "AFK channel",
  max_uses: "Max uses",
  temporary: "Temporary membership",
  channel_id: "Channel",
  code: "Invite code",
};

/** Permission bit → name, for the bits worth naming in a log. */
const PERMISSION_NAMES: [bigint, string][] = [
  [1n << 3n, "Administrator"],
  [1n << 5n, "Manage Server"],
  [1n << 28n, "Manage Roles"],
  [1n << 4n, "Manage Channels"],
  [1n << 1n, "Kick Members"],
  [1n << 2n, "Ban Members"],
  [1n << 40n, "Moderate Members"],
  [1n << 13n, "Manage Messages"],
  [1n << 29n, "Manage Webhooks"],
  [1n << 30n, "Manage Expressions"],
  [1n << 7n, "View Audit Log"],
  [1n << 10n, "View Channel"],
  [1n << 11n, "Send Messages"],
  [1n << 17n, "Mention Everyone"],
];

/**
 * Names the permissions that moved.
 *
 * Only the bits above are named - the full list runs to fifty and a log entry
 * that prints all of them is one nobody reads. The ones kept are the ones an
 * audit is actually looking for: anything that grants power over the server.
 */
function permissionDiff(before: unknown, after: unknown): string {
  let a: bigint;
  let b: bigint;
  try {
    a = BigInt(String(before ?? "0"));
    b = BigInt(String(after ?? "0"));
  } catch {
    return `${String(before)} → ${String(after)}`;
  }
  const gained = PERMISSION_NAMES.filter(([bit]) => (b & bit) === bit && (a & bit) !== bit).map(([, n]) => n);
  const lost = PERMISSION_NAMES.filter(([bit]) => (a & bit) === bit && (b & bit) !== bit).map(([, n]) => n);
  const parts = [gained.length ? `✅ ${gained.join(", ")}` : "", lost.length ? `❌ ${lost.join(", ")}` : ""].filter(
    Boolean,
  );
  // A change confined to bits we don't name still deserves a line, or the
  // entry claims nothing happened when something did.
  return parts.join("\n") || "changed (no notable permission gained or lost)";
}

function renderValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "_none_";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (key === "color" && typeof value === "number") {
    return value ? `#${value.toString(16).padStart(6, "0")}` : "default";
  }
  if (key === "rate_limit_per_user") return Number(value) > 0 ? `${value}s` : "off";
  if (key === "parent_id" || key === "channel_id" || key === "system_channel_id" || key === "afk_channel_id") {
    return `<#${String(value)}>`;
  }
  if (key === "owner_id") return `<@${String(value)}>`;
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === "object") return "_(complex)_";
  return String(value).slice(0, 300);
}

/** Turns one entry's `changes` into embed fields. */
function changeFields(changes: AuditLogChange[] | undefined): Embed["fields"] {
  if (!changes?.length) return [];
  const fields: NonNullable<Embed["fields"]> = [];

  for (const change of changes) {
    // Role grants and removals come through as the pseudo-keys $add / $remove.
    if (change.key === "$add" || change.key === "$remove") {
      const roles = (change.new_value as { id: string; name: string }[] | undefined) ?? [];
      fields.push({
        name: change.key === "$add" ? "Roles added" : "Roles removed",
        value: roles.map((r) => `<@&${r.id}>`).join(", ").slice(0, 1000) || "_none_",
        inline: false,
      });
      continue;
    }
    if (change.key === "permissions" || change.key === "allow" || change.key === "deny") {
      fields.push({
        name: FIELD_NAMES[change.key] ?? change.key,
        value: permissionDiff(change.old_value, change.new_value).slice(0, 1000),
        inline: false,
      });
      continue;
    }
    const before = renderValue(change.key, change.old_value);
    const after = renderValue(change.key, change.new_value);
    if (before === after) continue;
    fields.push({
      name: FIELD_NAMES[change.key] ?? change.key,
      value: `${before} → **${after}**`.slice(0, 1000),
      inline: false,
    });
  }
  return fields.slice(0, 20);
}

/**
 * MEMBER_UPDATE covers both a nickname change and a timeout, and they belong
 * in different categories - a rename is member noise, a timeout is moderation.
 */
function refine(entry: AuditLogEntry, shape: Shape): Shape {
  if (entry.action_type !== Action.MemberUpdate) return shape;
  const keys = (entry.changes ?? []).map((c) => c.key);
  if (keys.includes("communication_disabled_until")) {
    const lifted = entry.changes?.some(
      (c) => c.key === "communication_disabled_until" && !c.new_value,
    );
    return {
      event: "member_timeout",
      title: lifted ? "🔊 Timeout lifted" : "🔇 Member timed out",
      colour: MODERATION,
    };
  }
  if (keys.includes("nick")) return { event: "member_nickname", title: "🏷️ Nickname changed", colour: UPDATE };
  return shape;
}

// ── The poll ─────────────────────────────────────────────────────────

export interface AuditPollResult {
  ok: boolean;
  error?: string;
  /** Entries read from Discord this run. */
  scanned: number;
  /** Embeds actually posted (the rest were filtered or switched off). */
  posted: number;
  cursor?: string | null;
  /**
   * The page came back full: there is a backlog, and this run did not clear it.
   *
   * Nothing is lost. Given `after`, Discord reverses its usual ordering and
   * returns the *oldest* entries newer than the cursor, so a full page means
   * the next poll resumes exactly where this one stopped. What it does mean is
   * that the log is running behind real time, and a poll interval too long for
   * the server's activity never catches up - each run advances at most a page,
   * so the lag grows without bound. Reported so the scheduler's own output
   * says to run it more often.
   */
  truncated?: boolean;
}

const PAGE = 100;

const MAX_EMBEDS_PER_MESSAGE = 10;

export async function pollAuditLog(): Promise<AuditPollResult> {
  const guildId = discordEnv.guildId;
  if (!guildId || !discordEnv.botToken) {
    return { ok: false, error: "not_configured", scanned: 0, posted: 0 };
  }

  const cfg = await getBotConfig("logging");
  if (!cfg.enabled) return { ok: true, scanned: 0, posted: 0, error: "disabled" };
  if (!cfg.channel_id && !Object.values(cfg.channels ?? {}).some(Boolean)) {
    return { ok: true, scanned: 0, posted: 0, error: "no_channel" };
  }

  const state = await botDb.loggingCursor();
  const cursor = state?.cursor ?? null;

  const log = await discordRest.getAuditLog(guildId, cursor, PAGE);
  if (!log.ok || !log.data) {
    return {
      ok: false,
      // 403 here means one thing only, and it is worth saying plainly.
      error: log.status === 403 ? "missing_view_audit_log" : (log.error ?? `http_${log.status}`),
      scanned: 0,
      posted: 0,
    };
  }

  // Discord returns newest first; a log reads correctly oldest first.
  const entries = [...(log.data.audit_log_entries ?? [])].sort((a, b) => (a.id < b.id ? -1 : 1));
  if (entries.length === 0) return { ok: true, scanned: 0, posted: 0, cursor };

  const newest = entries[entries.length - 1].id;
  const truncated = entries.length >= PAGE;

  // First run has no cursor, so the whole 100-entry backlog would land at once.
  // Record where we are and start logging from the next change instead.
  if (!cursor) {
    await botDb.setLoggingCursor(newest);
    return { ok: true, scanned: entries.length, posted: 0, cursor: newest };
  }

  const users = new Map((log.data.users ?? []).map((u) => [u.id, u]));
  const byChannel = new Map<string, Embed[]>();
  let posted = 0;

  for (const entry of entries) {
    const base = SHAPES[entry.action_type];
    if (!base) continue;
    const shape = refine(entry, base);
    if (cfg.events?.[shape.event] === false) continue;

    const actorId = entry.user_id ?? null;
    const actor = actorId ? users.get(actorId) : undefined;
    // The bot's own actions are already reported by whatever performed them;
    // logging them again turns every /ban into two entries.
    if (cfg.ignore_bots && actorId === discordEnv.appId) continue;
    if (actorId && (cfg.ignored_user_ids ?? []).includes(actorId)) continue;

    const optionChannel = entry.options?.channel_id;
    if (optionChannel && (cfg.ignored_channel_ids ?? []).includes(optionChannel)) continue;

    const channelId = channelFor(cfg, shape.event);
    if (!channelId) continue;

    const description = [
      `**By:** ${actor ? `<@${actorId}> (\`${actor.username}\`)` : actorId ? `<@${actorId}>` : "Unknown"}`,
      entry.target_id ? `**Target:** \`${entry.target_id}\`` : "",
      optionChannel ? `**Channel:** <#${optionChannel}>` : "",
      entry.options?.count ? `**Count:** ${entry.options.count}` : "",
      entry.options?.role_name ? `**Role:** ${entry.options.role_name}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const fields = changeFields(entry.changes) ?? [];
    if (entry.reason) fields.push({ name: "Reason", value: String(entry.reason).slice(0, 1000) });

    const embed: Embed = {
      color: shape.colour,
      title: shape.title,
      description,
      fields,
      footer: { text: `entry ${entry.id}${actorId ? ` • actor ${actorId}` : ""}` },
      // Snowflake → time, so the entry carries when it happened rather than
      // when this cron happened to notice it.
      timestamp: new Date(Number((BigInt(entry.id) >> 22n) + 1420070400000n)).toISOString(),
    };

    const queue = byChannel.get(channelId) ?? [];
    queue.push(embed);
    byChannel.set(channelId, queue);
    posted++;
  }

  for (const [channelId, embeds] of byChannel) {
    for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
      await discordRest.createMessage(channelId, {
        embeds: embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE),
        allowed_mentions: { parse: [] },
      });
    }
  }

  // Only advance after posting: a crash mid-run re-posts a few entries next
  // time, which is a far better failure than losing them silently.
  await botDb.setLoggingCursor(newest);
  if (truncated) {
    console.warn(
      `[discord] audit-log poll filled its ${PAGE}-entry page, so the log is behind. Nothing is lost - the next run resumes from the cursor - but schedule it more often or the lag keeps growing.`,
    );
  }
  return { ok: true, scanned: entries.length, posted, cursor: newest, truncated };
}
