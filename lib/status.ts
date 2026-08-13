/**
 * The status vocabulary, shared by the page, the API, the Discord bot and the
 * admin console.
 *
 * The strings are Statuspage's - `operational`, `degraded_performance`,
 * `partial_outage`, `major_outage`, `under_maintenance`, and the
 * `none`/`minor`/`major`/`critical` indicator on top - and they are chosen
 * rather than invented for the reason set out in migration 0071: the API this
 * feeds is meant to be read by other people's tools, and anything already
 * written against a status page understands ours with no translation.
 *
 * Everything here is pure data and pure functions, so a client component, a
 * route handler and a Discord embed builder can all import it.
 */

export type ComponentStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance";

export type StatusIndicator = "none" | "minor" | "major" | "critical" | "maintenance";

export type IncidentKind = "incident" | "maintenance";

export type IncidentImpact = "none" | "minor" | "major" | "critical" | "maintenance";

export type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved"
  | "scheduled"
  | "in_progress"
  | "verifying"
  | "completed";

export type ReportProblem =
  | "cannot_load"
  | "slow"
  | "login"
  | "gameplay"
  | "scores"
  | "purchases"
  | "social"
  | "discord"
  | "other";

export type ReportSignal = "none" | "elevated" | "spike";

/** Matches `status_uptime_series()` - one entry per day, oldest first. */
export type UptimeDayState = "up" | "degraded" | "down" | "unknown";

// ── the documents the RPCs return ───────────────────────────────────────────

export interface StatusComponentSummary {
  slug: string;
  name: string;
  description: string | null;
  group: string;
  position: number;
  status: ComponentStatus;
  pinned: boolean;
  pinned_reason: string | null;
  uptime_90d: number | null;
  uptime_30d: number | null;
  uptime_24h: number | null;
  last_checked_at: string | null;
  latency_ms: number | null;
}

export interface IncidentUpdate {
  id: string;
  status: IncidentStatus;
  body: string;
  created_at: string;
  author: string | null;
}

export interface Incident {
  id: string;
  ref: number;
  kind: IncidentKind;
  title: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  auto: boolean;
  started_at: string;
  resolved_at: string | null;
  scheduled_for: string | null;
  scheduled_until: string | null;
  components: { slug: string; name: string; status: ComponentStatus }[];
  updates: IncidentUpdate[];
}

export interface ReportBucket {
  at: string;
  reports: number;
}

export interface ReportTimeline {
  ok: boolean;
  error?: string;
  component: string | null;
  generated_at: string;
  window_minutes: number;
  hours: number;
  buckets: ReportBucket[];
  current: number;
  baseline: number;
  threshold: number;
  signal: ReportSignal;
  total: number;
  last_hour: number;
  problems: { problem: ReportProblem; reports: number; share: number }[];
}

export interface StatusSummary {
  generated_at: string;
  schema_version: string | null;
  status: { indicator: StatusIndicator; worst: number };
  components: StatusComponentSummary[];
  incidents: Incident[];
  maintenance: Incident[];
  reports: {
    signal: ReportSignal;
    current: number;
    baseline: number;
    threshold: number;
    last_hour: number;
    total_24h: number;
  };
  bot: { online: boolean; last_seen: string | null; version: string | null } | null;
}

export interface UptimeDay {
  day: string;
  checks: number;
  failures: number;
  degraded: number;
  downtime_seconds: number;
  uptime: number | null;
  state: UptimeDayState;
}

/**
 * `status_uptime_matrix()` - every component's bars in one small document.
 *
 * `states` is one character per day, oldest first: 0 unknown, 1 up, 2 degraded,
 * 3 down. `notes` is keyed by index into that string and only carries the days
 * that were not perfect. See the RPC's comment for why it is shaped like this.
 */
export interface UptimeMatrix {
  days: number;
  from: string;
  to: string;
  components: Record<
    string,
    {
      uptime: number | null;
      states: string;
      notes: Record<string, { uptime: number | null; checks: number; down_seconds: number }>;
    }
  >;
}

export const UPTIME_STATE: Record<string, UptimeDayState> = {
  "0": "unknown",
  "1": "up",
  "2": "degraded",
  "3": "down",
};

