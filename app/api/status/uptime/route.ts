import { createClient } from "@/lib/supabase/server";
import { getUptimeMatrix } from "@/services/status";
import { statusError, statusJson } from "@/lib/status-api";

/**
 * GET /api/status/uptime - the numbers behind the bars.
 *
 *   ?component=games     one component, day by day
 *   (no component)       every component, as the compact matrix the page uses
 *   ?days=30             1-365, default 90
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const days = Math.min(Math.max(Number(params.get("days")) || 90, 1), 365);
  const slug = params.get("component");

  if (!slug) {
    const matrix = await getUptimeMatrix(days);
    if (!matrix) return statusError("Status is unavailable.", 503);
    return statusJson({ ok: true, ...matrix }, { seconds: 300 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("status_uptime", { p_slug: slug, p_days: days });
  if (error) return statusError("Status is unavailable.", 503);

  const result = data as unknown as { ok: boolean; error?: string };
  if (!result?.ok) return statusError(`No component called "${slug}".`, 404);

  // Uptime only changes as days roll over, so it is cached far longer than the
  // live board - five minutes rather than thirty seconds.
  return statusJson(result, { seconds: 300 });
}

export { corsPreflight as OPTIONS } from "@/lib/status-api";
