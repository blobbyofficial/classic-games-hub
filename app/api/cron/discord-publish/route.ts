import { NextResponse } from "next/server";
import { discordEnv } from "@/lib/discord/env";
import { summariseSync, syncAnnouncements, syncUpdateLog } from "@/lib/discord/publish";

/**
 * Keeps the Discord mirror of the update log and the announcements in step.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/discord-publish
 *
 * Publishing an announcement already mirrors it immediately, so this is not
 * how a mirror is meant to be timely - it is how it recovers. A deploy adds
 * releases with nobody pressing anything, a Discord outage drops a post, and
 * somebody eventually deletes a message by hand; all three are invisible until
 * something re-checks. Every release and announcement carries a digest, so a
 * run with nothing to do costs two database reads and makes no Discord calls
 * at all.
 *
 * It is one of the two jobs in vercel.json, which on the Hobby plan means daily
 * (docs/cron-jobs.md). Recovery is exactly the shape of job a daily sweep still
 * serves, and of the five it is the one where no schedule at all breaks
 * something quietly: a deploy adds releases with nobody pressing anything.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const auth = request.headers.get("authorization");
  if (!discordEnv.cronSecret || auth !== `Bearer ${discordEnv.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Sequential, not parallel: both write to the same channel-rate-limit bucket
  // per guild, and a first sync posting two dozen releases at once is exactly
  // when that matters.
  const releases = await syncUpdateLog();
  const announcements = await syncAnnouncements();

  return NextResponse.json({
    releases: releases.ok ? summariseSync(releases) : (releases.error ?? "failed"),
    announcements: announcements.ok ? summariseSync(announcements) : (announcements.error ?? "failed"),
  });
}

export const GET = run;
export const POST = run;
