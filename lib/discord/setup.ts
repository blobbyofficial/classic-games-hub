import "server-only";
import { botDb } from "./bot-db";
import { getBotConfig, template } from "./config";
import { verificationPanel, ticketPanel } from "./components";
import { SLASH_COMMANDS } from "./commands";
import { BOT_NAME } from "./embeds";
import { discordEnv } from "./env";
import type { GuildChannel, PermissionOverwrite } from "./rest";
import { ChannelType, Permissions, discordRest } from "./rest";

/**
 * One-command server setup. These run from `/setup …` (admin-only slash
 * commands) so the roles, panels and counter channels the bot needs can be
 * created *inside Discord* - nothing to copy/paste into the dashboard, and
 * every ID it creates is written straight back into `discord_bot_config`.
 *
 * All of it is idempotent: an existing role/channel with the expected name is
 * reused instead of duplicated.
 */

/** Level-milestone role colours, low → high. */
const MILESTONE_COLORS = [
  0x95a5a6, 0x3498db, 0x1abc9c, 0x2ecc71, 0xf1c40f, 0xe67e22, 0xe74c3c, 0x9b59b6, 0x7a3dff,
];

/**
 * What setup creates when the server has nothing suitable yet.
 *
 * These are matched by name before anything is created, so a server that
 * already runs a #verify or a Staff role keeps using it rather than gaining a
 * near-duplicate beside it. Renaming one afterwards is safe: the id is written
 * into `discord_bot_config`, and a configured id always wins over the name.
 */
const PROVISIONED = {
  verifyChannel: "✅-verify",
  ticketChannel: "🎫-support",
  ticketCategory: "🎫 Tickets",
  staffRole: "Staff",
  updateChannel: "📝-update-log",
  announceChannel: "📢-announcements",
} as const;

export interface SetupResult {
  ok: boolean;
  error?: string;
  created: string[];
  reused: string[];
  /** Existing roles/channels that were renamed or restyled to match settings. */
  updated: string[];
  /**
   * IDs that are configured but no longer exist in the server. These are never
   * silently replaced with a new role or channel: an ID typed into the
   * dashboard is an instruction to use *that* one, so if it can't be found the
   * honest answer is to say so, not to hand back a default-named duplicate the
   * admin then has to hunt down and delete.
   */
  missing: string[];
  failed: string[];
  /**
   * Discord's own words for the first failure, e.g. "Missing Permissions
   * (50013)". Guessing at the cause in the summary sent people checking role
   * hierarchy for problems that were nothing to do with it - a created role
   * always lands at the bottom, so hierarchy cannot be why creation failed.
   */
  detail?: string;
}

/**
 * A setup step that resolves the channel a panel is posted into.
 *
 * Carrying the id back rather than making the caller re-read the config is what
 * makes the panel post reliable: the id *is* written back, but a panel that
 * depends on that write having landed silently posts nowhere if the write
 * fails. The name comes with it purely so the report can say where it went.
 */
export type ChannelSetupResult = SetupResult & { channel?: string; channelName?: string };

const empty = (): Omit<SetupResult, "ok" | "error"> => ({
  created: [],
  reused: [],
  updated: [],
  missing: [],
  failed: [],
});

/** Discord's message and code for a failed call, for showing to an admin. */
function describe(res: { status?: number; error?: string }): string {
  const code = res.status ? ` (HTTP ${res.status})` : "";
  return `${res.error ?? "unknown error"}${code}`;
}

type ChannelSpec = {
  name: string;
  type: number;
  parent_id?: string | null;
  topic?: string;
  permission_overwrites?: PermissionOverwrite[];
};

/**
 * Finds, adopts or creates one channel, recording which of the three happened.
 *
 * Matching is by name because a name is what an admin actually sees. Plenty of
 * servers already have a #verify or a ticket category from a previous bot, and
 * quietly creating a second one beside it - identical but empty - is the kind
 * of mess a setup button is supposed to avoid.
 *
 * A configured id is treated the way the role helpers treat one: as an
 * instruction to use *that* channel. If it has since been deleted the honest
 * answer is to report it missing, not to hand back a fresh default-named
 * channel the admin then has to notice and clean up.
 */
