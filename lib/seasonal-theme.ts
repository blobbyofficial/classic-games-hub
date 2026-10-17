/** Seasonal presentation is independent from personal themes and reward events. */
export type Season = "halloween" | null;
export function activeSeason(now = new Date()): Season {
  const override = process.env.SITE_SEASON ?? process.env.NEXT_PUBLIC_SITE_SEASON;
  if (override === "off") return null;
  if (override === "halloween") return "halloween";
  return now.getUTCMonth() === 9 ? "halloween" : null;
}
