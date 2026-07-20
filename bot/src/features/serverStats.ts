import { type Client, ChannelType } from "discord.js";
import { config } from "../config.js";
import { db } from "../db.js";

const UPDATE_MS = 10 * 60_000; // Discord rate-limits channel renames (~2 / 10 min).

async function rename(client: Client, channelId: string, name: string): Promise<void> {
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (
    channel &&
    (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildText)
  ) {
    await channel.setName(name).catch(() => undefined);
  }
}

async function update(client: Client): Promise<void> {
  const stats = await db.serverStats();
  if (!stats) return;
  await rename(client, config.stats.members, `👥 Members: ${stats.members}`);
  await rename(client, config.stats.online, `🟢 Online: ${stats.online}`);
  await rename(client, config.stats.plays, `🎮 Plays today: ${stats.plays_today}`);
}

/** Keeps voice-channel counters in sync with live Hub stats. */
export function startServerStats(client: Client): void {
  if (!config.stats.members && !config.stats.online && !config.stats.plays) return;
  void update(client);
  setInterval(() => void update(client), UPDATE_MS);
}
