/** Single-item CGH catalogue, pending transactional database retirement/refunds.
 * Server actions use this list as a UI/API guard; Supabase must also be migrated.
 */
export const ACTIVE_SHOP_SLUGS = [
  "frame-neon-ring", "theme-deep-space", "banner-nebula",
  "nameplate-cyber", "badge-champion", "track-neon-drift",
  "boost-xp-24h",
] as const;

const ACTIVE = new Set<string>(ACTIVE_SHOP_SLUGS);
export function isActiveShopItem(slug: string): boolean { return ACTIVE.has(slug); }
