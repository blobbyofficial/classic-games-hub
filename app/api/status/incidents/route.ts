import { getIncidentHistory, getStatusSummary } from "@/services/status";
import { statusError, statusJson } from "@/lib/status-api";

/**
 * GET /api/status/incidents - incident history, newest first.
 *
 *   ?active=1            only what is currently open
 *   ?kind=maintenance    only maintenance windows
 *   ?limit=50            up to 100
 *   ?before=<iso>        page backwards
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kindParam = params.get("kind");
  const kind = kindParam === "incident" || kindParam === "maintenance" ? kindParam : undefined;

  if (params.get("active") === "1") {
    const summary = await getStatusSummary();
    if (!summary) return statusError("Status is unavailable.", 503);
    const incidents =
      kind === "maintenance"
        ? summary.maintenance
        : kind === "incident"
          ? summary.incidents
          : [...summary.incidents, ...summary.maintenance];
    return statusJson({ ok: true, active: true, incidents });
  }

  const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 100);
  const before = params.get("before") ?? undefined;
  const incidents = await getIncidentHistory(limit, before, kind);
  if (!incidents) return statusError("Status is unavailable.", 503);

  return statusJson({
    ok: true,
    active: false,
    incidents,
    // Handing back the cursor saves every caller writing the same date maths.
    next_before: incidents.length === limit ? incidents[incidents.length - 1]?.started_at : null,
  });
}

export { corsPreflight as OPTIONS } from "@/lib/status-api";
