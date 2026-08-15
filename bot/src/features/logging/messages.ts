import {
  AuditLogEvent,
  type Client,
  Events,
  type GuildAuditLogsEntry,
  type Message,
  type PartialMessage,
  type ReadonlyCollection,
  type Snowflake,
} from "discord.js";
import { config } from "../../config.js";
import { getConfig } from "../../hubConfig.js";
import { auditTargetId, whoDid } from "./audit.js";
import { emitLog, logEnabled } from "./dispatch.js";
import { DELETE, UPDATE, channelLabel, logEmbed, quote, truncate, userLabel } from "./format.js";

/**
 * Message logging: deletions, edits and bulk purges.
 *
 * One caveat worth stating plainly, because every logging bot has it and none
 * of them explain it: Discord does not send the *old* message with a delete or
 * an edit. What can be shown is whatever the worker still had in memory, which
 * means messages sent before it started, or evicted from the cache since, log
 * as "content unavailable". That is a limit of the platform, not a bug to hunt.
 */

function inScope(message: Message | PartialMessage): boolean {
  return message.guildId === config.guildId;
}

/** Attachments outlive nothing - the names are all that stays useful. */
function attachmentField(message: Message | PartialMessage) {
  const files = [...(message.attachments?.values() ?? [])];
  if (files.length === 0) return [];
  return [
    {
      name: `Attachments (${files.length})`,
      value: truncate(files.map((f) => `\`${f.name}\``).join(", ")),
      inline: false,
    },
  ];
}

async function onDelete(message: Message | PartialMessage): Promise<void> {
  if (!inScope(message)) return;
  if (!(await logEnabled("message_delete"))) return;

  const cfg = (await getConfig()).logging;
  const author = message.author ?? null;
  const guild = message.guild;

  // Discord attributes a delete to its author when someone *else* removed it,
  // and records nothing at all when the author deleted their own - so "no
  // audit entry" is itself the answer, and the log says so rather than
  // shrugging.
  const actor = guild
    ? await whoDid(
        guild,
        AuditLogEvent.MessageDelete,
        (entry: GuildAuditLogsEntry) =>
          auditTargetId(entry) === (author?.id ?? null) &&
          (entry.extra as { channel?: { id: string } } | undefined)?.channel?.id === message.channelId,
        { aggregated: true },
      )
    : null;

  const content = message.partial
    ? "_Not cached - the message was sent before I started, so its content is gone._"
    : cfg.include_content
      ? message.content
        ? quote(message.content)
        : "_No text content._"
      : "_Content logging is switched off._";

  await emitLog(
    message.client,
    "message_delete",
    logEmbed({
      colour: DELETE,
      title: "🗑️ Message deleted",
      description: [
        `**Author:** ${author ? userLabel(author) : "Unknown"}`,
        `**Channel:** ${channelLabel(message.channel as { id: string; name?: string | null })}`,
        actor?.user ? `**Deleted by:** ${userLabel(actor.user)}` : "**Deleted by:** the author, or someone I can't see",
      ].join("\n"),
      actor,
      fields: [{ name: "Content", value: content, inline: false }, ...attachmentField(message)],
      ids: { message: message.id, channel: message.channelId, author: author?.id },
    }),
    { channelId: message.channelId, userId: author?.id, isBot: author?.bot },
  );
}

async function onEdit(
  before: Message | PartialMessage,
  after: Message | PartialMessage,
): Promise<void> {
  if (!inScope(after)) return;
  // Discord fires an update when a link unfurls into an embed, when a message
  // is pinned, and when a component is touched. Only a content change is an
  // edit in the sense anybody reading a log means.
  if (before.content === after.content) return;
  if (!(await logEnabled("message_edit"))) return;

  const cfg = (await getConfig()).logging;
  const author = after.author ?? before.author ?? null;

  await emitLog(
    after.client,
    "message_edit",
    logEmbed({
      colour: UPDATE,
      title: "✏️ Message edited",
      description: [
        `**Author:** ${author ? userLabel(author) : "Unknown"}`,
        `**Channel:** ${channelLabel(after.channel as { id: string; name?: string | null })}`,
        `[Jump to message](https://discord.com/channels/${after.guildId}/${after.channelId}/${after.id})`,
      ].join("\n"),
      fields: cfg.include_content
        ? [
            { name: "Before", value: before.partial ? "_Not cached._" : quote(before.content ?? ""), inline: false },
            { name: "After", value: quote(after.content ?? ""), inline: false },
          ]
        : [{ name: "Content", value: "_Content logging is switched off._", inline: false }],
      ids: { message: after.id, channel: after.channelId, author: author?.id },
    }),
    { channelId: after.channelId, userId: author?.id, isBot: author?.bot },
  );
}

async function onBulkDelete(
  messages: ReadonlyCollection<Snowflake, Message | PartialMessage>,
): Promise<void> {
  const first = messages.first();
  if (!first || !inScope(first)) return;
  if (!(await logEnabled("message_bulk_delete"))) return;

  const cfg = (await getConfig()).logging;
  const guild = first.guild;
  const actor = guild
    ? await whoDid(guild, AuditLogEvent.MessageBulkDelete, (entry: GuildAuditLogsEntry) =>
        auditTargetId(entry) === first.channelId,
      )
    : null;

  // Oldest first, so the extract reads as a conversation rather than backwards.
  const lines = [...messages.values()]
    .reverse()
    .filter((m) => !m.partial && m.content)
    .map((m) => `${m.author?.tag ?? "unknown"}: ${m.content}`);

  await emitLog(
    first.client,
    "message_bulk_delete",
    logEmbed({
      colour: DELETE,
      title: `🧹 ${messages.size} messages purged`,
      description: `**Channel:** ${channelLabel(first.channel as { id: string; name?: string | null })}`,
      actor,
      fields:
        cfg.include_content && lines.length
          ? [{ name: `Cached content (${lines.length} of ${messages.size})`, value: quote(lines.join("\n")), inline: false }]
          : [],
      ids: { channel: first.channelId },
    }),
    { channelId: first.channelId },
  );
}

export function registerMessageLogging(client: Client): void {
  client.on(Events.MessageDelete, (message) => void onDelete(message).catch(report));
  client.on(Events.MessageUpdate, (before, after) => void onEdit(before, after).catch(report));
  client.on(Events.MessageBulkDelete, (messages) => void onBulkDelete(messages).catch(report));
}

function report(err: unknown): void {
  console.error("[logging] message handler failed:", err);
}
