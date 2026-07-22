/**
 * Global site colour themes (settings → Appearance). The looks live in
 * styles/globals.css (`html[data-site-theme=…]`); the premium gate is enforced
 * by the database (migration 0038) — this catalogue only drives the UI.
 */

export interface SiteTheme {
  id: string;
  name: string;
  /** Swatch colours for the picker (top → bottom). */
  swatch: [string, string];
  premium: boolean;
  animated?: boolean;
}

export const SITE_THEMES: SiteTheme[] = [
  { id: "default", name: "Arcade Violet", swatch: ["#8b5cf6", "#6d28d9"], premium: false },
  { id: "midnight", name: "Midnight", swatch: ["#3f3f46", "#09090b"], premium: false },
  { id: "ocean", name: "Ocean", swatch: ["#60a5fa", "#1d4ed8"], premium: false },
  { id: "emerald", name: "Emerald", swatch: ["#34d399", "#047857"], premium: false },
  { id: "crimson", name: "Crimson", swatch: ["#f87171", "#b91c1c"], premium: true },
  { id: "gold", name: "Gold Rush", swatch: ["#fbbf24", "#b45309"], premium: true },
  { id: "rose", name: "Neon Rose", swatch: ["#fb7185", "#be123c"], premium: true },
  { id: "synthwave", name: "Synthwave", swatch: ["#e879f9", "#22d3ee"], premium: true, animated: true },
  { id: "aurora", name: "Aurora", swatch: ["#34d399", "#a78bfa"], premium: true, animated: true },
];

export const SITE_THEME_IDS = new Set(SITE_THEMES.map((t) => t.id));

export function isPremiumTheme(id: string): boolean {
  return SITE_THEMES.find((t) => t.id === id)?.premium ?? false;
}
