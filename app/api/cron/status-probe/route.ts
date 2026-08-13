import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { discordEnv } from "@/lib/discord/env";
import { siteUrl } from "@/lib/version";

/**
 * The probe behind /status - runs the checks, records them, and lets the
 * results move the board.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/status-probe
 *
 * Every five minutes is the intended cadence, because that is what
 * `status_record_checks` assumes when it counts a failed check as five minutes
 * of downtime, and what makes "two consecutive failures" mean "this has
 * survived five minutes" rather than "this blipped twice in ten seconds".
 *
 * That cadence is deliberately *not* in vercel.json. Vercel's Hobby plan caps
 * crons at once a day, and a daily probe would not merely be coarse - it would
 * report each failure as five minutes of downtime once a day and make the
 * uptime percentages wrong. An external scheduler drives it; docs/cron-jobs.md.
 *
 * Four probes cover ten components:
 *
 *   - one HTTP fetch of the site's own front page      → website
 *   - one fetch of Supabase's auth health endpoint     → accounts
 *   - one fetch of Discord's gateway endpoint          → discord-api
 *   - one `status_selfcheck()` round trip              → six DB-backed areas
 *
 * plus the Discord worker's heartbeat, which is already in the database and
 * costs nothing to read. Everything is then written in a single
 * `status_record_checks` call, so the probe is four network round trips
 * regardless of how many components the page grows to.
 *
 * WHY THE SITE PROBE IS NOT A SELF-FETCH OF THIS ROUTE: it fetches `/`, which
 * exercises rendering, the CDN and the edge on the way through. A route that
 * declared itself up because it was running would be true and useless.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

interface ProbeResult {
  slug: string;
  ok: boolean;
  latency_ms?: number;
  detail?: string;
  // The batch is handed to a jsonb parameter, which is typed as `Json` - an
  // index signature is what makes this object assignable to it.
  [key: string]: string | number | boolean | undefined;
}

/** A fetch that always resolves, with its own timeout and a measured latency. */
async function timedFetch(
  slug: string,
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<ProbeResult> {
  const { timeoutMs = 10_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": "classic-games-hub-status-probe", ...(rest.headers ?? {}) },
    });
    return {
      slug,
      ok: res.ok,
      latency_ms: Date.now() - started,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      slug,
      ok: false,
      latency_ms: Date.now() - started,
      detail: err instanceof Error ? (err.name === "AbortError" ? "timeout" : err.message) : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function run(request: Request) {
  const auth = request.headers.get("authorization");
  if (!discordEnv.cronSecret || auth !== `Bearer ${discordEnv.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "no_secret_key" }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const started = Date.now();

  // All four in parallel - they are independent, and a slow one should not
  // inflate the measured latency of the others.
  const [website, accounts, discordApi, selfcheck] = await Promise.all([
    timedFetch("website", siteUrl(), { method: "GET", redirect: "manual" }),
    supabaseUrl
      ? timedFetch("accounts", `${supabaseUrl}/auth/v1/health`, {
          headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
        })
      : Promise.resolve<ProbeResult>({ slug: "accounts", ok: false, detail: "no_supabase_url" }),
    timedFetch("discord-api", "https://discord.com/api/v10/gateway"),
    (async () => {
      const at = Date.now();
      const { data, error } = await admin.rpc("status_selfcheck");
      return { data, error, latency: Date.now() - at };
    })(),
  ]);

  const results: ProbeResult[] = [website, accounts, discordApi];

  // status_selfcheck() times one representative read per DB-backed area. If the
  // call itself failed, every one of those areas is down by definition and the
  // database is reported down with them.
  const AREAS = ["games", "leaderboards", "parties", "social", "economy", "database"] as const;
  if (selfcheck.error || !selfcheck.data) {
    for (const slug of AREAS) {
      results.push({
        slug,
        ok: false,
        latency_ms: selfcheck.latency,
        detail: selfcheck.error?.message ?? "selfcheck failed",
      });
    }
  } else {
    const doc = selfcheck.data as unknown as {
      results?: Record<string, { ok: boolean; latency_ms: number | null }>;
    };
    for (const slug of AREAS) {
      const area = doc.results?.[slug];
      results.push({
        slug,
        ok: area?.ok ?? false,
        // The database's own component is charged the whole round trip, not
        // just its query - the network hop is exactly what it is measuring.
        latency_ms: slug === "database" ? selfcheck.latency : (area?.latency_ms ?? 0),
        detail: area ? undefined : "not reported",
      });
    }
    // The worker's heartbeat freshness comes back with the self-check rather
    // than as a query of its own.
    const worker = doc.results?.discord_worker;
    results.push({
      slug: "discord-bot",
      ok: worker?.ok ?? false,
      detail: worker?.ok ? undefined : "no recent heartbeat",
    });
  }

  const { data: recorded, error } = await admin.rpc("status_record_checks", { p_results: results });
  if (error) {
    console.error(`[status] record failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Housekeeping once an hour rather than on its own schedule - one fewer cron
  // entry, and the work is trivial.
  let pruned: unknown = null;
  if (new Date().getMinutes() < 5) {
    const { data } = await admin.rpc("status_prune");
    pruned = data;
  }

  return NextResponse.json({
    ok: true,
    took_ms: Date.now() - started,
    checked: results.length,
    down: results.filter((r) => !r.ok).map((r) => r.slug),
    changed: (recorded as { changed?: unknown[] } | null)?.changed ?? [],
    pruned,
  });
}

export const GET = run;
export const POST = run;
