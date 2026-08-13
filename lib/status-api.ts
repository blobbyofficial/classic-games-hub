import { NextResponse } from "next/server";
import type {
  ComponentStatus,
  Incident,
  StatusIndicator,
  StatusSummary,
} from "@/lib/status";
import { INDICATOR } from "@/lib/status";
import { siteUrl } from "@/lib/version";

/**
 * Shared plumbing for /api/status/*.
 *
 * The whole point of this API is that other people's code can read it, so the
 * defaults are the ones that make that painless: CORS open to everyone, no key,
 * a short shared cache so a Discord bot polling it does not become load, and a
 * `stale-while-revalidate` window so a slow database serves the last known
 * answer rather than an error. A status endpoint that goes down with the site
 * is not much use.
 */

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

/** 30s at the edge, serving stale for a further 60 while it refreshes. */
export function statusJson(body: unknown, init?: { status?: number; seconds?: number }) {
  const seconds = init?.seconds ?? 30;
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`,
    },
  });
}

export function statusError(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
  );
}

/** Preflight for the one endpoint that accepts a POST. */
export function corsPreflight() {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" } });
}

// ── Statuspage compatibility ────────────────────────────────────────────────

/**
 * Re-shape the summary into Statuspage's `summary.json`.
 *
 * Nearly free, because 0071 already speaks Statuspage's vocabulary - the
 * statuses and indicators pass through untranslated and only the envelope
 * differs. Worth having because it means an existing status widget, dashboard
 * or uptime tool can point at this site and simply work.
 */
export function toStatuspage(summary: StatusSummary) {
  const url = siteUrl();
  const incidentJson = (incident: Incident) => ({
    id: incident.id,
    name: incident.title,
    status: incident.status,
    created_at: incident.started_at,
    updated_at: incident.updates[0]?.created_at ?? incident.started_at,
    monitoring_at:
      incident.updates.find((u) => u.status === "monitoring")?.created_at ?? null,
    resolved_at: incident.resolved_at,
    impact: incident.impact,
    shortlink: `${url}/status`,
    started_at: incident.started_at,
    scheduled_for: incident.scheduled_for,
    scheduled_until: incident.scheduled_until,
    page_id: "classic-games-hub",
    incident_updates: incident.updates.map((update) => ({
      id: update.id,
      status: update.status,
      body: update.body,
      incident_id: incident.id,
      created_at: update.created_at,
      updated_at: update.created_at,
      display_at: update.created_at,
      affected_components: incident.components.map((c) => ({
        code: c.slug,
        name: c.name,
        new_status: c.status,
      })),
      deliver_notifications: false,
    })),
    components: incident.components.map((c) => ({ id: c.slug, name: c.name, status: c.status })),
  });

  return {
    page: {
      id: "classic-games-hub",
      name: "Classic Games Hub",
      url: `${url}/status`,
      time_zone: "Etc/UTC",
      updated_at: summary.generated_at,
    },
    components: summary.components.map((c) => ({
      id: c.slug,
      name: c.name,
      status: c.status satisfies ComponentStatus,
      created_at: null,
      updated_at: summary.generated_at,
      position: c.position,
      description: c.description,
      showcase: true,
      start_date: null,
      group_id: null,
      page_id: "classic-games-hub",
      group: false,
      only_show_if_degraded: false,
    })),
    incidents: summary.incidents.map(incidentJson),
    scheduled_maintenances: summary.maintenance.map(incidentJson),
    status: {
      indicator: summary.status.indicator satisfies StatusIndicator,
      description: INDICATOR[summary.status.indicator].label,
    },
  };
}
