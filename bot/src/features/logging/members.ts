import {
  AuditLogEvent,
  type Client,
  Events,
  type GuildAuditLogsEntry,
  type GuildBan,
  type GuildMember,
  type PartialGuildMember,
} from "discord.js";
import { config } from "../../config.js";
import { auditTargetId, whoDid } from "./audit.js";
import { emitLog, logEnabled } from "./dispatch.js";
import {
  CREATE,
  DELETE,
  MODERATION,
  UPDATE,
  logEmbed,
  roleList,
  userLabel,
} from "./format.js";

/**
 * Member logging: arrivals, departures, nickname and role changes, timeouts,
 * bans and unbans.
 *
 * A departure is the awkward one - Discord sends the same event whether
 * someone left, was kicked or was banned, and only the audit log can tell them
 * apart. That lookup is what makes "left" and "was kicked" different lines
 * here rather than one ambiguous one.
 */

/** How old the account is, which is the raid signal worth surfacing on join. */
function accountAge(createdAt: Date): string {
  const days = Math.floor((Date.now() - createdAt.getTime()) / 86_400_000);
  if (days < 1) return "**less than a day old** ⚠️";
  if (days < 7) return `**${days} day(s) old** ⚠️`;
  return `${days} day(s) old`;
}

async function onJoin(member: GuildMember): Promise<void> {
  if (member.guild.id !== config.guildId) return;
  if (!(await logEnabled("member_join"))) return;

  await emitLog(
    member.client,
    "member_join",
    logEmbed({
      colour: CREATE,
      title: "📥 Member joined",
      description: [
        userLabel(member.user),
        `Account created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> - ${accountAge(member.user.createdAt)}`,
        `Member #${member.guild.memberCount}`,
      ].join("\n"),
      thumbnail: member.user.displayAvatarURL(),
      ids: { member: member.id },
    }),
    { userId: member.id, isBot: member.user.bot },
  );
}

