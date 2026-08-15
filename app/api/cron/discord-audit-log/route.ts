import { NextResponse } from "next/server";
import { discordEnv } from "@/lib/discord/env";
import { pollAuditLog } from "@/lib/discord/audit-log";

/**
 * Server logging on free infrastructure - the gateway worker's stand-in.
 *
 * Point any scheduler at this every ~5 minutes and structural changes in the
 * Discord server get written to the log channels without a hosted process:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/discord-audit-log
 *
 * Vercel's Hobby plan only runs crons daily, so this is deliberately not in
 * vercel.json. Use the same free scheduler that already drives the status
 * probe (docs/cron-jobs.md).
 *
 * `after` is a cursor and Discord reverses its ordering when you pass one -
 * you get the *oldest* entries newer than the cursor - so nothing is ever
 * skipped however long the gap. What a too-long interval costs is lag: each
 * run advances at most one 100-entry page, so on a server busier than that
 * the log falls behind and never catches up. Polling more often costs one
 * request that finds nothing. Five minutes is the balance, and it matches the
 * probe's cadence.
 *
 * Run this *instead of* the worker, not alongside it: both write the same
 * entries to the same channels, so running both duplicates every structural
 * line. See docs/discord-bot.md → "Two ways to run the logs".
 */

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const auth = request.headers.get("authorization");
  if (!discordEnv.cronSecret || auth !== `Bearer ${discordEnv.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await pollAuditLog();
  // A missing permission is the one failure worth an HTTP status of its own:
  // it will not fix itself, and a scheduler's failure count is where somebody
  // will actually notice it.
  const status = result.ok ? 200 : result.error === "missing_view_audit_log" ? 403 : 500;
  return NextResponse.json(result, { status });
}

export const GET = run;
export const POST = run;
