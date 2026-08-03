import "server-only";
import { botDb } from "./bot-db";
import { getBotConfig } from "./config";
import { discordEnv } from "./env";
import { ChannelType, discordFetch, discordRest, type GuildChannel, type GuildRole } from "./rest";

/**
 * A full, readable snapshot of the Discord server.
 *
 * The point is diagnosis by someone who cannot see the server. Discord's own
 * API answers in ids and permission bitfields, which are unreadable in a paste:
 * `"deny": "1024"` on `"id": "8471…"` tells you nothing, while
 * `deny: ["ViewChannel"]` on `@everyone` tells you everything. So every id that
 * has a name is resolved to that name, every bitfield is decoded, and the
 * channel list is nested under its categories in the order Discord draws them.
 *
 * It also carries what the *bot* can see and do - its role position, its
 * effective permissions, which config ids resolve and which dangle - because
 * almost every "the bot is broken" report is one of those three, and none of
 * them are visible from inside Discord without knowing where to look.
 */

/** Permission bits worth naming. Discord has ~50; these are the ones that break things. */
const PERMISSION_BITS: [bigint, string][] = [
  [1n << 0n, "CreateInstantInvite"],
  [1n << 1n, "KickMembers"],
  [1n << 2n, "BanMembers"],
  [1n << 3n, "Administrator"],
  [1n << 4n, "ManageChannels"],
  [1n << 5n, "ManageGuild"],
  [1n << 6n, "AddReactions"],
  [1n << 7n, "ViewAuditLog"],
  [1n << 10n, "ViewChannel"],
  [1n << 11n, "SendMessages"],
  [1n << 13n, "ManageMessages"],
  [1n << 14n, "EmbedLinks"],
  [1n << 15n, "AttachFiles"],
  [1n << 16n, "ReadMessageHistory"],
  [1n << 17n, "MentionEveryone"],
  [1n << 18n, "UseExternalEmojis"],
  [1n << 20n, "Connect"],
  [1n << 21n, "Speak"],
  [1n << 24n, "UseVAD"],
  [1n << 26n, "ChangeNickname"],
  [1n << 27n, "ManageNicknames"],
  [1n << 28n, "ManageRoles"],
  [1n << 29n, "ManageWebhooks"],
  [1n << 30n, "ManageGuildExpressions"],
  [1n << 31n, "UseApplicationCommands"],
  [1n << 34n, "ModerateMembers"],
  [1n << 40n, "SendMessagesInThreads"],
  [1n << 43n, "UseExternalApps"],
];

/** "3072" -> ["ViewChannel", "SendMessages"]. Unknown bits are kept as numbers. */
export function decodePermissions(bits: string | null | undefined): string[] {
  if (!bits) return [];
  let value: bigint;
  try {
    value = BigInt(bits);
  } catch {
    return [];
  }
  if (value === 0n) return [];
  const names: string[] = [];
  let matched = 0n;
  for (const [bit, name] of PERMISSION_BITS) {
    if ((value & bit) === bit) {
      names.push(name);
      matched |= bit;
    }
  }
  const rest = value & ~matched;
  if (rest !== 0n) names.push(`+${rest.toString()}`);
  return names;
}

const CHANNEL_KIND: Record<number, string> = {
  0: "text",
  2: "voice",
  4: "category",
  5: "announcement",
  13: "stage",
  15: "forum",
  16: "media",
};

export interface ServerExport {
  exported_at: string;
  guild: Record<string, unknown>;
  bot: Record<string, unknown>;
  roles: Record<string, unknown>[];
  channels: Record<string, unknown>[];
  config: Record<string, unknown>;
  problems: string[];
}

/**
 * Everything about one channel, with ids resolved.
 *
 * Overwrites are the part that matters and the part nobody can read: they are
 * why a channel is invisible, why the panel never posted, why the ticket was
 * public. Rendering them as `{ role, allow: [...], deny: [...] }` turns the
 * usual unanswerable "why can't people see this" into something obvious.
 */
