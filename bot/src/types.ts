import type {
  ChatInputCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";

/** A slash command: its JSON definition plus a handler. */
export interface Command {
  data: { name: string; toJSON: () => RESTPostAPIApplicationCommandsJSONBody };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
