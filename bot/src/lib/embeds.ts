import { EmbedBuilder } from "discord.js";
import { BRAND_COLOR, config } from "../config.js";

export function brandEmbed(): EmbedBuilder {
  return new EmbedBuilder().setColor(BRAND_COLOR).setFooter({ text: "Classic Games Hub" });
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0xef4444).setDescription(`❌ ${message}`);
}

export function profileUrl(username: string): string {
  return `${config.siteUrl}/u/${username}`;
}

/** Friendly copy for the error codes returned by the bot_* RPCs. */
export const RPC_ERRORS: Record<string, string> = {
  not_linked:
    "You haven't linked a Hub account yet. Sign in at the Hub with Discord to get started.",
  sender_not_linked: "You need a linked Hub account first — sign in at the Hub with Discord.",
  recipient_not_linked: "That player hasn't linked a Hub account yet.",
  already_claimed: "You've already claimed your daily reward today. Come back tomorrow!",
  insufficient: "You don't have enough credits for that.",
  bad_amount: "Enter a positive amount.",
  self: "You can't pay yourself.",
  suspended: "Your account is suspended.",
};

export function friendlyError(code: string | undefined): string {
  return (code && RPC_ERRORS[code]) || "Something went wrong. Try again later.";
}
