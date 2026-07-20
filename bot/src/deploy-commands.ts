import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { allCommands } from "./commands/index.js";

/** Registers slash commands to the configured guild (instant, unlike global). */
async function main(): Promise<void> {
  const rest = new REST().setToken(config.discordToken);
  const body = allCommands.map((c) => c.data.toJSON());
  console.log(`Registering ${body.length} commands to guild ${config.guildId}…`);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
  console.log("✅ Commands registered.");
}

main().catch((err) => {
  console.error("Failed to register commands:", err);
  process.exit(1);
});
