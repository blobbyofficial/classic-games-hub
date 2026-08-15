import { type Client, Events, GatewayIntentBits, PermissionsBitField } from "discord.js";
import { config } from "../../config.js";
import { getConfig } from "../../hubConfig.js";
import { rememberAuditEntry } from "./audit.js";
import { registerMemberLogging } from "./members.js";
import { registerMessageLogging } from "./messages.js";
import { registerServerLogging } from "./server.js";
import { registerVoiceLogging } from "./voice.js";

/**
 * Server audit logging - what Sapphire's logs did, on our own infrastructure.
 *
 * Every structural change in the server gets an embed: messages deleted and
 * edited, channels created, renamed, moved and deleted, roles created,
 * recoloured and re-permissioned, members joining, leaving, being kicked,
 * banned, timed out, renamed or given roles, emoji, stickers, invites,
 * webhooks, voice movement and the server's own settings.
 *
 * Three things make it usable rather than merely complete:
 *
 *   * **Who.** Gateway events carry no actor, so each one is matched against
 *     the Discord audit log (`audit.ts`) to name the person responsible.
 *   * **What exactly.** Updates are diffed to the property, so a role change
 *     reads "Colour #5865f2 → #ff0000" and not "role updated".
 *   * **Without drowning.** Five routable categories, per-event switches,
 *     ignore lists for channels/roles/users, and a batching queue so a raid
 *     costs a handful of requests rather than hundreds.
 *
 * This must run in the gateway worker: none of these events reach an HTTP
 * interactions endpoint, which only ever hears about things aimed *at* the bot.
 */

/** Intents the log needs on top of what the rest of the worker uses. */
export const LOGGING_INTENTS = [
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildExpressions,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildWebhooks,
] as const;

/** Permissions without which parts of the log quietly degrade. */
const NEEDED = [
  { bit: PermissionsBitField.Flags.ViewAuditLog, why: "name who did each thing" },
  { bit: PermissionsBitField.Flags.SendMessages, why: "post log entries" },
  { bit: PermissionsBitField.Flags.EmbedLinks, why: "post log entries as embeds" },
] as const;

export function startAuditLogging(client: Client): void {
  registerMessageLogging(client);
  registerMemberLogging(client);
  registerServerLogging(client);
  registerVoiceLogging(client);

  // The real-time feed of audit entries, buffered for attribution. Cheap to
  // keep running even when logging is off - it is a bounded in-memory ring.
  client.on(Events.GuildAuditLogEntryCreate, (entry, guild) => {
    if (guild.id !== config.guildId) return;
    rememberAuditEntry(entry);
  });

  // On ready, not now: `startAuditLogging` runs before login, so the guild
  // cache this check reads is still empty at call time and the warning it
  // exists to print would never print.
  client.once(Events.ClientReady, (ready) => void announceReadiness(ready));
}

/**
 * Says once, at startup, whether the log will actually work.
 *
 * A logging feature that is on but silent is the worst failure mode there is -
 * you only find out when you go looking for an entry that was never written -
 * so the missing permission is reported at boot rather than discovered later.
 */
async function announceReadiness(client: Client): Promise<void> {
  const cfg = (await getConfig()).logging;
  if (!cfg.enabled) return;

  const routes = [cfg.channel_id, ...Object.values(cfg.channels ?? {})].filter(Boolean);
  if (routes.length === 0) {
    console.warn("[logging] enabled, but no log channel is set - nothing will be posted.");
    return;
  }

  const guild = client.guilds.cache.get(config.guildId);
  const me = guild?.members.me;
  if (!me) return;
  const missing = NEEDED.filter((n) => !me.permissions.has(n.bit));
  if (missing.length) {
    console.warn(
      `[logging] missing permissions - I can't ${missing.map((m) => m.why).join(", ")}. Grant them to my role.`,
    );
  } else {
    console.log(`📝 Audit logging active across ${new Set(routes).size} channel(s).`);
  }
}
