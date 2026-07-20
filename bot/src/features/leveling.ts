import type { Message } from "discord.js";
import { db } from "../db.js";

const COOLDOWN_MS = 60_000;
const lastAward = new Map<string, number>();

/**
 * Chat-activity XP: at most once per minute per user, feeding the same level
 * as gameplay. Unlinked users are silently ignored.
 */
export async function handleChatXp(message: Message): Promise<void> {
  if (message.author.bot || !message.inGuild()) return;

  const now = Date.now();
  const last = lastAward.get(message.author.id) ?? 0;
  if (now - last < COOLDOWN_MS) return;
  lastAward.set(message.author.id, now);

  const xp = 5 + Math.floor(Math.random() * 11); // 5–15
  const res = await db.addChatXp(message.author.id, xp);
  if (res?.ok && res.leveled_up) {
    message.channel
      .send(`🎉 ${message.author} reached **level ${res.level}**!`)
      .catch(() => undefined);
  }
}
