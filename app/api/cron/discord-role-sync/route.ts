import { NextResponse } from "next/server";
import { syncAllMembers } from "@/lib/discord/role-sync";
import { discordEnv } from "@/lib/discord/env";

/**
 * Role-sync reconcile, every two minutes. Catches everything
 * the on-change sync can't: members who joined the server after linking, roles
 * renamed or recreated, awards earned while the site was quiet, levels gained
 * from chat, and any sync that failed at the time.
 *
 * Two minutes rather than nightly because "the same roles and level as the
 * website" is only true if the gap is short enough not to notice. It costs one
 * Supabase round trip when nobody is linked - `allLinked()` returns an empty
 * list and the loop does not run - so an idle server is close to free.
 *
 * The counter channels deliberately run on a slower schedule: Discord
 * rate-limits a channel rename to roughly twice per ten minutes, so a
 * two-minute refresh would spend its whole budget being throttled.
 *
 * Vercel's Hobby plan only runs crons once a day, so this is not in vercel.json
 * at all - an external scheduler sends `Authorization: Bearer ${CRON_SECRET}`,
 * the same header Vercel's own cron would. See docs/cron-jobs.md.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!discordEnv.cronSecret || auth !== `Bearer ${discordEnv.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncAllMembers(500);
  console.log(`[discord] role sync: ${JSON.stringify(result)}`);
  return NextResponse.json({ ok: true, ...result });
}
