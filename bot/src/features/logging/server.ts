import {
  AuditLogEvent,
  type Client,
  Events,
  type DMChannel,
  type Guild,
  type GuildAuditLogsEntry,
  type GuildBasedChannel,
  type GuildEmoji,
  type Invite,
  type NonThreadGuildBasedChannel,
  type Role,
  type Sticker,
  type ThreadChannel,
} from "discord.js";
import { config } from "../../config.js";
import { auditTargetId, whoDid } from "./audit.js";
import { emitLog, logEnabled } from "./dispatch.js";
import {
  CREATE,
  DELETE,
  INFO,
  UPDATE,
  bool,
  changeFields,
  channelKind,
  channelLabel,
  colourHex,
  diff,
  logEmbed,
  permissionDelta,
  permissionSummary,
  seconds,
  truncate,
  userLabel,
  type Change,
} from "./format.js";

/**
 * Server-structure logging: channels, roles, threads, emoji, stickers,
 * invites, webhooks and the server's own settings.
 *
 * These are the entries an audit log exists for. A deleted message is usually
 * someone tidying up; a role that quietly gained **Manage Server**, or a
 * channel whose @everyone overwrite changed at 3am, is the thing you need to
 * be able to find six weeks later - so every update here is diffed down to the
 * individual property rather than logged as "channel updated".
 */

const inGuild = (guild: Guild | null | undefined): boolean => guild?.id === config.guildId;

// ── Channels ─────────────────────────────────────────────────────────

