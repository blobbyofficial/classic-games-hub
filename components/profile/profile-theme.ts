/** Background gradients for equipped `profile_theme` cosmetics. */
export const PROFILE_THEMES: Record<string, string> = {
  "theme-synthwave": "linear-gradient(135deg, #f472b6 0%, #8b5cf6 50%, #312e81 100%)",
  "theme-terminal": "linear-gradient(135deg, #052e16 0%, #14532d 100%)",
  "theme-deep-space": "radial-gradient(circle at 30% 20%, #312e81 0%, #0f172a 60%, #020617 100%)",
};

export const BANNER_THEMES: Record<string, string> = {
  "banner-arcade-floor": "linear-gradient(135deg, #312e81, #8b5cf6)",
  "banner-pixel-sunset": "linear-gradient(135deg, #f97316, #f472b6, #312e81)",
};

export function bannerBackground(equipped?: Record<string, string>): string {
  const banner = equipped?.banner;
  if (banner && BANNER_THEMES[banner]) return BANNER_THEMES[banner];
  return "linear-gradient(135deg, oklch(0.55 0.24 293), oklch(0.6 0.2 330))";
}