async function onLeave(member: GuildMember | PartialGuildMember): Promise<void> {
  if (member.guild.id !== config.guildId) return;
  if (!(await logEnabled("member_leave"))) return;

  // Kick and ban both surface as a departure. Ask the audit log which it was;
  // a ban is logged separately by GuildBanAdd, so only a kick is claimed here.
  const kick = await whoDid(
    member.guild,
    AuditLogEvent.MemberKick,
    (entry: GuildAuditLogsEntry) => auditTargetId(entry) === member.id,
  );

  const roles = member.roles?.cache
    ? [...member.roles.cache.keys()].filter((id) => id !== member.guild.id)
    : [];

  await emitLog(
    member.client,
    "member_leave",
    logEmbed({
      colour: DELETE,
      title: kick.user ? "👢 Member kicked" : "📤 Member left",
      description: [
        userLabel(member.user),
        kick.user ? `**Kicked by:** ${userLabel(kick.user)}` : "",
        member.joinedTimestamp ? `Joined <t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      actor: kick.user ? kick : null,
      thumbnail: member.user?.displayAvatarURL() ?? null,
      fields: roles.length ? [{ name: "Roles held", value: roleList(roles), inline: false }] : [],
      ids: { member: member.id },
    }),
    { userId: member.id, isBot: member.user?.bot },
  );
}

async function onMemberUpdate(
  before: GuildMember | PartialGuildMember,
  after: GuildMember,
): Promise<void> {
  if (after.guild.id !== config.guildId) return;

  // ── Nickname ──
  if (before.nickname !== after.nickname && (await logEnabled("member_nickname"))) {
    const actor = await whoDid(
      after.guild,
      AuditLogEvent.MemberUpdate,
      (entry: GuildAuditLogsEntry) => auditTargetId(entry) === after.id,
    );
    await emitLog(
      after.client,
      "member_nickname",
      logEmbed({
        colour: UPDATE,
        title: "🏷️ Nickname changed",
        description: userLabel(after.user),
        actor,
        fields: [
          {
            name: "Nickname",
            value: `${before.nickname ?? "_none_"} → **${after.nickname ?? "_none_"}**`,
            inline: false,
          },
        ],
        ids: { member: after.id },
      }),
      { userId: after.id, member: after, isBot: after.user.bot },
    );
  }

  // ── Roles ──
  const beforeRoles = new Set(before.roles?.cache?.keys() ?? []);
  const afterRoles = new Set(after.roles.cache.keys());
  const added = [...afterRoles].filter((id) => !beforeRoles.has(id));
  const removed = [...beforeRoles].filter((id) => !afterRoles.has(id));
  if ((added.length || removed.length) && (await logEnabled("member_roles"))) {
    const actor = await whoDid(
      after.guild,
      AuditLogEvent.MemberRoleUpdate,
      (entry: GuildAuditLogsEntry) => auditTargetId(entry) === after.id,
    );
    await emitLog(
      after.client,
      "member_roles",
      logEmbed({
        colour: UPDATE,
        title: "🎭 Roles changed",
        description: userLabel(after.user),
        actor,
        fields: [
          ...(added.length ? [{ name: "Added", value: roleList(added), inline: false }] : []),
          ...(removed.length ? [{ name: "Removed", value: roleList(removed), inline: false }] : []),
        ],
        ids: { member: after.id },
      }),
      { userId: after.id, member: after, isBot: after.user.bot },
    );
  }

  // ── Timeout ──
  const wasTimedOut = (before.communicationDisabledUntilTimestamp ?? 0) > Date.now();
  const nowTimedOut = (after.communicationDisabledUntilTimestamp ?? 0) > Date.now();
  const timeoutChanged =
    before.communicationDisabledUntilTimestamp !== after.communicationDisabledUntilTimestamp;
  if (timeoutChanged && (wasTimedOut || nowTimedOut) && (await logEnabled("member_timeout"))) {
    const actor = await whoDid(
      after.guild,
      AuditLogEvent.MemberUpdate,
      (entry: GuildAuditLogsEntry) => auditTargetId(entry) === after.id,
    );
    const until = after.communicationDisabledUntilTimestamp;
    await emitLog(
      after.client,
      "member_timeout",
      logEmbed({
        colour: MODERATION,
        title: nowTimedOut ? "🔇 Member timed out" : "🔊 Timeout lifted",
        description: userLabel(after.user),
        actor,
        fields: nowTimedOut && until ? [{ name: "Until", value: `<t:${Math.floor(until / 1000)}:F> (<t:${Math.floor(until / 1000)}:R>)`, inline: false }] : [],
        ids: { member: after.id },
      }),
      { userId: after.id, isBot: after.user.bot },
    );
  }
}

async function onBanAdd(ban: GuildBan): Promise<void> {
  if (ban.guild.id !== config.guildId) return;
  if (!(await logEnabled("member_ban"))) return;

  const actor = await whoDid(ban.guild, AuditLogEvent.MemberBanAdd, (entry: GuildAuditLogsEntry) =>
    auditTargetId(entry) === ban.user.id,
  );
  await emitLog(
    ban.client,
    "member_ban",
    logEmbed({
      colour: MODERATION,
      title: "🔨 Member banned",
      description: userLabel(ban.user),
      // A ban's reason is worth reading whichever source it came from.
      actor: actor.reason || actor.user ? actor : { user: null, reason: ban.reason ?? null },
      thumbnail: ban.user.displayAvatarURL(),
      ids: { member: ban.user.id },
    }),
    { userId: ban.user.id, isBot: ban.user.bot },
  );
}

async function onBanRemove(ban: GuildBan): Promise<void> {
  if (ban.guild.id !== config.guildId) return;
  if (!(await logEnabled("member_unban"))) return;

  const actor = await whoDid(ban.guild, AuditLogEvent.MemberBanRemove, (entry: GuildAuditLogsEntry) =>
    auditTargetId(entry) === ban.user.id,
  );
  await emitLog(
    ban.client,
    "member_unban",
    logEmbed({
      colour: CREATE,
      title: "♻️ Member unbanned",
      description: userLabel(ban.user),
      actor,
      ids: { member: ban.user.id },
    }),
    { userId: ban.user.id, isBot: ban.user.bot },
  );
}

export function registerMemberLogging(client: Client): void {
  client.on(Events.GuildMemberAdd, (member) => void onJoin(member).catch(report));
  client.on(Events.GuildMemberRemove, (member) => void onLeave(member).catch(report));
  client.on(Events.GuildMemberUpdate, (before, after) => void onMemberUpdate(before, after).catch(report));
  client.on(Events.GuildBanAdd, (ban) => void onBanAdd(ban).catch(report));
  client.on(Events.GuildBanRemove, (ban) => void onBanRemove(ban).catch(report));
}

function report(err: unknown): void {
  console.error("[logging] member handler failed:", err);
}
