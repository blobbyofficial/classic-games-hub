import { NextResponse } from "next/server";
import { SLASH_COMMANDS } from "@/lib/discord/commands";
import { discordEnv } from "@/lib/discord/env";

/**
 * One-shot slash-command registration. Run once after deploying (and again
 * whenever the command set changes):
 *
 *   curl -X POST "https://<your-domain>/api/discord/register" \
 *        -H "Authorization: Bearer $CRON_SECRET"
 *
 * Registers to the configured guild (instant) when DISCORD_GUILD_ID is set,
 * otherwise globally (can take up to an hour to propagate).
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!discordEnv.cronSecret || auth !== `Bearer ${discordEnv.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!discordEnv.botToken || !discordEnv.appId) {
    return NextResponse.json(
      { error: "DISCORD_BOT_TOKEN / DISCORD_CLIENT_ID not configured" },
      { status: 500 },
    );
  }

  const path = discordEnv.guildId
    ? `/applications/${discordEnv.appId}/guilds/${discordEnv.guildId}/commands`
    : `/applications/${discordEnv.appId}/commands`;

  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${discordEnv.botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(SLASH_COMMANDS),
  });
  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    return NextResponse.json({ error: "discord_error", status: res.status, body }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    scope: discordEnv.guildId ? "guild" : "global",
    registered: SLASH_COMMANDS.length,
  });
}
