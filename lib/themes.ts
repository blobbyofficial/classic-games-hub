/** Active colour themes. Future themes must be deliberately released, not exposed as placeholders. */
export interface SiteTheme {
  id: "default" | "halloween" | "red";
  name: string;
  swatch: [string, string];
  premium: boolean;
  animated?: boolean;
}
export const SITE_THEMES: SiteTheme[] = [
  { id: "default", name: "Basic", swatch: ["#f5f5f5", "#202124"], premium: false },
  { id: "halloween", name: "Halloween", swatch: ["#dd904a", "#171e19"], premium: false },
  { id: "red", name: "Velvet Red", swatch: ["#d77b82", "#211a1e"], premium: false },
];
export const SITE_THEME_IDS = new Set<string>(SITE_THEMES.map(t => t.id));
export function isPremiumTheme(_id: string): boolean { return false; }
