import { getStatusComponent } from "@/services/status";
import { statusError, statusJson } from "@/lib/status-api";

/**
 * GET /api/status/components/{slug} - one component in full.
 *
 * Current status, uptime over 24 hours / 7 / 30 / 90 days, the daily bars, the
 * last check's latency, every incident touching it in the last 90 days, and its
 * own report timeline. This is what `/status <thing>` in Discord is built on.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const component = await getStatusComponent(slug);
  if (!component) return statusError(`No component called "${slug}".`, 404);
  return statusJson(component);
}

export { corsPreflight as OPTIONS } from "@/lib/status-api";
