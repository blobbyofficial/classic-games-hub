import "server-only";
import { botDb } from "./bot-db";
import { getBotConfig, template } from "./config";
import { verificationPanel, ticketPanel } from "./components";
import { SLASH_COMMANDS } from "./commands";
import { BOT_NAME } from "./embeds";
import { discordEnv } from "./env";
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

  const record = async (key: string, label: string, run: () => Promise<SetupResult>) => {
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
    } catch (err) {
      steps.push({
        key,
        label,
        status: "failed",
        detail: err instanceof Error ? err.message : "Unexpected error.",
      });
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

  // 5 & 6. Panels, which need a channel to be posted into. That channel is a
  //        human decision - which one members should see - so a missing one is
  //        reported as outstanding rather than guessed at by creating a
  //        channel nobody asked for.
  const verifyCfg = await getBotConfig("verification");
  if (verifyCfg.panel_channel_id) {
    const res = await postVerificationPanel(verifyCfg.panel_channel_id);
    steps.push({
      key: "verification_panel",
      label: "Verification panel",
      status: res.ok ? "ok" : "failed",
      detail: res.ok
        ? "Posted (or updated in place)."
        : `Could not post: ${describe(res)}. Check the bot can see and send in that channel.`,
    });
  } else {
    steps.push({
      key: "verification_panel",
      label: "Verification panel",
      status: "skipped",
      detail: "Pick a verification channel below, then save - the panel posts itself.",
    });
  }

  const ticketCfg = await getBotConfig("tickets");
  if (ticketCfg.panel_channel_id) {
    const res = await postTicketPanel(ticketCfg.panel_channel_id);
    steps.push({
      key: "ticket_panel",
      label: "Ticket panel",
      status: res.ok ? "ok" : "failed",
      detail: res.ok
        ? "Posted (or updated in place)."
        : `Could not post: ${describe(res)}. Check the bot can see and send in that channel.`,
    });
  } else {
    steps.push({
      key: "ticket_panel",
      label: "Ticket panel",
      status: "skipped",
      detail: "Pick a ticket channel below, then save - the panel posts itself.",
    });
  }

  return { ok: steps.some((s) => s.status === "ok"), steps };
}
