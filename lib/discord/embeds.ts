import type { Embed } from "./types";

/**
 * Embed builders, split out from handlers.ts so both the interaction handlers
 * and the admin-panel operations can use them without importing each other.
 */

export const BRAND_COLOR = 0x7a3dff;

/**
 * The bot's own name, which is deliberately not the site's.
 *
 * "Classic Games Hub" is the website and the community; this is the bot that
 * serves them, and every surface it signs — embed footers, audit-log reasons,
 * its help card — says so. Kept here so renaming it is one edit rather than a
 * search across a dozen string literals that would inevitably drift.
 */
export const BOT_NAME = "Classic Games Bot";

export function brandEmbed(extra: Embed = {}): Embed {
  return { color: BRAND_COLOR, footer: { text: BOT_NAME }, ...extra };
}

export function errorEmbed(message: string): Embed {
  return { color: 0xef4444, description: `❌ ${message}` };
}
