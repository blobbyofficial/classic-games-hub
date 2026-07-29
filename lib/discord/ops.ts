import "server-only";
import { botDb } from "./bot-db";
import { getBotConfig } from "./config";
import { brandEmbed } from "./embeds";
import { discordEnv } from "./env";
import { discordRest } from "./rest";
import {
  postTicketPanel,
  postVerificationPanel,
  refreshStatChannels,
  setupLevelRoles,
  setupStatsChannels,
  setupVerificationRoles,
} from "./setup";

/**
 * Every Discord-affecting operation, with no interaction token in sight.
 *
 * These used to live inside the `/…` command handlers, which meant the admin
 * dashboard could only ever *store* settings - the Discord side of a change
 * happened when someone ran the matching slash command, and until then the
 * panel and the server disagreed. Both surfaces now call the same functions,
 * so a moderation case looks identical whether it came from `/ban` or from the
 * website, and saving a setting can actually apply it.
 */

export interface OpResult {
  ok: boolean;
  error?: string;
  detail?: string;
}

/** Discord's own words for a failure, which beat any guess we could make. */
function failed(status: number, error: string | undefined, what: string): OpResult {
  if (status === 403) {
    return {
      ok: false,
      error: `I don't have permission to ${what}. Check my role's permissions, and for actions on a member, that my role sits above theirs.`,
    };
  }
  return { ok: false, error: `Couldn't ${what}. Discord said: ${error ?? `HTTP ${status}`}` };
}

const ACTION_EMOJI: Record<string, string> = {
  warn: "⚠️",
  timeout: "🔇",
  untimeout: "🔊",
  kick: "👢",
  ban: "🔨",
  unban: "♻️",
  purge: "🧹",
  lock: "🔒",
  unlock: "🔓",
  automod: "🤖",
};

/**
 * Shared tail of every moderation action: record a numbered case, DM the
 * member when configured, and post to the mod-log channel. Keeping this in one
 * place is why a case raised from the dashboard is indistinguishable from one
 * raised in Discord.
 */
export async function recordModAction(input: {
  actorId: string;
  actorName: string;
  targetId: string;
  targetName?: string | null;
  action: string;
  reason: string;
  minutes?: number | null;
  dm?: string | null;
}): Promise<number | undefined> {
  const cfg = await getBotConfig("moderation");
  const created = await botDb.addCase({
    actor: input.actorId,
    target: input.targetId,
    action: input.action,
    reason: input.reason,
    minutes: input.minutes ?? null,
    targetUsername: input.targetName ?? null,
  });
  await botDb.logMod(input.actorId, input.targetId, input.action, input.reason);

  if (cfg.dm_on_action && input.dm) {
    await discordRest.dmUser(input.targetId, input.dm);
  }
  if (cfg.log_channel_id) {
    await discordRest.createMessage(cfg.log_channel_id, {
      embeds: [
        brandEmbed({
          title: `${ACTION_EMOJI[input.action] ?? "🛡️"} ${input.action} - case #${created?.case ?? "?"}`,
          description: [
            `**Member:** <@${input.targetId}> (\`${input.targetId}\`)`,
            `**Moderator:** <@${input.actorId}>`,
            input.minutes ? `**Duration:** ${input.minutes} minute(s)` : "",
            `**Reason:** ${input.reason || "No reason given"}`,
          ]
            .filter(Boolean)
            .join("\n"),
          timestamp: new Date().toISOString(),
        }),
      ],
      allowed_mentions: { parse: [] },
    });
  }
  return created?.case;
}

// ── Announcements ────────────────────────────────────────────────────

export interface AnnounceInput {
  channelId: string;
  message: string;
  title?: string;
  pingRoleId?: string;
  imageUrl?: string;
  plain?: boolean;
}

export async function announce(input: AnnounceInput): Promise<OpResult> {
  const body = input.message.replace(/\\n/g, "\n");
  const content = input.pingRoleId ? `<@&${input.pingRoleId}>` : undefined;
  const payload = input.plain
    ? { content: [content, body].filter(Boolean).join("\n") }
    : {
        content,
        embeds: [
          brandEmbed({
            title: input.title || "📣 Announcement",
            description: body,
            // Only https, so a bad value can't smuggle in a javascript: URL.
            ...(input.imageUrl && /^https:\/\//.test(input.imageUrl)
              ? { image: { url: input.imageUrl } }
              : {}),
            timestamp: new Date().toISOString(),
          }),
        ],
      };

  const res = await discordRest.createMessage(input.channelId, {
    ...payload,
    // A ping can never escape the role that was chosen.
    allowed_mentions: input.pingRoleId ? { roles: [input.pingRoleId] } : { parse: [] },
  });
  if (!res.ok) return failed(res.status, res.error, "post in that channel");
  return { ok: true, detail: "Announcement posted." };
}

// ── Moderation ───────────────────────────────────────────────────────

