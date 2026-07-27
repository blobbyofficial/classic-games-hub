import { ActivityType, Client, Events, GatewayIntentBits, type PresenceStatusData } from "discord.js";
import { config } from "./config.js";
import { startHealthServer } from "./health.js";
import { runAutomod } from "./features/automod.js";
import { handleChatXp } from "./features/leveling.js";
import { startLiveFeed } from "./features/liveFeed.js";
import { startServerStats } from "./features/serverStats.js";
import { handleMemberJoin, maybeWelcome } from "./features/verification.js";

/**
 * Companion gateway worker. Slash commands, buttons and modals are handled
 * serverlessly by the website (app/api/discord/interactions) — this process
 * covers what a webhook can't:
 *
 *   * reading chat messages for XP + automod
 *   * granting milestone level roles the moment someone levels up
 *   * putting new joiners behind the verification gate
 *   * the live score feed and the stat-counter channels
 *   * **showing the bot as Online** — a Discord bot only appears online while
 *     something holds a gateway connection, which is exactly what this is.
 *
 * Everything else works without it.
 */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    // Optional: enable "Message Content" in the Developer Portal to let the
    // automod rules see links/invites. XP works fine without it.
    ...(process.env.MESSAGE_CONTENT_INTENT === "true" ? [GatewayIntentBits.MessageContent] : []),
  ],
  presence: {
    status: presenceStatus(),
    activities: [{ name: config.presence.text, type: activityType() }],
  },
});

function activityType(): ActivityType {
  switch (config.presence.type) {
    case "watching":
      return ActivityType.Watching;
    case "listening":
      return ActivityType.Listening;
    case "competing":
      return ActivityType.Competing;
    default:
      return ActivityType.Playing;
  }
}

function presenceStatus(): PresenceStatusData {
  const status = config.presence.status;
  return status === "idle" || status === "dnd" || status === "invisible" ? status : "online";
}

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag} — showing as ${config.presence.status}`);
  // Re-assert presence periodically: Discord drops it on some reconnects, and
  // a dropped presence is what makes a running bot look offline.
  const setPresence = () =>
    c.user.setPresence({
      status: presenceStatus(),
      activities: [{ name: config.presence.text, type: activityType() }],
    });
  setPresence();
  setInterval(setPresence, 10 * 60_000);

  startLiveFeed(c);
  startServerStats(c);
});

client.on(Events.MessageCreate, (message) => {
  void (async () => {
    const removed = await runAutomod(message).catch(() => false);
    if (!removed) await handleChatXp(message);
  })();
});

client.on(Events.GuildMemberAdd, (member) => {
  void (async () => {
    await handleMemberJoin(member);
    await maybeWelcome(member);
  })();
});

// ── Connection resilience ────────────────────────────────────────────
// discord.js reconnects on its own; these hooks make failures visible and, in
// the one case it can't recover from (invalidated session), exit non-zero so
// the host restarts the process instead of leaving a zombie showing offline.

client.on(Events.ShardDisconnect, (event, id) =>
  console.warn(`⚠️  Shard ${id} disconnected (code ${event.code}) — reconnecting…`),
);
client.on(Events.ShardReconnecting, (id) => console.log(`🔄 Shard ${id} reconnecting…`));
client.on(Events.ShardResume, (id) => console.log(`✅ Shard ${id} resumed`));
client.on(Events.ShardError, (error, id) => console.error(`Shard ${id} error:`, error.message));
client.on(Events.Invalidated, () => {
  console.error("❌ Session invalidated — exiting so the host can restart me.");
  process.exit(1);
});

process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));
process.on("SIGTERM", () => {
  console.log("SIGTERM — shutting down cleanly.");
  client.destroy().finally(() => process.exit(0));
});

startHealthServer(client);

client.login(config.discordToken).catch((err) => {
  console.error("Login failed:", err);
  process.exit(1);
});
