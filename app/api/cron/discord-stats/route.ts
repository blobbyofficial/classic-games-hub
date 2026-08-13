import { NextResponse } from "next/server";
import { discordEnv } from "@/lib/discord/env";
import { refreshStatChannels } from "@/lib/discord/setup";

/**
 * Live counter refresh - renames the configured voice channels to the current
 * numbers (online players on the website, total players, plays today, Discord
 * members). This is the ServerStats replacement, and it needs no hosted
 * process: point *any* scheduler at it every ~10 minutes.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/discord-stats
 *
 * Vercel's Hobby plan only runs crons daily, so this is not in vercel.json; use
 * Supabase pg_cron + pg_net, cron-job.org, or the companion worker in bot/
 * (which refreshes on the same schedule while it's running). Discord
 * rate-limits channel renames to ~2 per 10 minutes per channel, so don't go
 * faster than that. See docs/cron-jobs.md.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const auth = request.headers.get("authorization");
  if (!discordEnv.cronSecret || auth !== `Bearer ${discordEnv.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await refreshStatChannels();
  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;
