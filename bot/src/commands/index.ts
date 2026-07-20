import { Collection } from "discord.js";
import type { Command } from "../types.js";
import { economyCommands } from "./economy.js";
import { infoCommands } from "./info.js";
import { roleCommands } from "./roles.js";
import { moderationCommands } from "./moderation.js";

export const allCommands: Command[] = [
  ...economyCommands,
  ...infoCommands,
  ...roleCommands,
  ...moderationCommands,
];

export const commandMap = new Collection<string, Command>(
  allCommands.map((c) => [c.data.name, c]),
);
