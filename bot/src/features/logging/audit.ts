import type { AuditLogEvent, Guild, GuildAuditLogsEntry, PartialUser, User } from "discord.js";

/**
 * Who did it.
 *
 * Gateway events say *what* changed and almost never say *who* changed it: a
 * deleted message, a recoloured role and a moved channel all arrive with no
 * actor attached. The only place Discord records that is the audit log, which
 * is why every logging bot that can name a moderator reads it.
 *
 * Two sources, because neither is sufficient alone:
 *
 *   * `GuildAuditLogEntryCreate` delivers entries as they happen, but in no
 *     guaranteed order relative to the event it explains - so entries are
 *     buffered for a few seconds and matched after the fact.
 *   * `fetchAuditLogs` is the fallback for anything the gateway didn't deliver
 *     (it is not a guaranteed-delivery event) or that landed in the moment
 *     before a listener attached.
 *
 * Both need **View Audit Log**. Without it every lookup answers "unknown",
 * which is honest, cheap and still leaves the log worth reading - so a missing
 * permission is reported once and then stops costing an API call per event.
 */

/** How long an audit entry is considered to explain an event. */
const WINDOW_MS = 15_000;
const BUFFER_LIMIT = 120;
/** Long enough for the entry to arrive, short enough to feel immediate. */
const SETTLE_MS = 400;

interface Buffered {
  at: number;
  entry: GuildAuditLogsEntry;
}

const buffered: Buffered[] = [];
/** Entry ids already blamed for an event, so two events never share an actor. */
const claimed = new Map<string, number>();
/**
 * Discord folds repeated deletes by one person in one channel into a single
 * entry whose `count` rises, so such an entry stays "fresh" only while that
 * number is still going up.
 */
const counts = new Map<string, number>();

let auditLogUnavailable = false;

/**
 * Discord can hand back a partial user for an executor it hasn't cached, and
 * every field the log renders (`tag`, the avatar) copes with that - so the
 * partial is carried rather than discarded, because a name it half-knows still
 * beats "unknown".
 */
export type ActorUser = User | PartialUser;

export interface Actor {
  user: ActorUser | null;
  /** The X-Audit-Log-Reason the action carried, when it carried one. */
  reason: string | null;
}

/**
 * The id of whatever an entry acted on.
 *
 * `entry.target` is a union of every object type Discord logs, and a couple of
 * them (invites, most obviously) have no `id` at all - so reading it needs one
 * guarded helper rather than a cast at each of two dozen call sites.
 */
export function auditTargetId(entry: GuildAuditLogsEntry): string | null {
  const target = entry.target as { id?: string } | null | undefined;
  return target?.id ?? entry.targetId ?? null;
}

const UNKNOWN: Actor = { user: null, reason: null };

/** Feed from `Events.GuildAuditLogEntryCreate`. */
export function rememberAuditEntry(entry: GuildAuditLogsEntry): void {
  buffered.push({ at: Date.now(), entry });
  if (buffered.length > BUFFER_LIMIT) buffered.splice(0, buffered.length - BUFFER_LIMIT);
}

function prune(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (buffered.length && buffered[0].at < cutoff) buffered.shift();
  for (const [id, at] of claimed) if (at < cutoff) claimed.delete(id);
  if (counts.size > BUFFER_LIMIT) counts.clear();
}

/**
 * True when this entry is a *new* explanation rather than one already used.
 *
 * Aggregated entries (message deletes) are re-usable while their count keeps
 * rising; everything else is one entry, one event.
 */
function take(entry: GuildAuditLogsEntry, aggregated: boolean): boolean {
  if (aggregated) {
    const seen = counts.get(entry.id) ?? 0;
    const now = Number((entry.extra as { count?: number } | undefined)?.count ?? seen + 1);
    if (now <= seen) return false;
    counts.set(entry.id, now);
    return true;
  }
  if (claimed.has(entry.id)) return false;
  claimed.set(entry.id, Date.now());
  return true;
}

function fresh(entry: GuildAuditLogsEntry): boolean {
  return Date.now() - entry.createdTimestamp < WINDOW_MS;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The actor behind an event, or `{ user: null }` when Discord doesn't say.
 *
 * `matches` narrows to the entry describing *this* change - usually by target
 * id, sometimes (message deletes) by the channel in `extra`.
 */
export async function whoDid(
  guild: Guild,
  type: AuditLogEvent,
  matches: (entry: GuildAuditLogsEntry) => boolean,
  options: { aggregated?: boolean; settleMs?: number } = {},
): Promise<Actor> {
  const aggregated = options.aggregated ?? false;
  await sleep(options.settleMs ?? SETTLE_MS);
  prune();

  const buffedHit = buffered
    .map((b) => b.entry)
    .reverse()
    .find((e) => e.action === type && fresh(e) && matches(e) && take(e, aggregated));
  if (buffedHit) return { user: buffedHit.executor ?? null, reason: buffedHit.reason ?? null };

  if (auditLogUnavailable) return UNKNOWN;

  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const hit = logs.entries.find(
      (e) => fresh(e as GuildAuditLogsEntry) && matches(e as GuildAuditLogsEntry) && take(e as GuildAuditLogsEntry, aggregated),
    );
    return hit ? { user: hit.executor ?? null, reason: hit.reason ?? null } : UNKNOWN;
  } catch (err) {
    // 50013 is the only interesting failure here, and it will not fix itself:
    // stop asking rather than paying a rejected request per logged event.
    auditLogUnavailable = true;
    console.warn(
      "[logging] can't read the audit log, so log entries won't name who did it. Grant me **View Audit Log**.",
      err instanceof Error ? err.message : err,
    );
    return UNKNOWN;
  }
}
