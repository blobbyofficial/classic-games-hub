import type { Message } from "discord.js";
import { db } from "../db.js";
import { getConfig } from "../hubConfig.js";
import { syncMemberRoles } from "./roleSync.js";

// Cheap in-process pre-filter; the REAL cooldown is enforced in Postgres
// (bot_award_discord_xp), so restarts can't double-award.
const lastSeen = new Map<string, number>();
/**
 * Drop entries that are past their cooldown.
 *
 * The map used to only ever grow: one entry per person who has ever spoken,
 * kept for the lifetime of a process that is meant to run for months. Pruning
 * on a timer costs nothing and is the difference between a bounded worker and
 * a slow leak that only shows up on the host with the smallest memory limit.
 */
setInterval(() => {
  const cutoff = Date.now() - 60 * 60_000;
  for (const [id, at] of lastSeen) if (at < cutoff) lastSeen.delete(id);
}, 10 * 60_000).unref();

/**
 * Discord chat XP - the Arcane replacement. Config lives in Supabase
 * (discord_bot_config, editable from the admin dashboard): XP range, cooldown,
 * level curve, no-XP channels, announcements, the Hub-XP trickle for linked
 * accounts, and the milestone roles handed out on level-up.
 */
export async function handleChatXp(message: Message): Promise<void> {
  if (message.author.bot || !message.inGuild()) return;
  if (message.system) return;

  const cfg = (await getConfig()).leveling;
  if (cfg.enabled === false) return;
  if ((cfg.no_xp_channel_ids ?? []).includes(message.channelId)) return;

  const now = Date.now();
  const last = lastSeen.get(message.author.id) ?? 0;
  if (now - last < (cfg.cooldown_seconds ?? 60) * 1000) return;
  lastSeen.set(message.author.id, now);

  const res = await db.awardDiscordXp(
    message.author.id,
    message.author.globalName ?? message.author.username,
  );
  if (!res?.ok || res.cooldown || !res.leveled_up) return;

  await onLevelUp(message, res.level ?? 0);
}

/** Grants the milestone role (if any) and announces the new level. */
async function onLevelUp(message: Message, level: number): Promise<void> {
  const cfg = await getConfig();

  // Sync first, so the announcement can mention the role just earned.
  let earnedRoleId: string | undefined;
  const member =
    message.member ?? (await message.guild?.members.fetch(message.author.id).catch(() => null));
  if (member) {
    const outcome = await syncMemberRoles(member);
    const milestoneIds = new Set(Object.values(cfg.level_roles.roles ?? {}));
    earnedRoleId = outcome.added.find((id) => milestoneIds.has(id));
  }

  if (cfg.leveling.announce_level_ups === false) return;

  const channel = cfg.leveling.announce_channel_id
    ? await message.client.channels.fetch(cfg.leveling.announce_channel_id).catch(() => null)
    : message.channel;
  if (!channel || !channel.isTextBased() || !("send" in channel)) return;

  const lines = [`🎉 ${message.author} reached **level ${level}**!`];
  if (earnedRoleId && cfg.level_roles.announce !== false) {
    lines.push(`🎖️ Milestone unlocked - you've earned <@&${earnedRoleId}>.`);
  }
  lines.push("Check your progress with `/level`.");

  await channel
    .send({ content: lines.join("\n"), allowedMentions: { users: [message.author.id] } })
    .catch(() => undefined);
}