function describeChannel(channel: GuildChannel, roleNames: Map<string, string>) {
  const overwrites = (channel.permission_overwrites ?? []).map((o) => ({
    target:
      o.type === 0
        ? `role:${roleNames.get(o.id) ?? (o.id === channel.id ? "@everyone" : o.id)}`
        : `member:${o.id}`,
    allow: decodePermissions(o.allow),
    deny: decodePermissions(o.deny),
  }));
  return {
    id: channel.id,
    name: channel.name,
    kind: CHANNEL_KIND[channel.type] ?? `type_${channel.type}`,
    position: channel.position,
    ...(overwrites.length ? { overwrites } : {}),
  };
}

/**
 * Builds the snapshot. Returns a `problems` list rather than throwing on a
 * partial read: an export that says "roles unreadable, here is everything else"
 * is far more use than an error, and a missing permission is itself a finding.
 */
export async function exportServer(): Promise<
  { ok: true; data: ServerExport } | { ok: false; error: string }
> {
  const guildId = discordEnv.guildId;
  if (!guildId || !discordEnv.botToken) {
    return { ok: false, error: "DISCORD_BOT_TOKEN and DISCORD_GUILD_ID must both be set." };
  }

  const problems: string[] = [];
  const [guild, roles, channels, me] = await Promise.all([
    discordRest.getGuildCounts(guildId),
    discordRest.listGuildRoles(guildId),
    discordRest.listGuildChannels(guildId),
    discordFetch<{ id: string; username: string }>("/users/@me"),
  ]);

  if (!roles.ok) problems.push(`Could not read roles: ${roles.error ?? "unknown"}.`);
  if (!channels.ok) problems.push(`Could not read channels: ${channels.error ?? "unknown"}.`);

  const roleList = roles.data ?? [];
  const channelList = channels.data ?? [];
  const roleNames = new Map(roleList.map((r) => [r.id, r.name]));
  roleNames.set(guildId, "@everyone"); // the @everyone role id IS the guild id

  // The bot's own standing. Its role position decides which roles it can hand
  // out at all - Discord refuses any role at or above the bot's highest - and
  // that single fact is behind most "role sync does nothing" reports.
  const botMember = me.data?.id ? await discordRest.getGuildMember(guildId, me.data.id) : null;
  const botRoles = (botMember?.data?.roles ?? [])
    .map((id) => roleList.find((r) => r.id === id))
    .filter((r): r is GuildRole => Boolean(r));
  const botTop = botRoles.reduce<GuildRole | null>(
    (top, r) => (!top || r.position > top.position ? r : top),
    null,
  );
  const botPermissions = new Set(botRoles.flatMap((r) => decodePermissions(r.permissions)));
  const isAdmin = botPermissions.has("Administrator");
  for (const needed of ["ManageRoles", "ManageChannels", "ModerateMembers", "ManageMessages"]) {
    if (!isAdmin && !botPermissions.has(needed)) {
      problems.push(`The bot is missing ${needed}, which several features need.`);
    }
  }

  const rolesAbove = roleList.filter((r) => botTop && r.position >= botTop.position && !r.managed);
  if (botTop && rolesAbove.length) {
    problems.push(
      `${rolesAbove.length} role(s) sit at or above the bot's own role (${botTop.name}); it cannot assign those: ${rolesAbove.map((r) => r.name).join(", ")}.`,
    );
  }

  // Config ids, resolved. A dangling id is the single most common cause of a
  // feature that "does nothing" - it is set, so nothing warns, and it points at
  // a channel that was deleted three weeks ago.
  const [verification, tickets, stats, levelRoles, moderation] = await Promise.all([
    getBotConfig("verification"),
    getBotConfig("tickets"),
    getBotConfig("stats"),
    getBotConfig("level_roles"),
    getBotConfig("moderation"),
  ]);
  const channelIds = new Set(channelList.map((c) => c.id));
  const roleIds = new Set(roleList.map((r) => r.id));

  const resolve = (kind: "channel" | "role", id: string | null, label: string) => {
    if (!id) return null;
    const known = kind === "channel" ? channelIds.has(id) : roleIds.has(id);
    if (!known) {
      problems.push(`${label} points at a ${kind} (${id}) that no longer exists in the server.`);
      return `${id} (MISSING)`;
    }
    const name =
      kind === "channel" ? channelList.find((c) => c.id === id)?.name : roleNames.get(id);
    return `${id} (#${name})`;
  };

  const worker = await botDb.workerStatus();
  const lastSeen = worker?.last_seen ? new Date(worker.last_seen) : null;
  const workerAlive = lastSeen ? Date.now() - lastSeen.getTime() < 3 * 60 * 1000 : false;
  if (!lastSeen) {
    problems.push(
      "The gateway worker has never checked in. Chat XP, automod, join handling, the live feed, counter refreshes and the bot's Online badge all need it and are not running.",
    );
  } else if (!workerAlive) {
    problems.push(`The gateway worker last checked in at ${worker?.last_seen} and looks offline.`);
  }

  // Nested under categories, in the order Discord draws them, because a flat
  // list sorted by id is not the server anyone is looking at.
  const categories = channelList
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const childrenOf = (parentId: string | null) =>
    channelList
      .filter((c) => c.type !== ChannelType.GuildCategory && (c.parent_id ?? null) === parentId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((c) => describeChannel(c, roleNames));

  return {
    ok: true,
    data: {
      exported_at: new Date().toISOString(),
      guild: {
        id: guildId,
        approximate_members: guild.data?.approximate_member_count ?? null,
        approximate_online: guild.data?.approximate_presence_count ?? null,
      },
      bot: {
        user: me.data?.username ?? null,
        in_guild: Boolean(botMember?.ok),
        highest_role: botTop ? `${botTop.name} (position ${botTop.position})` : null,
        permissions: isAdmin ? ["Administrator"] : [...botPermissions].sort(),
        worker: lastSeen
          ? { last_seen: worker?.last_seen, online: workerAlive }
          : "never checked in",
      },
      roles: roleList
        .sort((a, b) => b.position - a.position)
        .map((r) => ({
          id: r.id,
          name: r.name,
          position: r.position,
          colour: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : null,
          managed: Boolean(r.managed),
          permissions: decodePermissions(r.permissions),
        })),
      channels: [
        ...(childrenOf(null).length ? [{ category: "(no category)", channels: childrenOf(null) }] : []),
        ...categories.map((cat) => ({
          category: cat.name,
          id: cat.id,
          ...(cat.permission_overwrites?.length
            ? { overwrites: describeChannel(cat, roleNames).overwrites }
            : {}),
          channels: childrenOf(cat.id),
        })),
      ],
      config: {
        verification: {
          enabled: verification.enabled,
          mode: verification.mode,
          panel_channel: resolve("channel", verification.panel_channel_id, "Verification panel channel"),
          verified_role: resolve("role", verification.verified_role_id, "Verified role"),
          unverified_role: resolve("role", verification.unverified_role_id, "Unverified role"),
          welcome_channel: resolve("channel", verification.welcome_channel_id, "Welcome channel"),
          log_channel: resolve("channel", verification.log_channel_id, "Verification log channel"),
        },
        tickets: {
          enabled: tickets.enabled,
          panel_channel: resolve("channel", tickets.panel_channel_id, "Ticket panel channel"),
          category: resolve("channel", tickets.category_id, "Ticket category"),
          staff_role: resolve("role", tickets.staff_role_id, "Ticket staff role"),
          log_channel: resolve("channel", tickets.log_channel_id, "Ticket log channel"),
          max_open_per_user: tickets.max_open_per_user,
        },
        stats: {
          enabled: stats.enabled,
          channels: Object.fromEntries(
            Object.entries(stats.channels).map(([k, v]) => [
              k,
              resolve("channel", v, `Stats counter "${k}"`),
            ]),
          ),
          templates: stats.templates,
        },
        level_roles: {
          enabled: levelRoles.enabled,
          milestones: levelRoles.milestones,
          roles: Object.fromEntries(
            Object.entries(levelRoles.roles).map(([level, id]) => [
              level,
              resolve("role", id, `Milestone role for level ${level}`),
            ]),
          ),
        },
        moderation: {
          log_channel: resolve("channel", moderation.log_channel_id, "Moderation log channel"),
          automod_enabled: moderation.automod.enabled,
        },
      },
      problems,
    },
  };
}