async function ensureChannel(
  guildId: string,
  existing: GuildChannel[],
  configured: string | null,
  spec: ChannelSpec,
  reason: string,
  result: SetupResult,
): Promise<{ id: string; name: string } | null> {
  if (configured) {
    // Reported with the channel's *actual* name, not the name setup would have
    // given it - an admin who pointed this at #welcome needs the report to say
    // #welcome, or the panel looks like it went somewhere it did not.
    const linked = existing.find((c) => c.id === configured);
    if (linked) {
      result.reused.push(linked.name);
      return { id: linked.id, name: linked.name };
    }
    result.missing.push(`${spec.name} (${configured})`);
    return null;
  }

  const found = existing.find(
    (c) => c.type === spec.type && c.name.toLowerCase() === spec.name.toLowerCase(),
  );
  if (found) {
    result.reused.push(found.name);
    return { id: found.id, name: found.name };
  }

  const created = await discordRest.createChannel(guildId, spec, reason);
  await new Promise((r) => setTimeout(r, 150)); // stay well inside rate limits
  if (created.ok && created.data) {
    result.created.push(spec.name);
    return { id: created.data.id, name: created.data.name || spec.name };
  }
  result.failed.push(spec.name);
  result.detail ??= describe(created);
  return null;
}

/**
 * A panel channel everyone can read and nobody can talk in. Both panels are one
 * button in an otherwise empty channel; letting members chat there buries the
 * thing they came to press.
 *
 * ViewChannel is allowed explicitly rather than left to inherit, because the
 * verification gate works by denying @everyone elsewhere - and a gate members
 * cannot see is a locked server.
 */
const panelOverwrites = (guildId: string): PermissionOverwrite[] => [
  {
    id: guildId,
    type: 0,
    allow: String(Permissions.ViewChannel | Permissions.ReadMessageHistory),
    deny: String(Permissions.SendMessages),
  },
];

