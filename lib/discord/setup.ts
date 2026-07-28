import "server-only";
import { botDb } from "./bot-db";
import { getBotConfig, template } from "./config";
import { verificationPanel, ticketPanel } from "./components";
import { discordEnv } from "./env";
import { ChannelType, Permissions, discordRest } from "./rest";

/**
 * One-command server setup. These run from `/setup …` (admin-only slash
 * commands) so the roles, panels and counter channels the bot needs can be
 * created *inside Discord* — nothing to copy/paste into the dashboard, and
 * every ID it creates is written straight back into `discord_bot_config`.
 *
 * All of it is idempotent: an existing role/channel with the expected name is
 * reused instead of duplicated.
 */

/** Level-milestone role colours, low → high. */
const MILESTONE_COLORS = [
  0x95a5a6, 0x3498db, 0x1abc9c, 0x2ecc71, 0xf1c40f, 0xe67e22, 0xe74c3c, 0x9b59b6, 0x7a3dff,
];

export interface SetupResult {
  ok: boolean;
  error?: string;
  created: string[];
  reused: string[];
  failed: string[];
  /**
   * Discord's own words for the first failure, e.g. "Missing Permissions
   * (50013)". Guessing at the cause in the summary sent people checking role
   * hierarchy for problems that were nothing to do with it — a created role
   * always lands at the bottom, so hierarchy cannot be why creation failed.
   */
  detail?: string;
}

const empty = (): Omit<SetupResult, "ok" | "error"> => ({ created: [], reused: [], failed: [] });

/** Discord's message and code for a failed call, for showing to an admin. */
function describe(res: { status?: number; error?: string }): string {
  const code = res.status ? ` (HTTP ${res.status})` : "";
  return `${res.error ?? "unknown error"}${code}`;
}

/** Milestone level roles — the Arcane level-reward replacement. */
export async function setupLevelRoles(): Promise<SetupResult> {
  const guildId = discordEnv.guildId;
  if (!guildId || !discordEnv.botToken) return { ok: false, error: "not_configured", ...empty() };

  const cfg = await getBotConfig("level_roles");
  const existing = await discordRest.listGuildRoles(guildId);
  if (!existing.ok || !existing.data) {
    return { ok: false, error: existing.status === 403 ? "missing_permissions" : "api", ...empty() };
  }

  const byName = new Map(existing.data.map((r) => [r.name.toLowerCase(), r]));
  const byId = new Map(existing.data.map((r) => [r.id, r]));
  const result: SetupResult = { ok: true, ...empty() };
  const roles: Record<string, string> = { ...cfg.roles };
  const milestones = [...(cfg.milestones ?? [])].sort((a, b) => a - b);

  for (const [index, level] of milestones.entries()) {
    const name = template(cfg.name_template || "Level {level}", { level });
    const mapped = roles[String(level)];
    if (mapped && byId.has(mapped)) {
      result.reused.push(name);
      continue;
    }
    const found = byName.get(name.toLowerCase());
    if (found) {
      roles[String(level)] = found.id;
      result.reused.push(name);
      continue;
    }
    const created = await discordRest.createRole(
      guildId,
      {
        name,
        color: MILESTONE_COLORS[Math.min(index, MILESTONE_COLORS.length - 1)],
        hoist: false,
        mentionable: false,
      },
      "Classic Games Hub — level milestone role",
    );
    if (created.ok && created.data) {
      roles[String(level)] = created.data.id;
      result.created.push(name);
    } else {
      result.failed.push(name);
      result.detail ??= describe(created);
    }
    await new Promise((r) => setTimeout(r, 120)); // stay well inside rate limits
  }

  await botDb.patchConfig("level_roles", { roles, enabled: true });
  return result;
}

/** Verified / Unverified roles for the join gate. */
export async function setupVerificationRoles(): Promise<SetupResult & { verified?: string; unverified?: string }> {
  const guildId = discordEnv.guildId;
  if (!guildId || !discordEnv.botToken) return { ok: false, error: "not_configured", ...empty() };

  const cfg = await getBotConfig("verification");
  const existing = await discordRest.listGuildRoles(guildId);
  if (!existing.ok || !existing.data) {
    return { ok: false, error: existing.status === 403 ? "missing_permissions" : "api", ...empty() };
  }
  const byName = new Map(existing.data.map((r) => [r.name.toLowerCase(), r]));
  const byId = new Map(existing.data.map((r) => [r.id, r]));
  const result: SetupResult & { verified?: string; unverified?: string } = { ok: true, ...empty() };

  const ensure = async (name: string, color: number, current: string | null) => {
    if (current && byId.has(current)) {
      result.reused.push(name);
      return current;
    }
    const found = byName.get(name.toLowerCase());
    if (found) {
      result.reused.push(name);
      return found.id;
    }
    const created = await discordRest.createRole(
      guildId,
      { name, color, hoist: false, mentionable: false },
      "Classic Games Hub — verification",
    );
    if (created.ok && created.data) {
      result.created.push(name);
      return created.data.id;
    }
    result.failed.push(name);
    result.detail ??= describe(created);
    return null;
  };

  const verified = await ensure("Verified", 0x2ecc71, cfg.verified_role_id);
  const unverified = await ensure("Unverified", 0x607080, cfg.unverified_role_id);

  await botDb.patchConfig("verification", {
    verified_role_id: verified,
    unverified_role_id: unverified,
  });
  return { ...result, verified: verified ?? undefined, unverified: unverified ?? undefined };
}

