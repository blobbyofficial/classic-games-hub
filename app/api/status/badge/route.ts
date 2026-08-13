import { getStatusSummary } from "@/services/status";
import { COMPONENT_STATUS, INDICATOR, type ComponentStatus } from "@/lib/status";
import { CORS_HEADERS } from "@/lib/status-api";

/**
 * GET /api/status/badge - an SVG status badge, for putting on other sites.
 *
 *   /api/status/badge                      overall: "status | all systems operational"
 *   /api/status/badge?component=games      one component
 *   /api/status/badge?label=Arcade         override the left-hand label
 *   /api/status/badge?style=flat           square corners
 *
 * Deliberately shields.io's proportions, because that is the badge shape every
 * README on earth already has a row of - a badge that does not sit level with
 * its neighbours is worse than no badge.
 *
 * Self-contained: system font stack, no external references, no CSS variables.
 * It is served as an image into somebody else's page, where none of ours exist.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Literal hex, not tokens - see above. Matched to the site's own palette. */
const BADGE_COLOUR: Record<ComponentStatus, string> = {
  operational: "#22c55e",
  degraded_performance: "#eab308",
  partial_outage: "#f97316",
  major_outage: "#ef4444",
  under_maintenance: "#7a3dff",
};

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Verdana at 11px averages a shade over 6px per character. Estimating rather
 * than measuring is what shields.io does too: the badge only has to look
 * balanced, and shipping a font metrics table to get it exact is not worth the
 * bytes on an endpoint meant to be cached and forgotten.
 */
const textWidth = (text: string) => Math.ceil(text.length * 6.2) + 20;

function badge(label: string, message: string, colour: string, square: boolean): string {
  const labelWidth = textWidth(label);
  const messageWidth = textWidth(message);
  const total = labelWidth + messageWidth;
  const radius = square ? 0 : 4;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(message)}">
  <title>${escapeXml(label)}: ${escapeXml(message)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="${radius}" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${colour}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelWidth + messageWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(message)}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${escapeXml(message)}</text>
  </g>
</svg>`;
}

function svg(body: string, seconds: number) {
  return new Response(body, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`,
    },
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("component");
  const square = params.get("style") === "flat";
  const summary = await getStatusSummary();

  // An unreachable database still has to render something, and "unknown" in
  // grey is the honest answer - a badge that vanishes tells the reader nothing.
  if (!summary) {
    return svg(badge(params.get("label") ?? "status", "unknown", "#9ca3af", square), 15);
  }

  if (slug) {
    const component = summary.components.find((c) => c.slug === slug);
    if (!component) {
      return svg(badge(params.get("label") ?? "status", "no such component", "#9ca3af", square), 300);
    }
    return svg(
      badge(
        params.get("label") ?? component.name.toLowerCase(),
        COMPONENT_STATUS[component.status].label.toLowerCase(),
        BADGE_COLOUR[component.status],
        square,
      ),
      30,
    );
  }

  const indicator = summary.status.indicator;
  const worst = summary.components.reduce<ComponentStatus>(
    (acc, c) => (c.status === "operational" ? acc : c.status),
    "operational",
  );

  return svg(
    badge(
      params.get("label") ?? "status",
      INDICATOR[indicator].label.toLowerCase(),
      indicator === "none" ? BADGE_COLOUR.operational : BADGE_COLOUR[worst],
      square,
    ),
    30,
  );
}

export { corsPreflight as OPTIONS } from "@/lib/status-api";
