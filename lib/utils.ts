import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with thousands separators (e.g. 12,345). */
export function formatNumber(n: number | bigint | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(n);
}

/** Compact number formatting (e.g. 12.3k, 1.2M). */
export function compactNumber(n: number | null | undefined): string {
  if (!n) return "0";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Relative time like "3m ago", "2h ago", "yesterday". */
export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let duration = seconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const [amount, u] of divisions) {
    if (Math.abs(duration) < amount) {
      unit = u;
      break;
    }
    duration /= amount;
  }
  return rtf.format(-Math.round(duration), unit);
}

/** XP required to reach a given level: 100 * (level-1)^2 (mirrors the DB curve). */
export function xpForLevel(level: number): number {
  return 100 * (level - 1) ** 2;
}

/** Progress toward the next level, given total XP. */
export function levelProgress(xp: number, level: number) {
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - current;
  const into = xp - current;
  return {
    current: into,
    needed: span,
    percent: span > 0 ? Math.min(100, Math.max(0, (into / span) * 100)) : 0,
    nextLevelXp: next,
  };
}

/** Deterministic HSL color derived from a string (for avatar fallbacks). */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 65%, 55%)`;
}

/** First two initials from a name/username. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** True when a last_seen timestamp counts as "online" (< 2 min). */
export function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
}

export type DisplayPresence = "online" | "away" | "dnd" | "sleep" | "offline";

export const PRESENCE_META: Record<DisplayPresence, { label: string; className: string }> = {
  online: { label: "Online", className: "bg-success" },
  away: { label: "Away", className: "bg-amber-400" },
  dnd: { label: "Do not disturb", className: "bg-red-500" },
  sleep: { label: "Sleeping", className: "bg-indigo-400" },
  offline: { label: "Offline", className: "bg-muted-foreground/50" },
};

/**
 * Resolve a user's displayed presence from their manual status and last-seen
 * time, honouring the master toggle and the viewer's visibility. `visible`
 * false (hidden by the target's settings) always renders as offline.
 */
export function resolvePresence(opts: {
  lastSeen?: string | null;
  status?: string | null;
  visible?: boolean;
}): DisplayPresence {
  if (opts.visible === false) return "offline";
  switch (opts.status) {
    case "invisible":
      return "offline";
    case "online":
      return "online";
    case "away":
      return "away";
    case "dnd":
      return "dnd";
    case "sleep":
      return "sleep";
    default:
      return isOnline(opts.lastSeen) ? "online" : "offline";
  }
}

export const RARITY_META: Record<string, { label: string; color: string; ring: string }> = {
  common: { label: "Common", color: "text-slate-400", ring: "ring-slate-400/40" },
  rare: { label: "Rare", color: "text-sky-400", ring: "ring-sky-400/50" },
  epic: { label: "Epic", color: "text-fuchsia-400", ring: "ring-fuchsia-400/50" },
  legendary: { label: "Legendary", color: "text-amber-400", ring: "ring-amber-400/60" },
  mythic: { label: "Mythic", color: "text-rose-400", ring: "ring-rose-400/70" },
};

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * True when a message body is *exactly* a GIF link from a trusted host (Giphy).
 * We only ever inline-render images from this allowlist — users pick GIFs from
 * the Giphy picker, never paste arbitrary URLs — so a stray image link from
 * anywhere else is shown as plain text, not embedded.
 */
export function isGifUrl(content: string): boolean {
  const s = content.trim();
  if (/\s/.test(s)) return false; // must be a bare URL, nothing else
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    return u.hostname === "giphy.com" || u.hostname.endsWith(".giphy.com");
  } catch {
    return false;
  }
}
