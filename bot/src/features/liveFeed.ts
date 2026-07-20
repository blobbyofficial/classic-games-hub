import { type Client, EmbedBuilder, type SendableChannels } from "discord.js";
import { BRAND_COLOR, config } from "../config.js";
import { db, type FeedEvent } from "../db.js";

const POLL_MS = 15_000;
let lastId = 0;
let primed = false;

function eventEmbed(ev: FeedEvent): EmbedBuilder {
  const name = ev.display_name ?? ev.username;
  const url = `${config.siteUrl}/u/${ev.username}`;
  if (ev.type === "high_score") {
    const title = (ev.data.title as string) ?? "a game";
    const score = Number(ev.data.score ?? 0).toLocaleString();
    return new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setDescription(`🏆 **${name}** set a new high score in **${title}** — ${score}! [profile](${url})`);
  }
  const achievement = (ev.data.name as string) ?? "an achievement";
  return new EmbedBuilder()
    .setColor(0xfbbf24)
    .setDescription(`🎖️ **${name}** unlocked **${achievement}**! [profile](${url})`);
}

async function poll(client: Client): Promise<void> {
  const rows = await db.recentFeed(lastId);
  if (!rows || rows.length === 0) return;
  lastId = Math.max(lastId, ...rows.map((r) => r.id));

  // Skip the backlog that already existed when the bot started.
  if (!primed) {
    primed = true;
    return;
  }

  const channel = await client.channels.fetch(config.liveScoresChannelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !("send" in channel)) return;
  for (const ev of rows) {
    await (channel as SendableChannels).send({ embeds: [eventEmbed(ev)] }).catch(() => undefined);
  }
}

/** Posts new high-scores and achievement unlocks into the live-scores channel. */
export function startLiveFeed(client: Client): void {
  if (!config.liveScoresChannelId) return;
  void poll(client);
  setInterval(() => void poll(client), POLL_MS);
}
