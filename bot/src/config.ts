import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

function parseRoleMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    console.warn("ROLE_MAP is not valid JSON — role sync disabled.");
    return {};
  }
}

export const config = {
  discordToken: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
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
  roleMap: parseRoleMap(process.env.ROLE_MAP),
} as const;

export const BRAND_COLOR = 0x7a3dff;
