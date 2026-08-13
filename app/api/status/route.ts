import { getStatusSummary } from "@/services/status";
import { INDICATOR } from "@/lib/status";
import { statusError, statusJson, toStatuspage } from "@/lib/status-api";
import { BUILD, EXPECTED_SCHEMA, SITE_VERSION, shortCommit } from "@/lib/version";

/**
 * GET /api/status - the whole status document.
 *
 * The one endpoint most callers need: overall indicator, every component with
 * its uptime, open incidents with their timelines, upcoming maintenance, the
 * player-report signal and the running versions.
 *
 *   /api/status                     the native document
 *   /api/status?format=statuspage   Statuspage's summary.json shape
 *
 * Public, CORS-open, no key. See lib/status-api.ts for the caching rules.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const summary = await getStatusSummary();
  if (!summary) {
    // A 503 rather than a 500: the endpoint is fine, the thing it reports on is
    // not, and a monitoring tool should read that as "the site is down" rather
    // than "the status API is broken".
    return statusError("Status is unavailable - the database could not be reached.", 503);
  }

  const format = new URL(request.url).searchParams.get("format");
  if (format === "statuspage") return statusJson(toStatuspage(summary));

  return statusJson({
    ok: true,
    generated_at: summary.generated_at,
    status: {
      indicator: summary.status.indicator,
      description: INDICATOR[summary.status.indicator].label,
    },
    components: summary.components,
    incidents: summary.incidents,
    maintenance: summary.maintenance,
    reports: summary.reports,
    versions: {
      site: SITE_VERSION,
      commit: shortCommit(BUILD.commit),
      environment: BUILD.environment,
      schema: summary.schema_version,
      schema_expected: EXPECTED_SCHEMA,
      bot: summary.bot,
    },
  });
}

export { corsPreflight as OPTIONS } from "@/lib/status-api";
