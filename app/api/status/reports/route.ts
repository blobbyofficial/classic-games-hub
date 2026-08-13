import { headers } from "next/headers";
import { getReportTimeline } from "@/services/status";
import { submitReport } from "@/lib/status-report";
import { REPORT_PROBLEMS, type ReportProblem } from "@/lib/status";
import { CORS_HEADERS, statusError, statusJson } from "@/lib/status-api";

/**
 * Player reports, read and written.
 *
 *   GET  /api/status/reports?component=games&hours=24
 *   POST /api/status/reports  { "problem": "scores", "component": "games", "note": "..." }
 *
 * The POST is open to anyone, exactly like the button on the page, and is
 * limited the same way: a per-connection fingerprint the caller cannot choose,
 * a cooldown per component, and an hourly cap. All three live in the database
 * (0071) rather than here, so the limit holds however the report arrived.
 *
 * A signed-in visitor's report is *not* attributed through this route - the API
 * has no session - which is deliberate. Attribution is a nicety for the admin
 * console; being able to report a problem without one is the feature.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hours = Math.min(Math.max(Number(params.get("hours")) || 24, 1), 168);
  const slug = params.get("component");

  const timeline = await getReportTimeline(slug, hours);
  if (!timeline) return statusError("Reports are unavailable.", 503);
  if (!timeline.ok) return statusError(`No component called "${slug}".`, 404);

  return statusJson(timeline);
}

const VALID_PROBLEMS = new Set<string>(REPORT_PROBLEMS.map((p) => p.value));

export async function POST(request: Request) {
  let body: { problem?: string; component?: string | null; note?: string | null };
  try {
    body = await request.json();
  } catch {
    return statusError("Send a JSON body.", 400);
  }

  if (!body.problem || !VALID_PROBLEMS.has(body.problem)) {
    return statusError(
      `"problem" must be one of: ${[...VALID_PROBLEMS].join(", ")}.`,
      400,
    );
  }

  const result = await submitReport({
    slug: body.component ?? null,
    problem: body.problem as ReportProblem,
    note: body.note ?? null,
    userId: null,
    headers: await headers(),
  });

  if (!result.ok) {
    // 429 for the two rate-limit outcomes so a caller can back off properly,
    // 400 for anything it got wrong.
    const status = result.code === "rate_limited" || result.code === "already_reported" ? 429 : 400;
    return statusError(result.error ?? "Could not record that report.", status);
  }

  return new Response(JSON.stringify({ ok: true, signal: result.signal }), {
    status: 201,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export { corsPreflight as OPTIONS } from "@/lib/status-api";