/** How a single day's bar is drawn and described. Never colour alone. */
export const UPTIME_DAY: Record<UptimeDayState, { label: string; fill: string; legend: string }> = {
  up: { label: "No downtime recorded", fill: "bg-success", legend: "Operational" },
  degraded: { label: "Slower than usual", fill: "bg-warning", legend: "Degraded" },
  down: { label: "Failed checks recorded", fill: "bg-destructive", legend: "Outage" },
  unknown: { label: "Nothing recorded", fill: "bg-muted", legend: "No data" },
};

export interface ComponentDetail {
  ok: boolean;
  error?: string;
  generated_at: string;
  slug: string;
  name: string;
  description: string | null;
  group: string;
  status: ComponentStatus;
  pinned: boolean;
  pinned_reason: string | null;
  uptime_24h: number | null;
  uptime_7d: number | null;
  uptime_30d: number | null;
  uptime_90d: number | null;
  days: UptimeDay[];
  last_checked_at: string | null;
  latency_ms: number | null;
  latency_avg_24h: number | null;
  incidents: Incident[];
  reports: ReportTimeline;
}

// ── labels and colours ──────────────────────────────────────────────────────

/**
 * One tone per status, and every surface reads it from here.
 *
 * `dot`/`text`/`bg`/`border` are separate rather than one blob because the same
 * status is drawn four different ways on the page - a pill, a bar, a dot beside
 * a component name, and the banner - and a single class string would have to be
 * fought with in three of them.
 */
export const COMPONENT_STATUS: Record<
  ComponentStatus,
  { label: string; short: string; dot: string; text: string; bg: string; border: string; emoji: string }
> = {
  operational: {
    label: "Operational",
    short: "Up",
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    emoji: "🟢",
  },
  degraded_performance: {
    label: "Degraded performance",
    short: "Slow",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    emoji: "🟡",
  },
  partial_outage: {
    label: "Partial outage",
    short: "Partial",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/15",
    border: "border-warning/40",
    emoji: "🟠",
  },
  major_outage: {
    label: "Major outage",
    short: "Down",
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    emoji: "🔴",
  },
  under_maintenance: {
    label: "Under maintenance",
    short: "Maintenance",
    dot: "bg-primary",
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    emoji: "🔧",
  },
};

/** The headline. British English, sentence case, and no exclamation marks. */
export const INDICATOR: Record<
  StatusIndicator,
  { label: string; blurb: string; text: string; bg: string; border: string; emoji: string }
> = {
  none: {
    label: "All systems operational",
    blurb: "Everything is working normally.",
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    emoji: "🟢",
  },
  minor: {
    label: "Degraded performance",
    blurb: "Some parts of the site are slower than usual.",
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    emoji: "🟡",
  },
  major: {
    label: "Partial outage",
    blurb: "Some parts of the site are not working.",
    text: "text-warning",
    bg: "bg-warning/15",
    border: "border-warning/40",
    emoji: "🟠",
  },
  critical: {
    label: "Major outage",
    blurb: "Something important is down and we are on it.",
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    emoji: "🔴",
  },
  maintenance: {
    label: "Under maintenance",
    blurb: "Planned work is in progress.",
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    emoji: "🔧",
  },
};

export const INCIDENT_STATUS: Record<IncidentStatus, { label: string; text: string; dot: string }> = {
  investigating: { label: "Investigating", text: "text-destructive", dot: "bg-destructive" },
  identified: { label: "Identified", text: "text-warning", dot: "bg-warning" },
  monitoring: { label: "Monitoring", text: "text-primary", dot: "bg-primary" },
  resolved: { label: "Resolved", text: "text-success", dot: "bg-success" },
  scheduled: { label: "Scheduled", text: "text-primary", dot: "bg-primary" },
  in_progress: { label: "In progress", text: "text-warning", dot: "bg-warning" },
  verifying: { label: "Verifying", text: "text-primary", dot: "bg-primary" },
  completed: { label: "Completed", text: "text-success", dot: "bg-success" },
};

export const INCIDENT_IMPACT: Record<IncidentImpact, { label: string; text: string }> = {
  none: { label: "No impact", text: "text-muted-foreground" },
  minor: { label: "Minor", text: "text-warning" },
  major: { label: "Major", text: "text-warning" },
  critical: { label: "Critical", text: "text-destructive" },
  maintenance: { label: "Maintenance", text: "text-primary" },
};

