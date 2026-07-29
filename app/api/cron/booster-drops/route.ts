import { NextResponse } from "next/server";
import { discordEnv } from "@/lib/discord/env";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Grants the current month's booster cosmetic to everyone boosting right now.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/booster-drops
 *
 * Runs daily rather than monthly on purpose. A once-a-month job gets exactly
 * one chance to fire, and if it fails a whole month of boosters silently lose
 * their drop; a daily run has thirty chances and the grant is idempotent, so
 * the repeats cost nothing. It also means someone who starts boosting on the
 * 28th still receives that month's item.
 *
 * Ordered after the role sync in vercel.json, because that job is what
 * refreshes profiles.booster_since from Discord - running this first would
 * hand out drops based on yesterday's boost list.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const auth = request.headers.get("authorization");
  if (!discordEnv.cronSecret || auth !== `Bearer ${discordEnv.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "service key not configured" }, { status: 500 });
  }

  const { data, error } = await supabase.rpc("grant_booster_drops");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export const GET = run;
export const POST = run;
