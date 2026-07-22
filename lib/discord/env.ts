/**
 * Discord integration environment. All values are server-only — none are ever
 * shipped to the browser. Every accessor degrades gracefully so the site
 * builds and runs without the bot configured.
 */

export const discordEnv = {
  /** Bot token — used for REST calls (role sync, moderation). */
  get botToken() {
    return process.env.DISCORD_BOT_TOKEN ?? "";
  },
  /** Application ID (a.k.a. client id). */
  get appId() {
    return process.env.DISCORD_CLIENT_ID ?? "";
  },
  /** Ed25519 public key from the Developer Portal, hex-encoded. */
  get publicKey() {
    return process.env.DISCORD_PUBLIC_KEY ?? "";
  },
  /** The community server the bot manages. */
  get guildId() {
    return process.env.DISCORD_GUILD_ID ?? "";
  },
  /** Shared secret protecting the cron endpoints. */
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
};

export function discordConfigured(): boolean {
  return Boolean(discordEnv.botToken && discordEnv.appId && discordEnv.guildId);
}
