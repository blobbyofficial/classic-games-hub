import "server-only";
import { createHash } from "node:crypto";
import { SITE } from "@/lib/constants";
import { RELEASES, type UpdateRelease } from "@/lib/update-log";
import { botDb } from "./bot-db";
import { getBotConfig } from "./config";
import { brandEmbed } from "./embeds";
import { discordRest } from "./rest";
import type { Embed } from "./types";

/**
 * Mirroring the website into Discord: the update log, and announcements.
 *
 * One direction, deliberately. The website owns both - `lib/update-log.ts` is
 * in the repository and announcements are rows an admin publishes - so Discord
 * is a view of them, exactly as it is for roles. Reading messages back out of
 * Discord and turning them into announcements would give the same fact two
 * owners, and the first time they disagreed there would be no answer to which
 * one was right.
 *
 * What makes it a mirror rather than a series of posts is `discord_posts`
 * (migration 0068): every mirrored thing remembers the message holding it and
 * a digest of what was in it. So a second sync edits rather than duplicates, a
 * change on the website reaches Discord, unpublishing removes the message, and
 * a sync with nothing to say makes no Discord calls at all.
 */

export interface SyncReport {
  ok: boolean;
  error?: string;
  posted: string[];
  edited: string[];
  removed: string[];
  unchanged: number;
  failed: string[];
  /** Discord's own words for the first failure, which beat any guess. */
  detail?: string;
}

const empty = (): Omit<SyncReport, "ok" | "error"> => ({
  posted: [],
  edited: [],
  removed: [],
  unchanged: 0,
  failed: [],
});

/**
 * Discord's rate limit is per channel and generous, but a first sync posts two
 * dozen messages in a row. A small gap keeps a cold start well inside it
 * without turning a no-op sync into a slow one - nothing sleeps unless
 * something was actually sent.
 */
const PACE_MS = 350;
const pace = () => new Promise((r) => setTimeout(r, PACE_MS));

