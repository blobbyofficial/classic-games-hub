import { Client, Events, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { handleChatXp } from "./features/leveling.js";
import { syncMemberRoles } from "./features/roleSync.js";
import { startLiveFeed } from "./features/liveFeed.js";
import { startServerStats } from "./features/serverStats.js";

/**
 * Companion gateway worker. Slash commands are handled serverlessly by the
 * website (app/api/discord/interactions) — this process only covers what a
 * webhook can't: reading chat messages for XP, posting the live feed,
 * renaming stat channels and syncing roles the moment someone joins.
 * The bot works without it; you just lose those four things.
 */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  startLiveFeed(c);
  startServerStats(c);
});

client.on(Events.MessageCreate, (message) => {
  void handleChatXp(message);
});

client.on(Events.GuildMemberAdd, (member) => {
  if (member.guild.id === config.guildId) void syncMemberRoles(member);
});

process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

client.login(config.discordToken);
