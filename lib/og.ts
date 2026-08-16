import { siteUrl } from "@/lib/version";

/**
 * Shared pieces for the generated social cards.
 *
 * There are three of them now - the site card, a profile card and a game card -
 * and they have to look like the same arcade. The palette below is the one from
 * app/opengraph-image.tsx, lifted out so a change to the brand is one edit
 * rather than three that drift.
 *
 * Everything here is deliberately dependency-free: `next/og` renders in a
 * constrained environment with a flexbox-only subset of CSS, and anything
 * imported into a card is code that has to survive it.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG = {
  bg: "linear-gradient(135deg, #151320 0%, #1d1830 55%, #2a1745 100%)",
  ink: "#faf9fc",
  inkMuted: "#c4bfd4",
  inkFaint: "#8b85a0",
  violet: "#a78bfa",
  violetDeep: "#7a3dff",
  cyan: "#22d3ee",
  gold: "#f5c451",
  surface: "rgba(255, 255, 255, 0.06)",
  border: "rgba(255, 255, 255, 0.12)",
} as const;

/** The site's gradient wordmark treatment, as inline styles. */
export const OG_GRADIENT_TEXT = {
  backgroundImage: `linear-gradient(90deg, ${OG.violet}, ${OG.violetDeep}, ${OG.cyan})`,
  backgroundClip: "text",
  color: "transparent",
} as const;

/**
 * Pull a remote image back as a data URI, or give up quietly.
 *
 * `next/og` fetches remote `<img src>` itself, but a failure there throws and
 * takes the whole card with it - so one deleted avatar would serve a broken
 * image for that profile until someone noticed. Fetching it here means a dead
 * URL, a slow host or an HTML error page degrades to the monogram fallback
 * instead, which is the difference between a plain card and no card.
 *
 * The three-second budget is deliberate: a social crawler will not wait around,
 * and a card that renders without the avatar beats one that times out with it.
 */
export async function imageData(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  const absolute = url.startsWith("/") ? `${siteUrl()}${url}` : url;
  if (!absolute.startsWith("https://") && !absolute.startsWith("http://")) return null;

  try {
    const response = await fetch(absolute, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;

    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;

    const bytes = await response.arrayBuffer();
    // Past about 2 MB the base64 string costs more to inline than the picture
    // is worth at 1200x630.
    if (bytes.byteLength > 2_000_000) return null;

    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

/** First character of a name, for the avatar fallback. */
export function monogram(name: string): string {
  return [...name.trim()][0]?.toUpperCase() ?? "?";
}

/** 12345 → "12,345", matching the site's own formatting. */
export function ogNumber(n: number): string {
  return n.toLocaleString("en-GB");
}