function digestOf(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

/** Discord refuses an embed description over 4096 characters. */
function clamp(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

// ── The update log ───────────────────────────────────────────────────

/**
 * A release as one embed.
 *
 * Groups become fields rather than one long description, because a release
 * with five groups and twenty items runs past what Discord will render and a
 * truncated changelog is worse than a summarised one. Item titles only, with
 * the full text a click away on the site - the channel is an index, not a
 * second copy of the page.
 */
function releaseEmbed(release: UpdateRelease): Embed {
  const fields = release.groups.slice(0, 25).map((group) => ({
    name: clamp(group.heading, 256),
    value: clamp(group.items.map((item) => `• ${item.dropped ? `~~${item.title}~~` : item.title}`).join("\n"), 1024),
  }));

  const parts = [release.date, release.dateNote, release.formerly && `previously ${release.formerly}`]
    .filter(Boolean)
    .join(" · ");

  return brandEmbed({
    title: `${release.version} - ${release.codename}`,
    url: `${SITE.url}/updates`,
    description: clamp(`${release.summary}\n\n_${parts}_`, 4096),
    fields,
  });
}

/**
 * Posts or updates one message per release, oldest first.
 *
 * Oldest first so the channel reads in the order things happened - Discord
 * orders by post time and nothing can reorder it afterwards, so getting this
 * backwards is not something a later sync can repair.
 */
export async function syncUpdateLog(): Promise<SyncReport> {
  const cfg = await getBotConfig("publishing");
  const report: SyncReport = { ok: true, ...empty() };

  if (!cfg.enabled) return { ...report, ok: false, error: "Publishing is switched off." };
  if (!cfg.update_channel_id) {
    return {
      ...report,
      ok: false,
      error: "No update-log channel is set. Add one under Admin → Discord bot → Publishing, or run full setup.",
    };
  }

  const known = (await botDb.posts("release")) ?? {};
  const channelId = cfg.update_channel_id;

  // RELEASES is newest first; the channel wants the opposite.
  for (const release of [...RELEASES].reverse()) {
    const embed = releaseEmbed(release);
    const digest = digestOf(embed);
    const existing = known[release.version];

    if (existing && existing.digest === digest && existing.channel_id === channelId) {
      report.unchanged += 1;
      continue;
    }

    if (existing && existing.channel_id === channelId) {
      const edited = await discordRest.editMessage(channelId, existing.message_id, { embeds: [embed] });
      await pace();
      if (edited.ok) {
        await botDb.recordPost("release", release.version, channelId, existing.message_id, digest);
        report.edited.push(release.version);
        continue;
      }
      // A message deleted by hand in Discord answers 404. Forgetting it here is
      // what lets the post below put it back, rather than failing forever
      // against a message id that will never exist again.
      if (edited.status !== 404) {
        report.failed.push(release.version);
        report.detail ??= edited.error;
        continue;
      }
      await botDb.forgetPost("release", release.version);
    }

    const posted = await discordRest.createMessage(channelId, {
      content: cfg.update_ping_role_id ? `<@&${cfg.update_ping_role_id}>` : undefined,
      embeds: [embed],
      allowed_mentions: cfg.update_ping_role_id ? { roles: [cfg.update_ping_role_id] } : { parse: [] },
    });
    await pace();
    if (!posted.ok || !posted.data) {
      report.failed.push(release.version);
      report.detail ??= posted.error;
      continue;
    }
    await botDb.recordPost("release", release.version, channelId, posted.data.id, digest);
    report.posted.push(release.version);
  }

  report.ok = report.failed.length === 0 || report.posted.length + report.edited.length > 0;
  return report;
}

// ── Announcements ────────────────────────────────────────────────────

const LEVEL_COLOURS: Record<string, number> = {
  info: 0x7a3dff,
  update: 0x22c55e,
  event: 0xf59e0b,
  alert: 0xef4444,
};

const LEVEL_EMOJI: Record<string, string> = {
  info: "📣",
  update: "🆕",
  event: "🎉",
  alert: "⚠️",
};

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  level: string;
  link_label: string | null;
  link_href: string | null;
  published_at: string;
}

function announcementEmbed(row: AnnouncementRow): Embed {
  // Only https, so a stored link can never smuggle a javascript: URL into an
  // embed that thousands of people can click.
  const href = row.link_href && /^https:\/\//.test(row.link_href) ? row.link_href : null;
  const cta = href ? `\n\n[${row.link_label || "Open"}](${href})` : "";

  return brandEmbed({
    title: clamp(`${LEVEL_EMOJI[row.level] ?? "📣"} ${row.title}`, 256),
    description: clamp(row.body + cta, 4096),
    color: LEVEL_COLOURS[row.level] ?? LEVEL_COLOURS.info,
    url: `${SITE.url}/`,
    timestamp: row.published_at,
  });
}

/**
 * Brings the announcements channel in step with what is published on the site.
 *
 * Anything published that Discord has not seen is posted; anything changed is
 * edited in place; anything Discord holds that is no longer published - edited
 * back to a draft, or deleted outright - has its message removed. That last
 * case is the reason this walks both lists rather than just posting the new
 * ones: an announcement taken down on the website has to come down here too.
 */
export async function syncAnnouncements(): Promise<SyncReport> {
  const cfg = await getBotConfig("publishing");
  const report: SyncReport = { ok: true, ...empty() };

  if (!cfg.enabled) return { ...report, ok: false, error: "Publishing is switched off." };
  if (!cfg.announce_channel_id) {
    return {
      ...report,
      ok: false,
      error: "No announcements channel is set. Add one under Admin → Discord bot → Publishing, or run full setup.",
    };
  }

  const channelId = cfg.announce_channel_id;
  const rows = (await botDb.publishedAnnouncements(cfg.announce_limit)) ?? [];
  const known = (await botDb.posts("announcement")) ?? {};
  const live = new Set(rows.map((row) => row.id));

  // Oldest first, for the same reason releases are.
  for (const row of [...rows].reverse()) {
    const embed = announcementEmbed(row);
    const digest = digestOf(embed);
    const existing = known[row.id];

    if (existing && existing.digest === digest && existing.channel_id === channelId) {
      report.unchanged += 1;
      continue;
    }

    if (existing && existing.channel_id === channelId) {
      const edited = await discordRest.editMessage(channelId, existing.message_id, { embeds: [embed] });
      await pace();
      if (edited.ok) {
        await botDb.recordPost("announcement", row.id, channelId, existing.message_id, digest);
        report.edited.push(row.title);
        continue;
      }
      if (edited.status !== 404) {
        report.failed.push(row.title);
        report.detail ??= edited.error;
        continue;
      }
      await botDb.forgetPost("announcement", row.id);
    }

    const posted = await discordRest.createMessage(channelId, {
      content: cfg.announce_ping_role_id ? `<@&${cfg.announce_ping_role_id}>` : undefined,
      embeds: [embed],
      allowed_mentions: cfg.announce_ping_role_id ? { roles: [cfg.announce_ping_role_id] } : { parse: [] },
    });
    await pace();
    if (!posted.ok || !posted.data) {
      report.failed.push(row.title);
      report.detail ??= posted.error;
      continue;
    }
    await botDb.recordPost("announcement", row.id, channelId, posted.data.id, digest);
    report.posted.push(row.title);
  }

  // Withdrawn: mirrored once, no longer published. Only inside the window we
  // just read, or unpublishing the 26th-newest announcement would look like
  // every older one had been withdrawn too.
  const withdrawn = Object.entries(known).filter(([id]) => !live.has(id));
  const oldest = rows.length ? Date.parse(rows[rows.length - 1].published_at) : 0;
  for (const [id, post] of withdrawn) {
    if (rows.length >= cfg.announce_limit && oldest > 0) {
      // A full window means older entries may simply have scrolled out of it
      // rather than been withdrawn; leave them alone.
      continue;
    }
    const deleted = await discordRest.deleteMessage(post.channel_id, post.message_id, "Announcement withdrawn");
    await pace();
    // 404 means it is already gone, which is the state we wanted anyway.
    if (deleted.ok || deleted.status === 404) {
      await botDb.forgetPost("announcement", id);
      report.removed.push(id);
    } else {
      report.failed.push(id);
      report.detail ??= deleted.error;
    }
  }

  report.ok = report.failed.length === 0 || report.posted.length + report.edited.length + report.removed.length > 0;
  return report;
}

/** One line an admin can read, for the dashboard and the cron response. */
export function summariseSync(report: SyncReport): string {
  const bits = [
    report.posted.length ? `posted ${report.posted.length}` : "",
    report.edited.length ? `updated ${report.edited.length}` : "",
    report.removed.length ? `removed ${report.removed.length}` : "",
    report.unchanged ? `${report.unchanged} already in step` : "",
    report.failed.length ? `failed ${report.failed.length}` : "",
  ].filter(Boolean);
  const detail = report.detail ? ` Discord said: ${report.detail}` : "";
  return `${bits.join(", ") || "nothing to do"}.${detail}`;
}