export type ModAction = "warn" | "timeout" | "untimeout" | "kick" | "ban" | "unban";

export interface ModInput {
  action: ModAction;
  targetId: string;
  reason: string;
  minutes?: number;
  actor: { id: string; name: string };
}

export async function moderate(input: ModInput): Promise<OpResult> {
  const guildId = discordEnv.guildId;
  if (!guildId) return { ok: false, error: "DISCORD_GUILD_ID isn't set." };
  if (!/^\d{5,25}$/.test(input.targetId)) {
    return { ok: false, error: "That doesn't look like a Discord user ID." };
  }
  if (input.targetId === input.actor.id) {
    return { ok: false, error: "You can't action yourself." };
  }

  const reason = input.reason.trim() || "No reason given";
  const audit = `${reason} - by ${input.actor.name} (web)`;

  let res: { ok: boolean; status: number; error?: string };
  switch (input.action) {
    case "warn":
      // A warning is a record, not a Discord state change.
      res = { ok: true, status: 200 };
      break;
    case "timeout": {
      const minutes = Math.max(1, Math.min(40320, Math.trunc(input.minutes ?? 10)));
      const until = new Date(Date.now() + minutes * 60_000).toISOString();
      res = await discordRest.timeoutMember(guildId, input.targetId, until, audit);
      break;
    }
    case "untimeout":
      res = await discordRest.timeoutMember(guildId, input.targetId, null, audit);
      break;
    case "kick":
      res = await discordRest.kickMember(guildId, input.targetId, audit);
      break;
    case "ban":
      res = await discordRest.banMember(guildId, input.targetId, audit);
      break;
    case "unban":
      res = await discordRest.unbanMember(guildId, input.targetId, audit);
      break;
  }

  if (!res.ok) return failed(res.status, res.error, `${input.action} that member`);

  const caseNo = await recordModAction({
    actorId: input.actor.id,
    actorName: input.actor.name,
    targetId: input.targetId,
    action: input.action,
    reason,
    minutes: input.action === "timeout" ? (input.minutes ?? 10) : null,
    dm: dmFor(input.action, reason, input.minutes),
  });

  return { ok: true, detail: `${input.action} recorded as case #${caseNo ?? "?"}.` };
}

function dmFor(action: ModAction, reason: string, minutes?: number): string | null {
  switch (action) {
    case "warn":
      return `You were warned in Classic Games Hub: ${reason}`;
    case "timeout":
      return `You were timed out for ${minutes ?? 10} minute(s): ${reason}`;
    case "kick":
      return `You were removed from Classic Games Hub: ${reason}`;
    case "ban":
      return `You were banned from Classic Games Hub: ${reason}`;
    default:
      return null;
  }
}

// ── Channel controls ─────────────────────────────────────────────────

export async function purge(
  channelId: string,
  count: number,
  actor: { id: string; name: string },
): Promise<OpResult> {
  const limit = Math.max(1, Math.min(100, Math.trunc(count)));
  const list = await discordRest.getMessages(channelId, limit);
  if (!list.ok || !list.data) return failed(list.status, list.error, "read that channel");

  // Discord refuses to bulk-delete anything older than 14 days.
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const ids = list.data
    .filter((m) => new Date(m.timestamp).getTime() > cutoff)
    .map((m) => m.id);
  if (ids.length === 0) {
    return { ok: false, error: "Nothing to delete - messages older than 14 days can't be bulk-deleted." };
  }

  // Discord's bulk-delete endpoint rejects a single message - it takes 2–100.
  const res =
    ids.length === 1
      ? await discordRest.deleteMessage(channelId, ids[0], `Purge by ${actor.name} (web)`)
      : await discordRest.bulkDelete(channelId, ids, `Purge by ${actor.name} (web)`);
  if (!res.ok) return failed(res.status, res.error, "delete those messages");

  await recordModAction({
    actorId: actor.id,
    actorName: actor.name,
    targetId: actor.id,
    action: "purge",
    reason: `Deleted ${ids.length} message(s) in #${channelId}`,
  });
  return { ok: true, detail: `Deleted ${ids.length} message(s).` };
}

export async function setSlowmode(channelId: string, seconds: number): Promise<OpResult> {
  const rate = Math.max(0, Math.min(21600, Math.trunc(seconds)));
  const res = await discordRest.modifyChannel(
    channelId,
    { rate_limit_per_user: rate },
    "Slowmode set from the dashboard",
  );
  if (!res.ok) return failed(res.status, res.error, "change that channel");
  return { ok: true, detail: rate === 0 ? "Slowmode off." : `Slowmode set to ${rate}s.` };
}

