import { EmbedBuilder, PermissionsBitField, type Message } from "discord.js";
import { BRAND_COLOR } from "../config.js";
import { db } from "../db.js";
import { getConfig } from "../hubConfig.js";

/**
 * Light automod (the last piece of Sapphire): invite links, link spam, mention
 * spam and message flooding. Disabled by default — turn it on at
 * Admin → Discord bot. Link/invite rules need the **Message Content** intent;
 * mention and flood rules work without it.
 */

const INVITE = /(discord\.(gg|io|me|li)|discord(app)?\.com\/invite)\/[a-z0-9-]+/i;
const LINK = /https?:\/\/\S+/i;

/** Recent message timestamps per author, for the flood rule. */
const recent = new Map<string, number[]>();

export async function runAutomod(message: Message): Promise<boolean> {
  if (message.author.bot || !message.inGuild() || message.system) return false;

  const cfg = (await getConfig()).moderation;
  const rules = cfg.automod;
  if (!rules.enabled) return false;
  if ((rules.exempt_channel_ids ?? []).includes(message.channelId)) return false;

  const member = message.member;
  if (member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return false;
  if (member && (rules.exempt_role_ids ?? []).some((r) => member.roles.cache.has(r))) return false;

  const reason = detect(message, rules);
  if (!reason) return false;

  await message.delete().catch(() => undefined);

  let timedOut = false;
  if (rules.action === "timeout" && member?.moderatable) {
    timedOut = await member
      .timeout(Math.max(1, rules.timeout_minutes) * 60_000, `Automod: ${reason}`)
      .then(() => true)
      .catch(() => false);
  }

  await db.addCase({
    actor: message.client.user?.id ?? "bot",
    target: message.author.id,
    action: "automod",
    reason,
    minutes: timedOut ? rules.timeout_minutes : null,
    targetUsername: message.author.username,
  });

  if (cfg.log_channel_id) {
    const channel = await message.client.channels.fetch(cfg.log_channel_id).catch(() => null);
    if (channel?.isTextBased() && "send" in channel) {
      await channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(BRAND_COLOR)
              .setTitle("🤖 Automod")
              .setDescription(
                [
                  `**Member:** ${message.author} (\`${message.author.id}\`)`,
                  `**Channel:** <#${message.channelId}>`,
                  `**Rule:** ${reason}`,
                  timedOut ? `**Action:** message deleted + ${rules.timeout_minutes}m timeout` : "**Action:** message deleted",
                ].join("\n"),
              )
              .setTimestamp(),
          ],
          allowedMentions: { parse: [] },
        })
        .catch(() => undefined);
    }
  }
  return true;
}

function detect(message: Message, rules: Awaited<ReturnType<typeof getConfig>>["moderation"]["automod"]): string | null {
  const content = message.content ?? "";

  if (rules.block_invites && INVITE.test(content)) return "Discord invite link";
  if (rules.block_links && LINK.test(content)) return "links not allowed here";

  const mentions = message.mentions.users.size + message.mentions.roles.size;
  if (rules.max_mentions > 0 && mentions > rules.max_mentions) {
    return `mass mention (${mentions})`;
  }

  const window = Math.max(1, rules.spam_window_seconds) * 1000;
  const now = Date.now();
  const stamps = (recent.get(message.author.id) ?? []).filter((t) => now - t < window);
  stamps.push(now);
  recent.set(message.author.id, stamps);
  if (recent.size > 5000) recent.clear(); // cheap bound; the map is only a heuristic
  if (rules.spam_messages > 0 && stamps.length > rules.spam_messages) {
    return `message flood (${stamps.length} in ${rules.spam_window_seconds}s)`;
  }

  return null;
}
