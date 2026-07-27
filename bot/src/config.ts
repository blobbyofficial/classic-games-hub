import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

export const config = {
  discordToken: required("DISCORD_TOKEN"),
  guildId: required("DISCORD_GUILD_ID"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
  siteUrl: process.env.SITE_URL ?? "https://classic-games-hub.blobbyofficial.com",
  liveScoresChannelId: process.env.LIVE_SCORES_CHANNEL_ID ?? "",
  /** Health/keep-alive server port. Hosts like Render/Koyeb set $PORT. */
  port: Number(process.env.PORT ?? 8080),
  /** This worker's own public URL — enables the anti-idle self-ping. */
  selfUrl: process.env.SELF_URL ?? "",
  /** Rich presence shown next to the bot's name in the member list. */
  presence: {
    text: process.env.PRESENCE_TEXT ?? "classic-games-hub.blobbyofficial.com",
    /** playing | watching | listening | competing */
    type: (process.env.PRESENCE_TYPE ?? "playing").toLowerCase(),
    status: (process.env.PRESENCE_STATUS ?? "online").toLowerCase(),
  },
  /** Legacy env-configured stat channels (the DB config wins when set). */
  stats: {
    members: process.env.STATS_MEMBERS_CHANNEL_ID ?? "",
    online: process.env.STATS_ONLINE_CHANNEL_ID ?? "",
    plays: process.env.STATS_PLAYS_CHANNEL_ID ?? "",
  },
} as const;

export const BRAND_COLOR = 0x7a3dff;
