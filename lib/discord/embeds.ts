import type { Embed } from "./types";

/**
 * Embed builders, split out from handlers.ts so both the interaction handlers
 * and the admin-panel operations can use them without importing each other.
 */

export const BRAND_COLOR = 0x7a3dff;

export function brandEmbed(extra: Embed = {}): Embed {
  return { color: BRAND_COLOR, footer: { text: "Classic Games Hub" }, ...extra };
}

export function errorEmbed(message: string): Embed {
  return { color: 0xef4444, description: `❌ ${message}` };
}