/**
 * What someone can tell us is wrong.
 *
 * Written as symptoms rather than causes, because the person reporting has no
 * way of knowing the cause and guessing at one makes the aggregate useless.
 * "Scores are not saving" is something a player can actually observe.
 */
export const REPORT_PROBLEMS: { value: ReportProblem; label: string; hint: string }[] = [
  { value: "cannot_load", label: "The site will not load", hint: "Pages fail, hang, or show an error." },
  { value: "slow", label: "Everything is slow", hint: "It loads, but it takes far too long." },
  { value: "login", label: "I cannot sign in", hint: "Signing in or signing up fails." },
  { value: "gameplay", label: "A game will not play", hint: "A game will not start, or breaks mid-run." },
  { value: "scores", label: "Scores are not saving", hint: "A run finished but the score or leaderboard did not update." },
  { value: "purchases", label: "Credits or the shop", hint: "A balance is wrong, or a purchase failed." },
  { value: "social", label: "Messages or friends", hint: "Chats, friend requests or parties are not working." },
  { value: "discord", label: "The Discord bot", hint: "Commands do not respond, or roles are not syncing." },
  { value: "other", label: "Something else", hint: "None of the above." },
];

export const REPORT_PROBLEM_LABEL: Record<ReportProblem, string> = Object.fromEntries(
  REPORT_PROBLEMS.map((p) => [p.value, p.label]),
) as Record<ReportProblem, string>;

/**
 * How the report signal is worded on the page.
 *
 * Deliberately hedged. Reports are people saying something is wrong for them,
 * which is evidence and not a verdict - the site can be entirely healthy while
 * one broken ISP generates fifty of them - so the copy never states an outage
 * on reports alone, it says what was received.
 */
export const REPORT_SIGNAL: Record<
  ReportSignal,
  { label: string; blurb: string; text: string; bg: string; border: string }
> = {
  none: {
    label: "No problems reported",
    blurb: "Reports are at their normal level.",
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  elevated: {
    label: "Some problems reported",
    blurb: "More reports than usual are coming in.",
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  spike: {
    label: "Problems reported",
    blurb: "Reports are well above the normal level right now.",
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
};

// ── pure helpers ────────────────────────────────────────────────────────────

const RANK: Record<ComponentStatus, number> = {
  operational: 0,
  under_maintenance: 1,
  degraded_performance: 2,
  partial_outage: 3,
  major_outage: 4,
};

export function statusRank(status: ComponentStatus): number {
  return RANK[status] ?? 0;
}

/** Mirrors `status_rank()` / `status_indicator()` in 0071. */
export function indicatorFor(statuses: ComponentStatus[]): StatusIndicator {
  const worst = statuses.reduce((n, s) => Math.max(n, statusRank(s)), 0);
  if (worst >= 4) return "critical";
  if (worst === 3) return "major";
  if (worst === 2) return "minor";
  if (worst === 1) return "maintenance";
  return "none";
}

/**
 * Uptime to two decimals, or an honest "No data".
 *
 * A component with no checks is not 100% - it is unmeasured, and rounding that
 * up to a perfect score is the one thing a status page must never do.
 */
export function formatUptime(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "No data";
  return `${Number(pct).toFixed(2)}%`;
}

export function isOpen(incident: Incident): boolean {
  return !incident.resolved_at;
}

/** "1h 12m", "4m", "3d 2h" - for how long an incident ran. */
export function formatDuration(fromIso: string, toIso?: string | null): string {
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  const mins = Math.max(0, Math.round((to - from) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) return rem ? `${hours}h ${rem}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/** Group components for rendering, keeping the DB's ordering. */
export function groupComponents(
  components: StatusComponentSummary[],
): { group: string; components: StatusComponentSummary[] }[] {
  const groups: { group: string; components: StatusComponentSummary[] }[] = [];
  for (const c of components) {
    const existing = groups.find((g) => g.group === c.group);
    if (existing) existing.components.push(c);
    else groups.push({ group: c.group, components: [c] });
  }
  return groups;
}
