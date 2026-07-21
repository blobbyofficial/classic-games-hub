/** Background gradients for equipped `profile_theme` cosmetics. */
export const PROFILE_THEMES: Record<string, string> = {
  "theme-synthwave": "linear-gradient(135deg, #f472b6 0%, #a855f7 40%, #6d28d9 70%, #312e81 100%)",
  "theme-terminal": "linear-gradient(135deg, #052e16 0%, #14532d 100%)",
  "theme-deep-space": "radial-gradient(circle at 30% 20%, #4338ca 0%, #1e1b4b 45%, #0f172a 75%, #020617 100%)",
  "theme-aurora": "linear-gradient(135deg, #22d3ee 0%, #34d399 30%, #a855f7 65%, #f472b6 100%)",
  "theme-sunset": "linear-gradient(135deg, #f59e0b 0%, #ef4444 55%, #7c3aed 100%)",
  "theme-ocean": "linear-gradient(160deg, #38bdf8 0%, #0ea5e9 30%, #2563eb 65%, #1e1b4b 100%)",
  "theme-rose-gold": "linear-gradient(135deg, #fda4af 0%, #f59e0b 100%)",
  "theme-midnight": "radial-gradient(circle at 70% 20%, #1e3a8a 0%, #0f172a 55%, #020617 100%)",
};

export const BANNER_THEMES: Record<string, string> = {
  "banner-arcade-floor": "linear-gradient(135deg, #312e81, #8b5cf6)",
  "banner-pixel-sunset": "linear-gradient(135deg, #f97316, #f472b6, #312e81)",
  "banner-nebula": "radial-gradient(circle at 25% 30%, #a855f7 0%, #7c3aed 25%, #1e1b4b 60%, #020617 100%)",
  "banner-emerald-tide": "linear-gradient(135deg, #059669, #0ea5e9)",
  "banner-candy": "linear-gradient(135deg, #f472b6 0%, #c084fc 45%, #22d3ee 100%)",
  "banner-molten": "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 30%, #f97316 70%, #fbbf24 100%)",
};

export function bannerBackground(equipped?: Record<string, string>): string {
  const banner = equipped?.banner;
  if (banner && BANNER_THEMES[banner]) return BANNER_THEMES[banner];
  // A plain solid colour chosen by the player (email-tier custom banner).
  if (banner && /^#[0-9a-fA-F]{6}$/.test(banner)) return banner;
  // Fall back to an equipped profile theme so themes are visible too.
  const theme = equipped?.profile_theme;
  if (theme && PROFILE_THEMES[theme]) return PROFILE_THEMES[theme];
  return "linear-gradient(135deg, oklch(0.55 0.24 293), oklch(0.6 0.2 330))";
}