/** Posts (or re-posts) the verification panel into a channel. */
export async function postVerificationPanel(channelId: string) {
  const cfg = await getBotConfig("verification");
  const res = await discordRest.createMessage(channelId, verificationPanel(cfg));
  if (res.ok) await botDb.patchConfig("verification", { panel_channel_id: channelId, enabled: true });
  return res;
}

/** Posts (or re-posts) the ticket panel into a channel. */
export async function postTicketPanel(channelId: string) {
  const cfg = await getBotConfig("tickets");
  const res = await discordRest.createMessage(channelId, ticketPanel(cfg));
  if (res.ok) await botDb.patchConfig("tickets", { enabled: true });
  return res;
}

/**
 * Creates the live-counter voice channels (nobody can join them; the name is
 * the display). Reuses channels already recorded in the config.
 */
export async function setupStatsChannels(): Promise<SetupResult> {
  const guildId = discordEnv.guildId;
  if (!guildId || !discordEnv.botToken) return { ok: false, error: "not_configured", ...empty() };

  const cfg = await getBotConfig("stats");
  const channels = await discordRest.listGuildChannels(guildId);
  if (!channels.ok || !channels.data) {
    return { ok: false, error: channels.status === 403 ? "missing_permissions" : "api", ...empty() };
  }
  const byId = new Map(channels.data.map((c) => [c.id, c]));
  const result: SetupResult = { ok: true, ...empty() };

  // A category to keep the counters together at the top of the channel list.
  let categoryId = channels.data.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "📊 hub stats",
  )?.id;
  if (!categoryId) {
    const cat = await discordRest.createChannel(
      guildId,
      { name: "📊 Hub stats", type: ChannelType.GuildCategory },
      "Classic Games Hub — stat counters",
    );
    if (cat.ok && cat.data) categoryId = cat.data.id;
  }

  const next: Record<string, string | null> = { ...cfg.channels };
  const stats = await botDb.statsExtended();
  const vars = {
    online: stats?.online ?? 0,
    members: stats?.members ?? 0,
    plays: stats?.plays_today ?? 0,
    discord_members: 0,
  };

  for (const key of ["online", "members", "plays"] as const) {
    const current = cfg.channels[key];
    if (current && byId.has(current)) {
      result.reused.push(key);
      continue;
    }
    const name = template(cfg.templates[key], vars);
    const created = await discordRest.createChannel(
      guildId,
      {
        name,
        type: ChannelType.GuildVoice,
        parent_id: categoryId ?? undefined,
        // Visible to everyone, joinable by nobody — it's a display, not a call.
        permission_overwrites: [
          { id: guildId, type: 0, allow: String(Permissions.ViewChannel), deny: String(Permissions.Connect) },
        ],
      },
      "Classic Games Hub — stat counter",
    );
    if (created.ok && created.data) {
      next[key] = created.data.id;
      result.created.push(key);
    } else {
      result.failed.push(key);
      result.detail ??= describe(created);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  await botDb.patchConfig("stats", { channels: { ...cfg.channels, ...next }, enabled: true });
  return result;
}

/**
 * Renames the configured counter channels to the current numbers. Safe to
 * call on a schedule — Discord rate-limits channel renames to roughly two per
 * ten minutes per channel, so don't call it more often than that.
 */
export async function refreshStatChannels(): Promise<{
  ok: boolean;
  updated: string[];
  skipped: string[];
}> {
  const updated: string[] = [];
  const skipped: string[] = [];
  const cfg = await getBotConfig("stats");
  if (!cfg.enabled || !discordEnv.botToken) return { ok: false, updated, skipped };

  const stats = await botDb.statsExtended();
  if (!stats) return { ok: false, updated, skipped };

  let discordMembers = 0;
  if (cfg.channels.discord_members && discordEnv.guildId) {
    const guild = await discordRest.getGuildCounts(discordEnv.guildId);
    discordMembers = guild.data?.approximate_member_count ?? 0;
  }

  const vars = {
    online: stats.online,
    members: stats.members,
    plays: stats.plays_today,
    plays_total: stats.plays_total,
    linked: stats.linked,
    discord_members: discordMembers,
  };

  for (const key of ["online", "members", "plays", "discord_members"] as const) {
    const channelId = cfg.channels[key];
    if (!channelId) continue;
    const name = template(cfg.templates[key], vars).slice(0, 100);
    const current = await discordRest.getChannel(channelId);
    if (current.ok && current.data?.name === name) {
      skipped.push(key); // don't burn a rename on an unchanged number
      continue;
    }
    const res = await discordRest.modifyChannel(channelId, { name }, "Hub stat counter");
    (res.ok ? updated : skipped).push(key);
  }

  return { ok: true, updated, skipped };
}
