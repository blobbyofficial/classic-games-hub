import type { Message } from "discord.js";
import { db, type LevelingConfig } from "../db.js";

const CONFIG_TTL_MS = 60_000;
let cached: LevelingConfig | null = null;
let cachedAt = 0;

async function getConfig(): Promise<LevelingConfig | null> {
  if (cached && Date.now() - cachedAt < CONFIG_TTL_MS) return cached;
  const cfg = await db.getConfig<LevelingConfig>("leveling");
  if (cfg) {
    cached = cfg;
    cachedAt = Date.now();
  }
  return cached;
}

// Cheap in-process pre-filter; the REAL cooldown is enforced in Postgres
// (bot_award_discord_xp), so restarts can't double-award.
const lastSeen = new Map<string, number>();

/**
 * Discord chat XP — the Arcane replacement. Config lives in Supabase
 * (discord_bot_config.leveling, editable from the admin dashboard):
 * XP range, cooldown, level curve, no-XP channels, announcements and the
 * optional Hub-XP trickle for linked accounts.
 */
export async function handleChatXp(message: Message): Promise<void> {
  if (message.author.bot || !message.inGuild()) return;
  if (message.system) return;

  const cfg = await getConfig();
  if (!cfg || cfg.enabled === false) return;
  if ((cfg.no_xp_channel_ids ?? []).includes(message.channelId)) return;

  const now = Date.now();
  const last = lastSeen.get(message.author.id) ?? 0;
  if (now - last < (cfg.cooldown_seconds ?? 60) * 1000) return;
  lastSeen.set(message.author.id, now);

  const res = await db.awardDiscordXp(
    message.author.id,
    message.author.globalName ?? message.author.username,
  );
  if (!res?.ok || res.cooldown || !res.leveled_up) return;

  if (cfg.announce_level_ups === false) return;
  const channel = cfg.announce_channel_id
    ? await message.client.channels.fetch(cfg.announce_channel_id).catch(() => null)
    : message.channel;
  if (channel && channel.isTextBased() && "send" in channel) {
    channel
      .send(`🎉 ${message.author} reached **level ${res.level}**! Check your rank with \`/rank\`.`)
      .catch(() => undefined);
  }
}
