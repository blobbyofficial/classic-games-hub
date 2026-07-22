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
  stats: {
    members: process.env.STATS_MEMBERS_CHANNEL_ID ?? "",
    online: process.env.STATS_ONLINE_CHANNEL_ID ?? "",
    plays: process.env.STATS_PLAYS_CHANNEL_ID ?? "",
  },
} as const;

export const BRAND_COLOR = 0x7a3dff;
