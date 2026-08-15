import type { Client, EmbedBuilder, GuildMember, PartialGuildMember } from "discord.js";
import { EVENT_CATEGORY, getConfig, type LogEvent, type LoggingConfig } from "../../hubConfig.js";

/**
 * Where a log embed goes, and how fast it gets there.
 *
 * Everything is queued rather than sent inline for one reason: a raid, a purge
 * or a mass role change produces hundreds of events in a second, and a bot
 * that answers each with its own POST is rate-limited into uselessness exactly
 * when the log matters most. Embeds are batched ten to a message (Discord's
 * per-message limit) and flushed on a fixed tick, so a burst costs a handful
 * of requests instead of hundreds - and they still arrive in order, because
 * each channel's queue is drained in sequence.
 */

const FLUSH_MS = 1500;
const MAX_EMBEDS_PER_MESSAGE = 10;
/**
 * A hard ceiling per channel. If something is generating events faster than
 * Discord will accept them, the queue is the thing that must give way - an
 * unbounded one turns a noisy hour into an out-of-memory crash, which loses
 * every other feature the worker runs.
 */
const MAX_QUEUED = 400;

const queues = new Map<string, EmbedBuilder[]>();
let timer: NodeJS.Timeout | null = null;
let overflowed = 0;

export interface LogFilterContext {
  /** Channel the thing happened in, for `ignored_channel_ids`. */
  channelId?: string | null;
  /** Who did it (or who it happened to), for `ignored_user_ids`. */
  userId?: string | null;
  member?: GuildMember | PartialGuildMember | null;
  isBot?: boolean;
}

/** The channel an event's embed belongs in, honouring the category override. */
function channelFor(cfg: LoggingConfig, event: LogEvent): string | null {
  const category = EVENT_CATEGORY[event];
  return cfg.channels?.[category] || cfg.channel_id || null;
}

function ignored(cfg: LoggingConfig, ctx: LogFilterContext): boolean {
  if (ctx.isBot && cfg.ignore_bots) return true;
  if (ctx.channelId && (cfg.ignored_channel_ids ?? []).includes(ctx.channelId)) return true;
  if (ctx.userId && (cfg.ignored_user_ids ?? []).includes(ctx.userId)) return true;
  const roles = cfg.ignored_role_ids ?? [];
  if (roles.length && ctx.member?.roles?.cache?.some?.((r) => roles.includes(r.id))) return true;
  return false;
}

/**
 * Queue one embed, if this event is switched on and nothing filters it out.
 *
 * Building the embed is the caller's job and happens first, which is a little
 * wasteful for a disabled event - but the alternative is threading the config
 * through every listener, and the embed builders are pure string work.
 */
export async function emitLog(
  client: Client,
  event: LogEvent,
  embed: EmbedBuilder,
  ctx: LogFilterContext = {},
): Promise<void> {
  const cfg = (await getConfig()).logging;
  if (!cfg.enabled) return;
  if (cfg.events?.[event] === false) return;
  if (ignored(cfg, ctx)) return;

  const channelId = channelFor(cfg, event);
  if (!channelId) return;
  // Logging the log channel is a feedback loop, and the one thing that will
  // always be ignorable.
  if (ctx.channelId && ctx.channelId === channelId) return;

  const queue = queues.get(channelId) ?? [];
  if (queue.length >= MAX_QUEUED) {
    overflowed++;
    return;
  }
  queue.push(embed);
  queues.set(channelId, queue);
  start(client);
}

/** Whether an event would be logged at all - lets callers skip expensive work. */
export async function logEnabled(event: LogEvent): Promise<boolean> {
  const cfg = (await getConfig()).logging;
  return Boolean(cfg.enabled && cfg.events?.[event] !== false && channelFor(cfg, event));
}

function start(client: Client): void {
  if (timer) return;
  timer = setInterval(() => void flush(client), FLUSH_MS);
  // Never hold the process open on account of the log queue.
  timer.unref?.();
}

async function flush(client: Client): Promise<void> {
  if (queues.size === 0) {
    if (timer) clearInterval(timer);
    timer = null;
    return;
  }

  for (const [channelId, queue] of [...queues]) {
    const batch = queue.splice(0, MAX_EMBEDS_PER_MESSAGE);
    if (queue.length === 0) queues.delete(channelId);
    if (batch.length === 0) continue;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel)) {
      // A log channel that has been deleted would otherwise re-queue forever.
      queues.delete(channelId);
      continue;
    }
    await channel.send({ embeds: batch, allowedMentions: { parse: [] } }).catch((err) => {
      console.warn(`[logging] couldn't post to ${channelId}:`, err instanceof Error ? err.message : err);
    });
  }

  if (overflowed > 0) {
    console.warn(`[logging] dropped ${overflowed} entries - the queue was full.`);
    overflowed = 0;
  }
}
