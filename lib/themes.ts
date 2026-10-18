/** Active colour themes. Future themes must be deliberately released, not exposed as placeholders. */
export interface SiteTheme {
  id: "default" | "halloween" | "red" | "premium" | "retro";
  name: string;
  swatch: [string, string];
  premium: boolean;
  animated?: boolean;
}
export const SITE_THEMES: SiteTheme[] = [
  { id: "default", name: "Basic", swatch: ["#f5f5f5", "#202124"], premium: false },
  { id: "halloween", name: "Halloween", swatch: ["#dd904a", "#171e19"], premium: false },
  { id: "red", name: "Velvet Red", swatch: ["#d77b82", "#211a1e"], premium: false },
  { id: "premium", name: "Premium · Atelier", swatch: ["#c9ab7d", "#161d27"], premium: true },
  { id: "retro", name: "Retro · Insert Coin", swatch: ["#8bebb6", "#182720"], premium: false },
];
export const SITE_THEME_IDS = new Set<string>(SITE_THEMES.map(t => t.id));
export function isPremiumTheme(id: string): boolean { return id === "premium"; }
export type ThemeEntitlements = { premium: boolean; retro: boolean };
export const NO_THEME_ENTITLEMENTS: ThemeEntitlements = { premium: false, retro: false };
export function canUseSiteTheme(id: string, entitlements: ThemeEntitlements): boolean {
  return SITE_THEME_IDS.has(id) && (id !== "premium" || entitlements.premium) && (id !== "retro" || entitlements.retro);
}
/** Untrusted RPC payload is fail-closed. */
export function parseThemeEntitlements(value: unknown): ThemeEntitlements {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { premium: data.premium === true, retro: data.retro === true };
}
