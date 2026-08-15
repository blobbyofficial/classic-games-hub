import { type Client, Events, type VoiceState } from "discord.js";
import { config } from "../../config.js";
import { emitLog, logEnabled } from "./dispatch.js";
import { CREATE, DELETE, INFO, channelLabel, logEmbed, userLabel } from "./format.js";

/**
 * Voice logging: joined, left, moved.
 *
 * Deliberately three events rather than one "voice state updated", because a
 * single event covering all of it would also fire every time somebody muted
 * themselves - which is the noisiest thing a Discord server produces and the
 * least worth keeping. Server-side mute and deafen *are* moderator actions, so
 * those ride along on the move/join lines where they change.
 */
async function onVoiceStateUpdate(before: VoiceState, after: VoiceState): Promise<void> {
  if (after.guild.id !== config.guildId) return;
  const user = after.member?.user ?? before.member?.user ?? null;
  const ctx = { userId: user?.id, member: after.member, isBot: user?.bot };

  if (!before.channelId && after.channelId) {
    if (!(await logEnabled("voice_join"))) return;
    await emitLog(
      after.client,
      "voice_join",
      logEmbed({
        colour: CREATE,
        title: "🔊 Joined voice",
        description: `${userLabel(user)}\n**Channel:** ${channelLabel(after.channel)}`,
        ids: { member: user?.id, channel: after.channelId },
      }),
      { ...ctx, channelId: after.channelId },
    );
    return;
  }

  if (before.channelId && !after.channelId) {
    if (!(await logEnabled("voice_leave"))) return;
    await emitLog(
      after.client,
      "voice_leave",
      logEmbed({
        colour: DELETE,
        title: "🔇 Left voice",
        description: `${userLabel(user)}\n**Channel:** ${channelLabel(before.channel)}`,
        ids: { member: user?.id, channel: before.channelId },
      }),
      { ...ctx, channelId: before.channelId },
    );
    return;
  }

  if (before.channelId && after.channelId && before.channelId !== after.channelId) {
    if (!(await logEnabled("voice_move"))) return;
    await emitLog(
      after.client,
      "voice_move",
      logEmbed({
        colour: INFO,
        title: "↔️ Moved voice channel",
        description: `${userLabel(user)}\n${channelLabel(before.channel)} → **${channelLabel(after.channel)}**`,
        ids: { member: user?.id, channel: after.channelId },
      }),
      { ...ctx, channelId: after.channelId },
    );
  }
}

export function registerVoiceLogging(client: Client): void {
  client.on(Events.VoiceStateUpdate, (before, after) =>
    void onVoiceStateUpdate(before, after).catch((err) =>
      console.error("[logging] voice handler failed:", err),
    ),
  );
}