/** Milestone level roles - the Arcane level-reward replacement. */
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
    const name = template(cfg.name_template || "Level {level}", { level }).slice(0, 100);
    const color = MILESTONE_COLORS[Math.min(index, MILESTONE_COLORS.length - 1)];
    const mapped = roles[String(level)];

    // An ID in the config means "use this role". Bring it in line with the
    // current name template and colour rather than leaving it as it was.
    if (mapped) {
      const role = byId.get(mapped);
      if (!role) {
        result.missing.push(`${name} (${mapped})`);
        continue;
      }
      if (role.name !== name || role.color !== color) {
        const patched = await discordRest.modifyRole(
          guildId,
          mapped,
          { name, color },
          `${BOT_NAME} - level milestone role`,
        );
        if (patched.ok) result.updated.push(name);
        else {
          result.failed.push(name);
          result.detail ??= describe(patched);
        }
      } else {
        result.reused.push(name);
      }
      continue;
    }

    // No ID configured: adopt a role that already has the right name.
    const found = byName.get(name.toLowerCase());
    if (found) {
      roles[String(level)] = found.id;
      result.reused.push(name);
      continue;
    }
    const created = await discordRest.createRole(
      guildId,
      { name, color, hoist: false, mentionable: false },
      `${BOT_NAME} - level milestone role`,
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
    // A linked role is used and brought in line - never swapped for a new one.
    if (current) {
      const role = byId.get(current);
      if (!role) {
        result.missing.push(`${name} (${current})`);
        return current;
      }
      if (role.name !== name || role.color !== color) {
        const patched = await discordRest.modifyRole(
          guildId,
          current,
          { name, color },
          `${BOT_NAME} - verification`,
        );
        if (patched.ok) result.updated.push(name);
        else {
          result.failed.push(name);
          result.detail ??= describe(patched);
        }
      } else {
        result.reused.push(name);
      }
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
      `${BOT_NAME} - verification`,
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

/**
 * The channel the verification panel lives in, created if the server has none.
 *
 * Which channel members see used to be left to the admin on the grounds that it
 * is a human decision. It is - but "somewhere newcomers can press verify" has
 * one obvious answer, and making the button stop half-done to ask for it left
 * fresh servers with roles and no gate.
 */
export async function setupVerificationChannel(): Promise<ChannelSetupResult> {
  const guildId = discordEnv.guildId;
  if (!guildId || !discordEnv.botToken) return { ok: false, error: "not_configured", ...empty() };

  const cfg = await getBotConfig("verification");
  const channels = await discordRest.listGuildChannels(guildId);
  if (!channels.ok || !channels.data) {
    return { ok: false, error: channels.status === 403 ? "missing_permissions" : "api", ...empty() };
  }

  const result: ChannelSetupResult = { ok: true, ...empty() };
  const channel = await ensureChannel(
    guildId,
    channels.data,
    cfg.panel_channel_id,
    {
      name: PROVISIONED.verifyChannel,
      type: ChannelType.GuildText,
      topic: "Press the button to get access to the server.",
      permission_overwrites: panelOverwrites(guildId),
    },
    `${BOT_NAME} - verification panel`,
    result,
  );

  if (channel) {
    await botDb.patchConfig("verification", { panel_channel_id: channel.id });
    result.channel = channel.id;
    result.channelName = channel.name;
  }
  return result;
}

/**
 * Everything a ticket needs before one can be opened: a staff role to see it,
 * a category to open under, and a channel to hold the panel.
 *
 * Order matters. The category's overwrites name the staff role, so resolving
 * the role second would file every ticket under a category staff cannot read
 * until the next run.
 */
export async function setupTicketSpace(): Promise<ChannelSetupResult> {
  const guildId = discordEnv.guildId;
  if (!guildId || !discordEnv.botToken) return { ok: false, error: "not_configured", ...empty() };

  const cfg = await getBotConfig("tickets");
  const [channels, roles] = await Promise.all([
    discordRest.listGuildChannels(guildId),
    discordRest.listGuildRoles(guildId),
  ]);
  if (!channels.ok || !channels.data || !roles.ok || !roles.data) {
    const failed = channels.ok ? roles : channels;
    return { ok: false, error: failed.status === 403 ? "missing_permissions" : "api", ...empty() };
  }

  const result: ChannelSetupResult = { ok: true, ...empty() };

  // Held separately from what gets written back: a configured-but-deleted role
  // is reported and left alone, but it must not end up in an overwrite, which
  // Discord rejects for an id that no longer resolves.
  let staffRoleId: string | null = null;
  if (cfg.staff_role_id) {
    if (roles.data.some((r) => r.id === cfg.staff_role_id)) {
      staffRoleId = cfg.staff_role_id;
      result.reused.push(PROVISIONED.staffRole);
    } else {
      result.missing.push(`${PROVISIONED.staffRole} (${cfg.staff_role_id})`);
    }
  } else {
    const found = roles.data.find(
      (r) => r.name.toLowerCase() === PROVISIONED.staffRole.toLowerCase(),
    );
    if (found) {
      staffRoleId = found.id;
      result.reused.push(PROVISIONED.staffRole);
    } else {
      const created = await discordRest.createRole(
        guildId,
        { name: PROVISIONED.staffRole, color: 0x5865f2, hoist: true, mentionable: false },
        `${BOT_NAME} - ticket staff`,
      );
      await new Promise((r) => setTimeout(r, 120));
      if (created.ok && created.data) {
        staffRoleId = created.data.id;
        result.created.push(PROVISIONED.staffRole);
      } else {
        result.failed.push(PROVISIONED.staffRole);
        result.detail ??= describe(created);
      }
    }
  }

  // Hidden from @everyone at the category so a ticket is private for the moment
  // between being created and its own overwrites landing.
  const category = await ensureChannel(
    guildId,
    channels.data,
    cfg.category_id,
    {
      name: PROVISIONED.ticketCategory,
      type: ChannelType.GuildCategory,
      permission_overwrites: [
        { id: guildId, type: 0, allow: "0", deny: String(Permissions.ViewChannel) },
        ...(staffRoleId
          ? [
              {
                id: staffRoleId,
                type: 0 as const,
                allow: String(Permissions.ViewChannel | Permissions.ReadMessageHistory),
                deny: "0",
              },
            ]
          : []),
      ],
    },
    `${BOT_NAME} - ticket category`,
    result,
  );

  // Deliberately not filed under that category - it is the one public part of
  // the ticket system, and inheriting the category's deny would hide the panel
  // from the members meant to press it.
  const channel = await ensureChannel(
    guildId,
    channels.data,
    cfg.panel_channel_id,
    {
      name: PROVISIONED.ticketChannel,
      type: ChannelType.GuildText,
      topic: "Open a private ticket and a staff member will be with you.",
      permission_overwrites: panelOverwrites(guildId),
    },
    `${BOT_NAME} - ticket panel`,
    result,
  );

  const patch: Record<string, string> = {};
  if (staffRoleId) patch.staff_role_id = staffRoleId;
  if (category) patch.category_id = category.id;
  if (channel) {
    patch.panel_channel_id = channel.id;
    result.channel = channel.id;
    result.channelName = channel.name;
  }
  if (Object.keys(patch).length) await botDb.patchConfig("tickets", patch);

  return result;
}

/**
 * The two channels the website mirrors itself into.
 *
 * Both take the panel treatment - readable by everyone, writable by nobody -
 * for the same reason the panels do: these are a feed the site writes, and a
 * conversation running through a changelog makes it unreadable as one. Replies
 * belong in whichever channel the server already talks in.
 *
 * Returns both ids rather than one, so `ChannelSetupResult.channel` is left
 * meaning "the one channel this step resolved" everywhere else it is used.
 */
export async function setupPublishingChannels(): Promise<
  SetupResult & { updateChannel?: string; announceChannel?: string }
> {
  const guildId = discordEnv.guildId;
  if (!guildId || !discordEnv.botToken) return { ok: false, error: "not_configured", ...empty() };

  const cfg = await getBotConfig("publishing");
  const channels = await discordRest.listGuildChannels(guildId);
  if (!channels.ok || !channels.data) {
    return { ok: false, error: channels.status === 403 ? "missing_permissions" : "api", ...empty() };
  }

  const result: SetupResult = { ok: true, ...empty() };

  const updates = await ensureChannel(
    guildId,
    channels.data,
    cfg.update_channel_id,
    {
      name: PROVISIONED.updateChannel,
      type: ChannelType.GuildText,
      topic: "Every release, mirrored from the website - the full log lives at /updates.",
      permission_overwrites: panelOverwrites(guildId),
    },
    `${BOT_NAME} - update log`,
    result,
  );

  const announcements = await ensureChannel(
    guildId,
    channels.data,
    cfg.announce_channel_id,
    {
      name: PROVISIONED.announceChannel,
      type: ChannelType.GuildText,
      topic: "Announcements published on the website appear here.",
      permission_overwrites: panelOverwrites(guildId),
    },
    `${BOT_NAME} - announcements`,
    result,
  );

  const patch: Record<string, string> = {};
  if (updates) patch.update_channel_id = updates.id;
  if (announcements) patch.announce_channel_id = announcements.id;
  if (Object.keys(patch).length) await botDb.patchConfig("publishing", patch);

  return { ...result, updateChannel: updates?.id, announceChannel: announcements?.id };
}

/** Posts (or re-posts) the verification panel into a channel. */
export async function postVerificationPanel(channelId: string) {
  const cfg = await getBotConfig("verification");
  return upsertPanel("verification", channelId, cfg.panel_message_id, verificationPanel(cfg));
}

/**
 * Posts a panel, or edits the existing one when we already have its message.
 *
 * Saving a section pushes it, so a panel that was re-posted every time would
 * leave a trail of duplicates down the channel after a few edits. Editing in
 * place also means the panel's wording updates where people already see it,
 * instead of the live one going stale below a newer copy.
 */
async function upsertPanel(
  key: "verification" | "tickets",
  channelId: string,
  messageId: string | null,
  payload: unknown,
) {
  if (messageId) {
    const edited = await discordRest.editMessage(channelId, messageId, payload);
    if (edited.ok) {
      await botDb.patchConfig(key, { panel_channel_id: channelId, enabled: true });
      return edited;
    }
    // Deleted by hand, or the channel changed - fall through and post a new one.
  }
  const res = await discordRest.createMessage(channelId, payload);
  if (res.ok) {
    await botDb.patchConfig(key, {
      panel_channel_id: channelId,
      panel_message_id: res.data?.id ?? null,
      enabled: true,
    });
  }
  return res;
}

/** Posts (or re-posts) the ticket panel into a channel. */
export async function postTicketPanel(channelId: string) {
  const cfg = await getBotConfig("tickets");
  return upsertPanel("tickets", channelId, cfg.panel_message_id, ticketPanel(cfg));
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
  // Resolved lazily: if every counter is already linked to a channel there is
  // nothing to file, and creating an empty "📊 Hub stats" category each push
  // was its own small mess.
  let categoryId = channels.data.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "📊 hub stats",
  )?.id;
  const ensureCategory = async () => {
    if (categoryId) return categoryId;
    const cat = await discordRest.createChannel(
      guildId,
      { name: "📊 Hub stats", type: ChannelType.GuildCategory },
      `${BOT_NAME} - stat counters`,
    );
    if (cat.ok && cat.data) categoryId = cat.data.id;
    return categoryId;
  };

  const next: Record<string, string | null> = { ...cfg.channels };
  const stats = await botDb.statsExtended();

  // Only a placeholder name for freshly created channels. `refreshStatChannels`
  // runs straight after and does the real naming: it is the only one that
  // resolves every template variable ({plays_total}, {linked}) and fetches the
  // Discord member count, so naming here as well would write a worse name and
  // burn one of Discord's two renames per ten minutes doing it.
  const vars = {
    online: stats?.online ?? 0,
    members: stats?.members ?? 0,
    plays: stats?.plays_today ?? 0,
    discord_members: 0,
  };

  for (const key of ["online", "members", "plays", "discord_members"] as const) {
    const current = cfg.channels[key];

    // A linked channel is adopted as-is; the refresh pass renames it.
    if (current) {
      if (byId.has(current)) result.reused.push(key);
      else result.missing.push(`${key} (${current})`);
      continue;
    }

    // Only the Discord member counter is optional - the rest are created when
    // no channel is linked. Without an ID here there is nothing to count into.
    if (key === "discord_members") continue;

    const name = template(cfg.templates[key], vars).slice(0, 100);

    const created = await discordRest.createChannel(
      guildId,
      {
        name,
        type: ChannelType.GuildVoice,
        parent_id: (await ensureCategory()) ?? undefined,
        // Visible to everyone, joinable by nobody - it's a display, not a call.
        permission_overwrites: [
          { id: guildId, type: 0, allow: String(Permissions.ViewChannel), deny: String(Permissions.Connect) },
        ],
      },
      `${BOT_NAME} - stat counter`,
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
 * call on a schedule - Discord rate-limits channel renames to roughly two per
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

/* ────────────────────────────────────────────────────────────────────────────
   One-click full setup
   ──────────────────────────────────────────────────────────────────────────── */

export interface SetupStep {
  key: string;
  label: string;
  status: "ok" | "skipped" | "failed";
  detail: string;
}

export interface FullSetupResult {
  ok: boolean;
  /** Set when nothing could run at all (missing credentials). */
  error?: string;
  steps: SetupStep[];
}

/**
 * Runs every setup step in dependency order and reports on each one.
 *
 * Deliberately does NOT stop at the first failure. Setting up a Discord server
 * fails in partial, unrelated ways - the bot may be able to create roles but
 * not post in a channel it cannot see - and aborting at step two would hide
 * the four things that would have worked. A finished report of six outcomes is
 * far more useful to an admin than one error and an unknown state.
 *
 * Every step is idempotent (the underlying helpers reuse anything already
 * present), so re-running after fixing a permission is always safe and only
 * does the work still outstanding.
 */
export async function runFullSetup(): Promise<FullSetupResult> {
  // Fail fast on credentials rather than letting six steps produce six copies
  // of the same "couldn't reach Discord" message.
  if (!discordEnv.botToken || !discordEnv.guildId) {
    return {
      ok: false,
      error:
        "DISCORD_BOT_TOKEN and DISCORD_GUILD_ID must both be set before setup can run.",
      steps: [],
    };
  }

  const steps: SetupStep[] = [];
  const summarise = (res: SetupResult) =>
    [
      `created ${res.created.length}`,
      `updated ${res.updated.length}`,
      `already correct ${res.reused.length}`,
      `failed ${res.failed.length}`,
    ].join(", ") + (res.detail ? `. Discord said: ${res.detail}` : ".");

  const record = async <T extends SetupResult>(
    key: string,
    label: string,
    run: () => Promise<T>,
  ): Promise<T | null> => {
    try {
      const res = await run();
      steps.push({
        key,
        label,
        status: res.ok ? (res.failed.length ? "skipped" : "ok") : "failed",
        detail: res.ok
          ? summarise(res)
          : res.error === "missing_permissions"
            ? "The bot needs Manage Roles and Manage Channels, and its own role must sit above any it manages."
            : (res.detail ?? res.error ?? "Could not reach Discord."),
      });
      return res;
    } catch (err) {
      steps.push({
        key,
        label,
        status: "failed",
        detail: err instanceof Error ? err.message : "Unexpected error.",
      });
      return null;
    }
  };

  // 1. Slash commands. First because every other feature is reached through
  //    them, and it is the step most often forgotten - commands do not appear
  //    in Discord until they are registered.
  if (discordEnv.appId) {
    const path = `/applications/${discordEnv.appId}/guilds/${discordEnv.guildId}/commands`;
    try {
      const res = await fetch(`https://discord.com/api/v10${path}`, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${discordEnv.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(SLASH_COMMANDS),
      });
      steps.push({
        key: "commands",
        label: "Slash commands",
        status: res.ok ? "ok" : "failed",
        detail: res.ok
          ? `Registered ${SLASH_COMMANDS.length} commands to the guild.`
          : `Discord returned HTTP ${res.status}.`,
      });
    } catch (err) {
      steps.push({
        key: "commands",
        label: "Slash commands",
        status: "failed",
        detail: err instanceof Error ? err.message : "Could not reach Discord.",
      });
    }
  } else {
    steps.push({
      key: "commands",
      label: "Slash commands",
      status: "skipped",
      detail: "DISCORD_CLIENT_ID is not set, so commands could not be registered.",
    });
  }

  // 2. Verification roles before the panel that hands them out.
  await record("verification_roles", "Verification roles", setupVerificationRoles);

  // 3. Level roles.
  await record("level_roles", "Level roles", setupLevelRoles);

  // 4. Counter channels.
  await record("stats_channels", "Counter channels", setupStatsChannels);

  // 5. The channel the verification panel lives in, then the panel itself.
  //    Both panels need somewhere to be posted, and leaving that to the admin
  //    meant a fresh server finished setup with verification roles but no gate
  //    handing them out - the one step that makes the rest do anything.
  const verify = await record(
    "verification_channel",
    "Verification channel",
    setupVerificationChannel,
  );

  // The channel this run just resolved, not a re-read of the config. The id has
  // already been written back, but making the panel depend on that write having
  // landed turns one failed round trip into a panel that silently never posts -
  // which is the exact failure this step exists to remove.
  const verifyChannel =
    verify?.channel ?? (await getBotConfig("verification")).panel_channel_id;
  if (verifyChannel) {
    const res = await postVerificationPanel(verifyChannel);
    const where = verify?.channelName ? `#${verify.channelName}` : "the configured channel";
    steps.push({
      key: "verification_panel",
      label: "Verification panel",
      status: res.ok ? "ok" : "failed",
      detail: res.ok
        ? `Posted in ${where} (or updated in place).`
        : `Could not post in ${where}: ${describe(res)}. Check the bot can see and send there.`,
    });
  } else {
    steps.push({
      key: "verification_panel",
      label: "Verification panel",
      status: "skipped",
      detail:
        "No channel to post into - the previous step could not create or find one. Fix that, or pick a channel below and save.",
    });
  }

  // 6. Ticket staff role, category and panel channel, then the panel.
  const tickets = await record("ticket_space", "Ticket roles and channels", setupTicketSpace);

  const ticketChannel = tickets?.channel ?? (await getBotConfig("tickets")).panel_channel_id;
  if (ticketChannel) {
    const res = await postTicketPanel(ticketChannel);
    const where = tickets?.channelName ? `#${tickets.channelName}` : "the configured channel";
    steps.push({
      key: "ticket_panel",
      label: "Ticket panel",
      status: res.ok ? "ok" : "failed",
      detail: res.ok
        ? `Posted in ${where} (or updated in place).`
        : `Could not post in ${where}: ${describe(res)}. Check the bot can see and send there.`,
    });
  } else {
    steps.push({
      key: "ticket_panel",
      label: "Ticket panel",
      status: "skipped",
      detail:
        "No channel to post into - the previous step could not create or find one. Fix that, or pick a channel below and save.",
    });
  }

  // 7. The two channels the website mirrors itself into, then the first sync.
  //    Provisioned here for the same reason the panel channels are: a mirror
  //    with nowhere to write is a feature nobody discovers.
  const publishing = await record(
    "publishing_channels",
    "Update log and announcement channels",
    setupPublishingChannels,
  );

  if (publishing?.updateChannel || publishing?.announceChannel) {
    const { syncAnnouncements, syncUpdateLog, summariseSync } = await import("./publish");
    const [log, announcements] = await Promise.all([syncUpdateLog(), syncAnnouncements()]);
    steps.push({
      key: "publishing_sync",
      label: "First sync",
      status: log.ok || announcements.ok ? "ok" : "failed",
      detail: `Update log: ${log.ok ? summariseSync(log) : log.error} Announcements: ${
        announcements.ok ? summariseSync(announcements) : announcements.error
      }`,
    });
  } else {
    steps.push({
      key: "publishing_sync",
      label: "First sync",
      status: "skipped",
      detail:
        "No channel to mirror into - the previous step could not create or find one. Fix that, or pick channels under Publishing and save.",
    });
  }

  return { ok: steps.some((s) => s.status === "ok"), steps };
}
