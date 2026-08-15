import {
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
  type PartialUser,
  type PermissionsString,
  type User,
} from "discord.js";
import type { Actor } from "./audit.js";

/**
 * Turning a change into something a human reads at a glance.
 *
 * The house style is deliberately close to what people already recognise from
 * Sapphire and friends: one embed per event, colour-coded by what kind of
 * change it was, the actor in the author line, the affected thing in the
 * title, and every raw id in the footer - because the id is the half you need
 * when the name has since changed.
 */

/** Green: something now exists, or someone arrived. */
export const CREATE = 0x22c55e;
/** Red: something is gone. */
export const DELETE = 0xef4444;
/** Amber: something changed shape. */
export const UPDATE = 0xf59e0b;
/** Blue: movement - voice, threads, invites. */
export const INFO = 0x3b82f6;
/** Deep red: a moderator acted on a person. */
export const MODERATION = 0xdc2626;

/** Discord's per-field limit is 1024; leave room for the fences we add. */
const FIELD_LIMIT = 1000;

export function truncate(text: string, limit = FIELD_LIMIT): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

/** Message bodies are quoted in a fence so mentions and markdown stay inert. */
export function quote(text: string): string {
  const body = truncate(text.replace(/```/g, "`​``"), FIELD_LIMIT - 8);
  return `\`\`\`\n${body || "(empty)"}\n\`\`\``;
}

export function userLabel(user: User | PartialUser | null | undefined): string {
  if (!user) return "Unknown";
  // A partial user has an id and not much else, and the id is the half that
  // matters - the tag is a convenience for reading, not for finding.
  return `${user} (\`${user.tag ?? user.id}\`)`;
}

const CHANNEL_KIND: Partial<Record<ChannelType, string>> = {
  [ChannelType.GuildText]: "text",
  [ChannelType.GuildVoice]: "voice",
  [ChannelType.GuildCategory]: "category",
  [ChannelType.GuildAnnouncement]: "announcement",
  [ChannelType.GuildStageVoice]: "stage",
  [ChannelType.GuildForum]: "forum",
  [ChannelType.GuildMedia]: "media",
  [ChannelType.PublicThread]: "thread",
  [ChannelType.PrivateThread]: "private thread",
  [ChannelType.AnnouncementThread]: "announcement thread",
};

export function channelKind(type: ChannelType): string {
  return CHANNEL_KIND[type] ?? "channel";
}

/**
 * A channel as both a mention and a name.
 *
 * The mention is what you click; the name is what survives the channel being
 * deleted, which is precisely the case a deletion log exists for.
 */
export function channelLabel(channel: { id: string; name?: string | null } | null | undefined): string {
  if (!channel) return "Unknown channel";
  return channel.name ? `<#${channel.id}> (#${channel.name})` : `<#${channel.id}>`;
}

/**
 * The skeleton every entry shares: colour, title, actor, ids, timestamp.
 *
 * "Unknown" is used rather than omitting the actor line, because a missing
 * line reads as "nobody did this" when it means "I couldn't see who".
 */
export function logEmbed(input: {
  colour: number;
  title: string;
  description?: string;
  actor?: Actor | null;
  /** Rendered into the footer, where ids belong. */
  ids?: Record<string, string | null | undefined>;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: string | null;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(input.colour)
    .setTitle(input.title)
    .setTimestamp(new Date());

  if (input.description) embed.setDescription(truncate(input.description, 4000));

  const actorUser = input.actor?.user;
  if (input.actor) {
    embed.setAuthor({
      name: actorUser ? (actorUser.tag ?? actorUser.id) : "Unknown actor",
      iconURL: actorUser?.displayAvatarURL() ?? undefined,
    });
  }
  if (input.thumbnail) embed.setThumbnail(input.thumbnail);

  const fields = [...(input.fields ?? [])];
  if (input.actor?.reason) {
    fields.push({ name: "Reason", value: truncate(input.actor.reason), inline: false });
  }
  if (fields.length) embed.addFields(fields.map((f) => ({ ...f, value: truncate(f.value) || "-" })));

  const ids = Object.entries(input.ids ?? {})
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `${k}: ${v}`);
  if (actorUser) ids.push(`actor: ${actorUser.id}`);
  if (ids.length) embed.setFooter({ text: truncate(ids.join(" • "), 2000) });

  return embed;
}

// ── Diffing ──────────────────────────────────────────────────────────

export interface Change {
  name: string;
  before: string;
  after: string;
}

/** Records a field as changed only when it actually differs. */
export function diff(
  changes: Change[],
  name: string,
  before: unknown,
  after: unknown,
  render: (v: unknown) => string = (v) => (v === null || v === undefined || v === "" ? "_none_" : String(v)),
): void {
  if (before === after) return;
  changes.push({ name, before: render(before), after: render(after) });
}

/** `#7a3dff`, or "default" for Discord's no-colour-set value of 0. */
export function colourHex(value: unknown): string {
  const n = Number(value ?? 0);
  if (!n) return "default";
  return `#${n.toString(16).padStart(6, "0")}`;
}

export function bool(value: unknown): string {
  return value ? "yes" : "no";
}

export function seconds(value: unknown): string {
  const n = Number(value ?? 0);
  return n > 0 ? `${n}s` : "off";
}

/** Renders a change list as embed fields, one per changed property. */
export function changeFields(changes: Change[]): { name: string; value: string; inline?: boolean }[] {
  return changes.map((c) => ({
    name: c.name,
    value: truncate(`${c.before} → **${c.after}**`),
    inline: false,
  }));
}

/**
 * Which permissions were granted and which taken away.
 *
 * Rendering the raw bitfields either side of an arrow is technically the same
 * information and useless in practice - the whole question a permission change
 * raises is *which* permission moved.
 */
export function permissionDelta(
  before: bigint,
  after: bigint,
): { added: PermissionsString[]; removed: PermissionsString[] } {
  return {
    added: new PermissionsBitField(after & ~before).toArray(),
    removed: new PermissionsBitField(before & ~after).toArray(),
  };
}

/** Human names for a permission delta, ready to drop into a field. */
export function permissionSummary(added: PermissionsString[], removed: PermissionsString[]): string {
  const parts = [
    added.length ? `✅ ${added.map(prettyPermission).join(", ")}` : "",
    removed.length ? `❌ ${removed.map(prettyPermission).join(", ")}` : "",
  ].filter(Boolean);
  return parts.join("\n") || "no permission changes";
}

/** `ManageGuild` → `Manage Guild`, which is what the Discord UI calls it. */
export function prettyPermission(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Roles by name, mentioning them so the colour shows. */
export function roleList(ids: string[]): string {
  return ids.map((id) => `<@&${id}>`).join(", ") || "_none_";
}
