/** Seasonal presentation is independent of purchased colour themes and credit events. */
export type Season = "halloween" | null;
export function activeSeason(now = new Date()): Season {
  const override = process.env.NEXT_PUBLIC_SITE_SEASON;
  if (override === "off") return null;
  if (override === "halloween") return "halloween";
  // UTC boundary: same experience for every visitor, October only.
  return now.getUTCMonth() === 9 ? "halloween" : null;
}