async function onChannelCreate(channel: NonThreadGuildBasedChannel): Promise<void> {
  if (!inGuild(channel.guild)) return;
  if (!(await logEnabled("channel_create"))) return;

  const actor = await whoDid(channel.guild, AuditLogEvent.ChannelCreate, (e: GuildAuditLogsEntry) =>
    auditTargetId(e) === channel.id,
  );
  await emitLog(
    channel.client,
    "channel_create",
    logEmbed({
      colour: CREATE,
      title: `📁 ${channelKind(channel.type)} channel created`,
      description: [
        channelLabel(channel),
        channel.parent ? `**Category:** ${channel.parent.name}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      actor,
      ids: { channel: channel.id },
    }),
    { channelId: channel.id },
  );
}

async function onChannelDelete(channel: NonThreadGuildBasedChannel | DMChannel): Promise<void> {
  if (channel.isDMBased()) return;
  if (!inGuild(channel.guild)) return;
  if (!(await logEnabled("channel_delete"))) return;

  const actor = await whoDid(channel.guild, AuditLogEvent.ChannelDelete, (e: GuildAuditLogsEntry) =>
    auditTargetId(e) === channel.id,
  );
  await emitLog(
    channel.client,
    "channel_delete",
    logEmbed({
      colour: DELETE,
      // The name, not a mention: the mention renders as a dead link the moment
      // the channel is gone, which is every time this entry is written.
      title: `🗑️ ${channelKind(channel.type)} channel deleted`,
      description: [
        `**Name:** #${channel.name}`,
        channel.parent ? `**Category:** ${channel.parent.name}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      actor,
      ids: { channel: channel.id },
    }),
    // Deliberately no channelId filter: an ignored channel being deleted is
    // exactly the event the ignore list should not hide.
    {},
  );
}

/**
 * The properties only some channel types have.
 *
 * Written out rather than intersected from the concrete channel classes: a
 * `TextChannel & VoiceChannel` is a type nothing can satisfy, so TypeScript
 * collapses the intersection to `never` and every read off it fails.
 */
interface OptionalChannelProps {
  topic: string | null;
  rateLimitPerUser: number;
  nsfw: boolean;
  bitrate: number;
  userLimit: number;
}

/** Everything about a channel that is worth a line when it changes. */
function channelChanges(
  before: NonThreadGuildBasedChannel,
  after: NonThreadGuildBasedChannel,
): Change[] {
  const changes: Change[] = [];
  diff(changes, "Name", before.name, after.name);
  diff(changes, "Category", before.parent?.name ?? null, after.parent?.name ?? null);
  diff(changes, "Position", before.rawPosition, after.rawPosition);

  const b = before as Partial<OptionalChannelProps>;
  const a = after as Partial<OptionalChannelProps>;
  diff(changes, "Topic", b.topic ?? null, a.topic ?? null, (v) =>
    v ? truncate(String(v), 400) : "_none_",
  );
  diff(changes, "Slowmode", b.rateLimitPerUser ?? 0, a.rateLimitPerUser ?? 0, seconds);
  diff(changes, "Age-restricted", b.nsfw ?? false, a.nsfw ?? false, bool);
  diff(changes, "Bitrate", b.bitrate ?? null, a.bitrate ?? null, (v) => (v ? `${Number(v) / 1000} kbps` : "_none_"));
  diff(changes, "User limit", b.userLimit ?? null, a.userLimit ?? null, (v) =>
    Number(v) > 0 ? String(v) : "unlimited",
  );
  return changes;
}

/**
 * Which permission overwrites moved.
 *
 * Rendered per target (role or member) rather than as one blob, because a
 * channel's overwrites are read one target at a time and "@everyone lost View
 * Channel" is the sentence somebody needs.
 */
function overwriteChanges(
  before: NonThreadGuildBasedChannel,
  after: NonThreadGuildBasedChannel,
): string[] {
  const lines: string[] = [];
  const beforeMap = before.permissionOverwrites?.cache;
  const afterMap = after.permissionOverwrites?.cache;
  if (!beforeMap || !afterMap) return lines;

  for (const [id, next] of afterMap) {
    const prev = beforeMap.get(id);
    const mention = next.type === 0 ? `<@&${id}>` : `<@${id}>`;
    if (!prev) {
      const { added, removed } = permissionDelta(0n, next.allow.bitfield);
      const denied = permissionDelta(0n, next.deny.bitfield).added;
      lines.push(`**${mention}** overwrite added\n${permissionSummary(added.concat(removed), denied)}`);
      continue;
    }
    if (prev.allow.bitfield === next.allow.bitfield && prev.deny.bitfield === next.deny.bitfield) {
      continue;
    }
    const allow = permissionDelta(prev.allow.bitfield, next.allow.bitfield);
    const deny = permissionDelta(prev.deny.bitfield, next.deny.bitfield);
    lines.push(
      `**${mention}**\nallowed: ${permissionSummary(allow.added, allow.removed)}\ndenied: ${permissionSummary(deny.added, deny.removed)}`,
    );
  }
  for (const [id, prev] of beforeMap) {
    if (afterMap.has(id)) continue;
    lines.push(`**${prev.type === 0 ? `<@&${id}>` : `<@${id}>`}** overwrite removed`);
  }
  return lines;
}

async function onChannelUpdate(
  before: NonThreadGuildBasedChannel | DMChannel,
  after: NonThreadGuildBasedChannel | DMChannel,
): Promise<void> {
  if (after.isDMBased() || before.isDMBased()) return;
  if (!inGuild(after.guild)) return;
  if (!(await logEnabled("channel_update"))) return;

  const changes = channelChanges(before, after);
  const overwrites = overwriteChanges(before, after);
  if (changes.length === 0 && overwrites.length === 0) return;

  const actor = await whoDid(after.guild, AuditLogEvent.ChannelUpdate, (e: GuildAuditLogsEntry) =>
    auditTargetId(e) === after.id,
  );
  const overwriteActor = overwrites.length
    ? await whoDid(after.guild, AuditLogEvent.ChannelOverwriteUpdate, (e: GuildAuditLogsEntry) =>
        auditTargetId(e) === after.id,
      )
    : null;

  await emitLog(
    after.client,
    "channel_update",
    logEmbed({
      colour: UPDATE,
      title: `✏️ ${channelKind(after.type)} channel updated`,
      description: channelLabel(after),
      actor: actor.user ? actor : overwriteActor,
      fields: [
        ...changeFields(changes),
        ...(overwrites.length
          ? [{ name: "Permission overwrites", value: truncate(overwrites.join("\n\n")), inline: false }]
          : []),
      ],
      ids: { channel: after.id },
    }),
    { channelId: after.id },
  );
}

// ── Threads ──────────────────────────────────────────────────────────

async function onThreadCreate(thread: ThreadChannel): Promise<void> {
  if (!inGuild(thread.guild)) return;
  if (!(await logEnabled("thread_create"))) return;
  await emitLog(
    thread.client,
    "thread_create",
    logEmbed({
      colour: CREATE,
      title: "🧵 Thread created",
      description: [
        channelLabel(thread),
        thread.parent ? `**In:** ${channelLabel(thread.parent)}` : "",
        thread.ownerId ? `**Started by:** <@${thread.ownerId}>` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      ids: { thread: thread.id, parent: thread.parentId },
    }),
    { channelId: thread.parentId, userId: thread.ownerId },
  );
}

async function onThreadDelete(thread: ThreadChannel): Promise<void> {
  if (!inGuild(thread.guild)) return;
  if (!(await logEnabled("thread_delete"))) return;
  const actor = await whoDid(thread.guild, AuditLogEvent.ThreadDelete, (e: GuildAuditLogsEntry) =>
    auditTargetId(e) === thread.id,
  );
  await emitLog(
    thread.client,
    "thread_delete",
    logEmbed({
      colour: DELETE,
      title: "🧵 Thread deleted",
      description: [`**Name:** ${thread.name}`, thread.parent ? `**In:** ${channelLabel(thread.parent)}` : ""]
        .filter(Boolean)
        .join("\n"),
      actor,
      ids: { thread: thread.id, parent: thread.parentId },
    }),
    { channelId: thread.parentId },
  );
}

// ── Roles ────────────────────────────────────────────────────────────

async function onRoleCreate(role: Role): Promise<void> {
  if (!inGuild(role.guild)) return;
  if (!(await logEnabled("role_create"))) return;
  const actor = await whoDid(role.guild, AuditLogEvent.RoleCreate, (e: GuildAuditLogsEntry) =>
    auditTargetId(e) === role.id,
  );
  await emitLog(
    role.client,
    "role_create",
    logEmbed({
      colour: CREATE,
      title: "🎭 Role created",
      description: `${role} (\`${role.name}\`)`,
      actor,
      fields: [
        { name: "Colour", value: colourHex(role.color), inline: true },
        { name: "Shown separately", value: bool(role.hoist), inline: true },
        { name: "Mentionable", value: bool(role.mentionable), inline: true },
      ],
      ids: { role: role.id },
    }),
  );
}

async function onRoleDelete(role: Role): Promise<void> {
  if (!inGuild(role.guild)) return;
  if (!(await logEnabled("role_delete"))) return;
  const actor = await whoDid(role.guild, AuditLogEvent.RoleDelete, (e: GuildAuditLogsEntry) =>
    auditTargetId(e) === role.id,
  );
  await emitLog(
    role.client,
    "role_delete",
    logEmbed({
      colour: DELETE,
      title: "🎭 Role deleted",
      description: `**Name:** ${role.name}`,
      actor,
      fields: [
        { name: "Colour", value: colourHex(role.color), inline: true },
        { name: "Members who had it", value: String(role.members.size), inline: true },
      ],
      ids: { role: role.id },
    }),
  );
}

async function onRoleUpdate(before: Role, after: Role): Promise<void> {
  if (!inGuild(after.guild)) return;
  if (!(await logEnabled("role_update"))) return;

  const changes: Change[] = [];
  diff(changes, "Name", before.name, after.name);
  diff(changes, "Colour", before.color, after.color, colourHex);
  diff(changes, "Shown separately", before.hoist, after.hoist, bool);
  diff(changes, "Mentionable", before.mentionable, after.mentionable, bool);
  diff(changes, "Position", before.rawPosition, after.rawPosition);
  diff(changes, "Icon", before.icon ?? null, after.icon ?? null, (v) => (v ? "set" : "_none_"));

  const perms = permissionDelta(before.permissions.bitfield, after.permissions.bitfield);
  const permsChanged = perms.added.length > 0 || perms.removed.length > 0;
  if (changes.length === 0 && !permsChanged) return;

  const actor = await whoDid(after.guild, AuditLogEvent.RoleUpdate, (e: GuildAuditLogsEntry) =>
    auditTargetId(e) === after.id,
  );
  await emitLog(
    after.client,
    "role_update",
    logEmbed({
      colour: UPDATE,
      title: "🎭 Role updated",
      description: `${after} (\`${after.name}\`)`,
      actor,
      fields: [
        ...changeFields(changes),
        ...(permsChanged
          ? [{ name: "Permissions", value: permissionSummary(perms.added, perms.removed), inline: false }]
          : []),
      ],
      ids: { role: after.id },
    }),
  );
}

// ── Expressions, invites, webhooks, the server itself ────────────────

async function emoji(e: GuildEmoji, kind: "created" | "deleted" | "renamed", extra = ""): Promise<void> {
  if (!inGuild(e.guild)) return;
  if (!(await logEnabled("emoji_update"))) return;
  await emitLog(
    e.client,
    "emoji_update",
    logEmbed({
      colour: kind === "created" ? CREATE : kind === "deleted" ? DELETE : UPDATE,
      title: `😀 Emoji ${kind}`,
      description: [`**Name:** :${e.name}:`, extra].filter(Boolean).join("\n"),
      thumbnail: e.imageURL(),
      ids: { emoji: e.id },
    }),
  );
}

async function sticker(s: Sticker, kind: "created" | "deleted" | "updated", extra = ""): Promise<void> {
  if (!inGuild(s.guild)) return;
  if (!(await logEnabled("sticker_update"))) return;
  await emitLog(
    s.client,
    "sticker_update",
    logEmbed({
      colour: kind === "created" ? CREATE : kind === "deleted" ? DELETE : UPDATE,
      title: `🏷️ Sticker ${kind}`,
      description: [`**Name:** ${s.name}`, extra].filter(Boolean).join("\n"),
      ids: { sticker: s.id },
    }),
  );
}

async function onInviteCreate(invite: Invite): Promise<void> {
  if (!inGuild(invite.guild as Guild | null)) return;
  if (!(await logEnabled("invite_create"))) return;
  await emitLog(
    invite.client,
    "invite_create",
    logEmbed({
      colour: INFO,
      title: "🔗 Invite created",
      description: [
        `**Code:** \`${invite.code}\``,
        invite.channel ? `**Channel:** ${channelLabel(invite.channel)}` : "",
        invite.inviter ? `**By:** ${userLabel(invite.inviter)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      fields: [
        { name: "Max uses", value: invite.maxUses ? String(invite.maxUses) : "unlimited", inline: true },
        {
          name: "Expires",
          value: invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : "never",
          inline: true,
        },
        { name: "Temporary membership", value: bool(invite.temporary), inline: true },
      ],
      ids: { channel: invite.channel?.id, inviter: invite.inviter?.id },
    }),
    { channelId: invite.channel?.id, userId: invite.inviter?.id },
  );
}

async function onInviteDelete(invite: Invite): Promise<void> {
  if (!inGuild(invite.guild as Guild | null)) return;
  if (!(await logEnabled("invite_delete"))) return;
  await emitLog(
    invite.client,
    "invite_delete",
    logEmbed({
      colour: DELETE,
      title: "🔗 Invite deleted",
      description: [`**Code:** \`${invite.code}\``, invite.channel ? `**Channel:** ${channelLabel(invite.channel)}` : ""]
        .filter(Boolean)
        .join("\n"),
      ids: { channel: invite.channel?.id },
    }),
    { channelId: invite.channel?.id },
  );
}

/**
 * Webhooks are the quiet one and the dangerous one: a webhook is an
 * unauthenticated write endpoint for a channel, so its creation deserves a
 * line even though Discord tells us almost nothing about it directly.
 */
async function onWebhooksUpdate(channel: GuildBasedChannel): Promise<void> {
  if (!inGuild(channel.guild)) return;
  if (!(await logEnabled("webhook_update"))) return;
  const actor = await whoDid(channel.guild, AuditLogEvent.WebhookCreate, (e: GuildAuditLogsEntry) =>
    ((e.target as { channelId?: string } | null)?.channelId ?? null) === channel.id,
  );
  await emitLog(
    channel.client,
    "webhook_update",
    logEmbed({
      colour: UPDATE,
      title: "🪝 Webhooks changed",
      description: `A webhook was created, edited or removed in ${channelLabel(channel)}.`,
      actor,
      ids: { channel: channel.id },
    }),
    { channelId: channel.id },
  );
}

async function onGuildUpdate(before: Guild, after: Guild): Promise<void> {
  if (!inGuild(after)) return;
  if (!(await logEnabled("server_update"))) return;

  const changes: Change[] = [];
  diff(changes, "Name", before.name, after.name);
  diff(changes, "Description", before.description, after.description);
  diff(changes, "Icon", before.icon, after.icon, (v) => (v ? "set" : "_none_"));
  diff(changes, "Banner", before.banner, after.banner, (v) => (v ? "set" : "_none_"));
  diff(changes, "Owner", before.ownerId, after.ownerId, (v) => (v ? `<@${v}>` : "_none_"));
  diff(changes, "Verification level", before.verificationLevel, after.verificationLevel);
  diff(changes, "Explicit content filter", before.explicitContentFilter, after.explicitContentFilter);
  diff(changes, "2FA requirement", before.mfaLevel, after.mfaLevel);
  diff(changes, "System channel", before.systemChannelId, after.systemChannelId, (v) =>
    v ? `<#${v}>` : "_none_",
  );
  diff(changes, "AFK channel", before.afkChannelId, after.afkChannelId, (v) => (v ? `<#${v}>` : "_none_"));
  diff(changes, "Vanity URL", before.vanityURLCode, after.vanityURLCode);
  if (changes.length === 0) return;

  const actor = await whoDid(after, AuditLogEvent.GuildUpdate, () => true);
  await emitLog(
    after.client,
    "server_update",
    logEmbed({
      colour: UPDATE,
      title: "⚙️ Server settings updated",
      actor,
      fields: changeFields(changes),
      ids: { guild: after.id },
    }),
  );
}

export function registerServerLogging(client: Client): void {
  client.on(Events.ChannelCreate, (channel) => void onChannelCreate(channel).catch(report));
  client.on(Events.ChannelDelete, (channel) => void onChannelDelete(channel).catch(report));
  client.on(Events.ChannelUpdate, (before, after) => void onChannelUpdate(before, after).catch(report));

  client.on(Events.ThreadCreate, (thread) => void onThreadCreate(thread).catch(report));
  client.on(Events.ThreadDelete, (thread) => void onThreadDelete(thread).catch(report));

  client.on(Events.GuildRoleCreate, (role) => void onRoleCreate(role).catch(report));
  client.on(Events.GuildRoleDelete, (role) => void onRoleDelete(role).catch(report));
  client.on(Events.GuildRoleUpdate, (before, after) => void onRoleUpdate(before, after).catch(report));

  client.on(Events.GuildEmojiCreate, (e) => void emoji(e, "created").catch(report));
  client.on(Events.GuildEmojiDelete, (e) => void emoji(e, "deleted").catch(report));
  client.on(Events.GuildEmojiUpdate, (before, after) =>
    void emoji(after, "renamed", `Was \`:${before.name}:\``).catch(report),
  );

  client.on(Events.GuildStickerCreate, (s) => void sticker(s, "created").catch(report));
  client.on(Events.GuildStickerDelete, (s) => void sticker(s, "deleted").catch(report));
  client.on(Events.GuildStickerUpdate, (before, after) =>
    void sticker(after, "updated", before.name === after.name ? "" : `Was \`${before.name}\``).catch(report),
  );

  client.on(Events.InviteCreate, (invite) => void onInviteCreate(invite).catch(report));
  client.on(Events.InviteDelete, (invite) => void onInviteDelete(invite as Invite).catch(report));
  client.on(Events.WebhooksUpdate, (channel) => void onWebhooksUpdate(channel).catch(report));
  client.on(Events.GuildUpdate, (before, after) => void onGuildUpdate(before, after).catch(report));
}

function report(err: unknown): void {
  console.error("[logging] server handler failed:", err);
}
