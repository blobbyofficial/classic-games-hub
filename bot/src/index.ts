import { Client, Events, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { commandMap } from "./commands/index.js";
import { handleChatXp } from "./features/leveling.js";
import { startLiveFeed } from "./features/liveFeed.js";
import { startServerStats } from "./features/serverStats.js";

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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commandMap.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Command ${interaction.commandName} errored:`, err);
    const content = "Something went wrong running that command.";
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, ephemeral: true }).catch(() => undefined);
    } else {
      await interaction.reply({ content, ephemeral: true }).catch(() => undefined);
    }
  }
});

client.on(Events.MessageCreate, (message) => {
  void handleChatXp(message);
});

process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

client.login(config.discordToken);
