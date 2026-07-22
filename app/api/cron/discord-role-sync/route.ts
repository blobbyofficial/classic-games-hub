import { NextResponse } from "next/server";
import { syncAllMembers } from "@/lib/discord/role-sync";
import { discordEnv } from "@/lib/discord/env";

/**
 * Nightly role-sync reconcile (vercel.json cron). Catches everything webhooks
 * can't: members who joined the server after linking, roles renamed/recreated,
 * awards earned while the site was quiet, and any missed on-change sync.
 *
 * Vercel calls cron routes with `Authorization: Bearer ${CRON_SECRET}`.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!discordEnv.cronSecret || auth !== `Bearer ${discordEnv.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncAllMembers(500);
  console.log(`[discord] nightly role sync: ${JSON.stringify(result)}`);
  return NextResponse.json({ ok: true, ...result });
}
