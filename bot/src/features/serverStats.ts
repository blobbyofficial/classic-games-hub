import { type Client, ChannelType } from "discord.js";
import { config } from "../config.js";
import { db } from "../db.js";
import { getConfig, template } from "../hubConfig.js";

const UPDATE_MS = 10 * 60_000; // Discord rate-limits channel renames (~2 / 10 min).

async function rename(client: Client, channelId: string, name: string): Promise<void> {
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (
    channel &&
    (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildText)
  ) {
    if (channel.name === name) return; // don't burn a rename on an unchanged number
    await channel.setName(name).catch(() => undefined);
  }
}

async function update(client: Client): Promise<void> {
  const cfg = (await getConfig()).stats;
  if (cfg.enabled === false) return;

  const stats = await db.serverStats();
  if (!stats) return;

  const guild = client.guilds.cache.get(config.guildId);
  const vars = {
    online: stats.online,
    members: stats.members,
    plays: stats.plays_today,
    plays_total: stats.plays_total,
    linked: stats.linked,
    discord_members: guild?.memberCount ?? 0,
  };

  // Channel IDs come from the database (set by `/setup stats`), with the old
  // env vars still honoured so existing deployments keep working.
  const channels = {
    online: cfg.channels.online ?? config.stats.online,
    members: cfg.channels.members ?? config.stats.members,
    plays: cfg.channels.plays ?? config.stats.plays,
    discord_members: cfg.channels.discord_members ?? "",
  };

  for (const key of ["online", "members", "plays", "discord_members"] as const) {
    const id = channels[key];
    if (!id) continue;
    await rename(client, id, template(cfg.templates[key], vars).slice(0, 100));
  }
}

/**
 * Keeps voice-channel counters in sync with live Hub stats — the ServerStats
 * replacement. The website can do this too (/api/cron/discord-stats); whichever
 * runs, the rename is idempotent.
 */
export function startServerStats(client: Client): void {
  void update(client);
  setInterval(() => void update(client), UPDATE_MS);
}