export async function setChannelLock(
  channelId: string,
  locked: boolean,
  actor: { id: string; name: string },
): Promise<OpResult> {
  const guildId = discordEnv.guildId;
  if (!guildId) return { ok: false, error: "DISCORD_GUILD_ID isn't set." };

  // Editing a permission overwrite REPLACES it, so the current allow/deny have
  // to be read first - otherwise locking a channel silently drops every other
  // @everyone rule on it (and unlocking dropped them too, by writing deny: 0).
  const SEND_MESSAGES = 1n << 11n;
  const channel = await discordRest.getChannel(channelId);
  const existing = channel.data?.permission_overwrites?.find((o) => o.id === guildId);
  const allow = BigInt(existing?.allow ?? "0");
  const deny = BigInt(existing?.deny ?? "0");

  const res = await discordRest.editChannelPermissions(
    channelId,
    guildId,
    {
      type: 0,
      // Locking must also clear an explicit *allow* of SendMessages, or the
      // deny is overruled and the lock does nothing.
      allow: String(locked ? allow & ~SEND_MESSAGES : allow),
      deny: String(locked ? deny | SEND_MESSAGES : deny & ~SEND_MESSAGES),
    },
    `${locked ? "Lock" : "Unlock"} by ${actor.name} (web)`,
  );
  if (!res.ok) return failed(res.status, res.error, `${locked ? "lock" : "unlock"} that channel`);

  await recordModAction({
    actorId: actor.id,
    actorName: actor.name,
    targetId: actor.id,
    action: locked ? "lock" : "unlock",
    reason: `<#${channelId}>`,
  });
  return { ok: true, detail: locked ? "Channel locked." : "Channel unlocked." };
}

// ── Pushing saved settings to Discord ────────────────────────────────

export type PushSection = "verification" | "level_roles" | "tickets" | "stats" | "moderation";

/**
 * Applies what is stored for a section to the Discord server.
 *
 * Saving a setting writes it to Postgres; this is what makes the server match.
 * Everything it does is idempotent - an existing role or channel with the
 * expected name is reused, and panels are re-posted rather than duplicated -
 * so pushing repeatedly is safe.
 */
export async function pushSection(section: PushSection): Promise<OpResult> {
  switch (section) {
    case "level_roles": {
      const res = await setupLevelRoles();
      if (!res.ok) return { ok: false, error: `Couldn't sync milestone roles: ${res.error}` };
      return {
        ok: true,
        detail: summarise(res, "role"),
        error: res.detail ? `Some failed - Discord said: ${res.detail}` : undefined,
      };
    }
    case "verification": {
      const roles = await setupVerificationRoles();
      if (!roles.ok) return { ok: false, error: `Couldn't sync verification roles: ${roles.error}` };
      const cfg = await getBotConfig("verification");
      let panel = "";
      if (cfg.panel_channel_id) {
        const posted = await postVerificationPanel(cfg.panel_channel_id);
        panel = posted.ok ? " Verify panel re-posted." : " Couldn't re-post the verify panel.";
      } else {
        panel =
          " No panel was posted: set **Panel channel ID** under Join verification below, then press Save.";
      }
      return { ok: true, detail: summarise(roles, "role") + panel };
    }
    case "tickets": {
      const cfg = await getBotConfig("tickets");
      if (!cfg.panel_channel_id) {
        return {
          ok: false,
          error: "Set **Panel channel ID** under Tickets below, then press Save - that posts the panel and lets this re-post it.",
        };
      }
      const posted = await postTicketPanel(cfg.panel_channel_id);
      if (!posted.ok) return failed(posted.status, posted.error, "post the ticket panel");
      return { ok: true, detail: "Ticket panel re-posted." };
    }
    case "stats": {
      const cfg = await getBotConfig("stats");
      if (!cfg.enabled) {
        return { ok: false, error: "Counters are switched off - tick **Counters enabled** under Live counters and save." };
      }
      const created = await setupStatsChannels();
      if (!created.ok) return { ok: false, error: `Couldn't sync counters: ${created.error}` };
      const refreshed = await refreshStatChannels();
      return {
        ok: true,
        detail: `${summarise(created, "channel")} ${
          refreshed.ok ? `Renamed ${refreshed.updated.length}.` : "Nothing to rename yet."
        }`,
      };
    }
    case "moderation":
      // Automod rules and the log channel are read at the moment they're used,
      // so there is genuinely nothing to push - saying so beats a fake tick.
      return { ok: true, detail: "Moderation settings apply immediately - nothing to push." };
  }
}

function summarise(
  res: { created: string[]; reused: string[]; updated?: string[]; missing?: string[]; failed: string[] },
  noun: string,
): string {
  const bits = [
    res.created.length ? `created ${res.created.length}` : "",
    res.updated?.length ? `updated ${res.updated.length}` : "",
    res.reused.length ? `already correct ${res.reused.length}` : "",
    res.failed.length ? `failed ${res.failed.length}` : "",
  ].filter(Boolean);
  const missing = res.missing?.length
    ? ` Linked ${noun}${res.missing.length === 1 ? "" : "s"} not found in the server: ${res.missing.join(", ")} - left alone, not replaced.`
    : "";
  return `${noun}s: ${bits.join(", ") || "nothing to do"}.${missing}`;
}
