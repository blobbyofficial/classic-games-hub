import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import type { ReportProblem, ReportSignal } from "@/lib/status";

/**
 * Taking a "this is broken for me" report, from either the page or the API.
 *
 * Both entry points share this so the anti-abuse story is one story. The rule
 * from migration 0071 is that `status_report_submit` is service_role-only and
 * the *caller* supplies the fingerprint - which is only worth anything if the
 * fingerprint is derived from the request rather than accepted from the sender.
 * That derivation lives here, and nowhere else, so there is one place to audit.
 */

/**
 * A per-day, per-visitor hash. Never stored or logged in any other form.
 *
 * WHAT IT IS: sha256 of (address + user agent + a server secret + today's date).
 * WHAT THAT BUYS: two reports from the same browser in the same hour collide,
 * which is exactly what the rate limit needs, and nothing else.
 * WHY THE DATE IS IN IT: it makes the hash useless as a long-term identifier.
 * Yesterday's fingerprint cannot be matched against today's, so this cannot
 * quietly become a way of following someone around the site.
 * WHY THE SECRET IS IN IT: without it, anyone who guessed an address could
 * confirm the guess by hashing it themselves.
 */
export function reportFingerprint(headers: Headers): string {
  // x-forwarded-for is a client-controlled header everywhere except behind a
  // proxy that overwrites it, which is what Vercel does. x-real-ip is the
  // fallback for other hosts; "unknown" degrades to a shared bucket rather
  // than to no limit at all.
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || headers.get("x-real-ip") || "unknown";
  const agent = headers.get("user-agent") ?? "unknown";
  const secret = process.env.CRON_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? "classic-games-hub";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${address}|${agent}|${secret}|${day}`).digest("hex");
}

export interface SubmitReportInput {
  /** Component slug, or null/undefined for "the whole site". */
  slug?: string | null;
  problem: ReportProblem;
  note?: string | null;
  userId?: string | null;
  headers: Headers;
}

export interface SubmitReportResult {
  ok: boolean;
  error?: string;
  /** The machine-readable code, for the API. */
  code?: string;
  signal?: ReportSignal;
}

/** Error codes from the RPC, as sentences someone would want to read. */
const REPORT_ERRORS: Record<string, string> = {
  already_reported: "Thanks - we already have your report for this. It is counted.",
  rate_limited: "That is a lot of reports from one connection. Try again in a little while.",
  bad_problem: "Pick one of the listed problems.",
  unknown_component: "That is not something we report on.",
  bad_fingerprint: "We could not accept that report. Try again.",
  no_admin_client: "Reports are not configured on this deployment.",
};

export function reportErrorMessage(code: string | undefined): string {
  return (code && REPORT_ERRORS[code]) || "We could not record that report. Try again shortly.";
}

export async function submitReport(input: SubmitReportInput): Promise<SubmitReportResult> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, code: "no_admin_client", error: reportErrorMessage("no_admin_client") };
  }

  const { data, error } = await admin.rpc("status_report_submit", {
    p_slug: input.slug?.trim() || null,
    p_problem: input.problem,
    p_fingerprint: reportFingerprint(input.headers),
    p_note: input.note?.trim().slice(0, 200) || null,
    p_user: input.userId ?? null,
  });

  if (error) {
    console.error(`[status] report submit failed: ${error.message}`);
    return { ok: false, code: "rpc_error", error: reportErrorMessage(undefined) };
  }

  const result = data as unknown as { ok: boolean; error?: string; signal?: ReportSignal };
  if (!result?.ok) {
    return { ok: false, code: result?.error, error: reportErrorMessage(result?.error) };
  }
  return { ok: true, signal: result.signal };
}
