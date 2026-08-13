import { getStatusSummary } from "@/services/status";
import { statusError, statusJson } from "@/lib/status-api";

/**
 * GET /api/status/components - just the board.
 *
 * Everything here is in /api/status too; this exists because "is anything
 * broken" is by far the most common question asked of a status API, and a
 * caller answering it should not have to download incident timelines to do it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getStatusSummary();
  if (!summary) return statusError("Status is unavailable.", 503);

  return statusJson({
    ok: true,
    generated_at: summary.generated_at,
    indicator: summary.status.indicator,
    components: summary.components,
  });
}

export { corsPreflight as OPTIONS } from "@/lib/status-api";
