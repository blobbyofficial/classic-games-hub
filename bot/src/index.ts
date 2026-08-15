import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  type PresenceStatusData,
} from "discord.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { startHealthServer } from "./health.js";
import { runAutomod } from "./features/automod.js";
import { handleChatXp } from "./features/leveling.js";
import { startLiveFeed } from "./features/liveFeed.js";
import { LOGGING_INTENTS, startAuditLogging } from "./features/logging/index.js";
import { syncMemberRoles } from "./features/roleSync.js";
import { startServerStats } from "./features/serverStats.js";
import { handleMemberJoin, maybeWelcome } from "./features/verification.js";

/**
 * Companion gateway worker. Slash commands, buttons and modals are handled
 * serverlessly by the website (app/api/discord/interactions) - this process
 * covers what a webhook can't:
 *
 *   * reading chat messages for XP + automod
 *   * granting milestone level roles the moment someone levels up
 *   * putting new joiners behind the verification gate
 *   * the live score feed and the stat-counter channels
 *   * **server audit logging** - every message, channel, role and member
 *     change in the server, which no HTTP endpoint ever hears about
 *   * **showing the bot as Online** - a Discord bot only appears online while
 *     something holds a gateway connection, which is exactly what this is.
 *
 * Everything else works without it.
 */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    ...LOGGING_INTENTS,
    // Optional: enable "Message Content" in the Developer Portal to let the
    // automod rules see links/invites, and the log quote what was deleted.
    ...(process.env.MESSAGE_CONTENT_INTENT === "true" ? [GatewayIntentBits.MessageContent] : []),
  ],
  /**
   * Without partials, discord.js drops delete/update events for anything it
   * never cached - which is every message sent before this process started.
   * Enabling them is the difference between a delete log that covers the
   * server and one that covers the last few hours of it.
   */
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
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
  console.log(`✅ Logged in as ${c.user.tag} - showing as ${config.presence.status}`);
  if (!c.guilds.cache.has(config.guildId)) {
    console.warn(
      `⚠️  I'm not in DISCORD_GUILD_ID (${config.guildId}). Every feature is scoped to that server, so nothing will happen until it's right.`,
    );
  }

  // Re-assert presence periodically: Discord drops it on some reconnects, and
  // a dropped presence is what makes a running bot look offline.
  const setPresence = () =>
    c.user.setPresence({
      status: presenceStatus(),
      activities: [{ name: config.presence.text, type: activityType() }],
    });
  setPresence();
  setInterval(setPresence, 10 * 60_000);

  startHeartbeat();
  startLiveFeed(c);
  startServerStats(c);
});

/**
 * Tell the site we're alive. `platform_status()` treats a heartbeat older than
 * three minutes as offline, so beat every minute - two can be lost to a blip
 * without /status flipping the bot to "Offline".
 */
function startHeartbeat(): void {
  // `npm_package_version` is only set when the process was started by npm, and
  // the Docker image runs `node dist/index.js` directly - so the version on
  // /status was blank on exactly the deployment people actually use.
  const version = process.env.BOT_VERSION ?? process.env.npm_package_version ?? null;
  const beat = () =>
    void db.heartbeat(version).catch((err) => console.error("[heartbeat] failed:", err));
  beat();
  setInterval(beat, 60_000);
}

// ── Feature listeners ────────────────────────────────────────────────
// Everything is scoped to DISCORD_GUILD_ID. The bot may legitimately sit in
// more than one server (a test server, someone else's invite), and awarding
// Hub XP or running Hub automod there would be wrong in both directions.

client.on(Events.MessageCreate, (message) => {
  if (message.partial) return; // a cached-out message has no content to judge
  if (message.guildId !== config.guildId) return;
  void (async () => {
    const removed = await runAutomod(message).catch((err) => {
      console.error("[automod] failed:", err);
      return false;
    });
    if (!removed) await handleChatXp(message).catch((err) => console.error("[xp] failed:", err));
  })();
});

/**
 * Automod on edits too. Posting something innocuous and editing an invite into
 * it a second later used to walk straight past every rule, because automod
 * only ever saw a message once.
 */
client.on(Events.MessageUpdate, (_before, after) => {
  if (after.partial || after.guildId !== config.guildId) return;
  void runAutomod(after).catch((err) => console.error("[automod] edit check failed:", err));
});

client.on(Events.GuildMemberAdd, (member) => {
  if (member.guild.id !== config.guildId) return;
  void (async () => {
    await handleMemberJoin(member);
    await maybeWelcome(member);
  })().catch((err) => console.error("[join] failed:", err));
});

/**
 * Boosting is a Hub-visible fact (booster perks, the monthly drop, the tenure
 * badge), and the only place it is announced is this event. Without it the
 * profile stayed stale until the nightly reconcile - a new booster paid for a
 * month and waited a day for it.
 */
client.on(Events.GuildMemberUpdate, (before, after) => {
  if (after.guild.id !== config.guildId) return;
  if (before.premiumSince?.getTime() === after.premiumSince?.getTime()) return;
  void syncMemberRoles(after).catch((err) => console.error("[boost sync] failed:", err));
});

startAuditLogging(client);

// ── Connection resilience ────────────────────────────────────────────
// discord.js reconnects on its own; these hooks make failures visible and, in
// the cases it can't recover from, exit non-zero so the host restarts the
// process instead of leaving a zombie showing offline.

client.on(Events.ShardDisconnect, (event, id) =>
  console.warn(`⚠️  Shard ${id} disconnected (code ${event.code}) - reconnecting…`),
);
client.on(Events.ShardReconnecting, (id) => console.log(`🔄 Shard ${id} reconnecting…`));
client.on(Events.ShardResume, (id) => console.log(`✅ Shard ${id} resumed`));
client.on(Events.ShardError, (error, id) => console.error(`Shard ${id} error:`, error.message));
client.on(Events.Error, (error) => console.error("Client error:", error.message));
client.on(Events.Invalidated, () => {
  console.error("❌ Session invalidated - exiting so the host can restart me.");
  process.exit(1);
});

process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));
/**
 * An uncaught exception leaves the process in a state nothing here can reason
 * about. It used to be logged and ignored, which produced the worst outcome
 * available: a worker that is "up" for the health check and has stopped doing
 * its job. Log it and let the host restart a clean one.
 */
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception - exiting so the host can restart me:", err);
  void client.destroy().finally(() => process.exit(1));
  setTimeout(() => process.exit(1), 3000).unref();
});
process.on("SIGTERM", () => {
  console.log("SIGTERM - shutting down cleanly.");
  void client.destroy().finally(() => process.exit(0));
});

startHealthServer(client);

client.login(config.discordToken).catch((err) => {
  console.error("Login failed:", err);
  process.exit(1);
});
