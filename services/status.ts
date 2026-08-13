import { cache } from "react";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type {
  ComponentDetail,
  Incident,
  ReportTimeline,
  StatusSummary,
  UptimeMatrix,
} from "@/lib/status";

/**
 * Reads behind /status, the public status API and the Discord bot.
 *
 * All of them are one `rpc()` call returning one jsonb document, because the
 * status page is the one page on the site most likely to be loaded while the
 * database is having a bad day - and a page that needs six round trips to tell
 * you the database is slow is not much of a status page. `cache()` collapses
 * the repeats within a single render.
 */

/** Shape of the jsonb document `platform_status()` returns (0043). */
export interface PlatformStatus {
  generated_at: string;
  players: { total: number; online: number; active_24h: number; discord_linked: number };
  games: {
    published: number;
    /**
     * Optional because it arrives with 0070, and a migration reaches Supabase
     * separately from the deploy that expects it - the key is simply absent
     * from the jsonb until then. Read it with `?? 0`: `published + undefined`
     * is NaN, and `formatNumber` guards null and undefined but not NaN, so the
     * tile renders the string "NaN" rather than a number.
     */
    in_development?: number;
    coming_soon: number;
    plays_today: number;
    plays_last_hour: number;
    plays_total: number;
  };
  social: { messages_24h: number; friendships: number };
  economy: { credits_awarded_24h: number; shop_items: number };
  discord: {
    worker_last_seen: string | null;
    worker_online: boolean;
    leveling_enabled: boolean;
    verification_configured: boolean;
    tickets_configured: boolean;
    counters_configured: boolean;
    milestone_roles_created: number;
    milestone_roles_expected: number;
    chat_members: number;
    mod_cases: number;
    open_tickets: number;
  };
  moderation: { open_reports: number; banned: number };
}

/**
 * The busy-ness numbers (0043).
 *
 * Kept separate from `getStatusSummary` on purpose: this one counts every play
 * session ever recorded, which is the most expensive query on the page and has
 * nothing to do with whether anything is working. The health document stays
 * cheap enough to serve from the API on a short cache; this is fetched
 * alongside it only where it is actually shown.
 */
export const getPlatformStatus = cache(async (): Promise<PlatformStatus | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_status");
  if (error || !data) return null;
  return data as unknown as PlatformStatus;
});

/** The whole status document: components, incidents, maintenance, report signal. */
export const getStatusSummary = cache(async (): Promise<StatusSummary | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("status_summary");
  if (error || !data) return null;
  return data as unknown as StatusSummary;
});

/** One component in detail, including its 90 daily uptime bars. */
export const getStatusComponent = cache(async (slug: string): Promise<ComponentDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("status_component", { p_slug: slug });
  if (error || !data) return null;
  const doc = data as unknown as ComponentDetail;
  return doc.ok ? doc : null;
});

/** Every component's uptime bars, small enough to send with the page. */
export const getUptimeMatrix = cache(async (days = 90): Promise<UptimeMatrix | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("status_uptime_matrix", { p_days: days });
  if (error || !data) return null;
  return data as unknown as UptimeMatrix;
});

/**
 * Incident history, or null when it could not be read.
 *
 * The null matters. Returning `[]` on a failed read would have this reporting
 * "no incidents" at exactly the moment the database is unreachable, which is
 * the one lie a status page must never tell - so the failure is passed up and
 * the API answers 503 rather than an empty list.
 */
export const getIncidentHistory = cache(
  async (limit = 20, before?: string, kind?: "incident" | "maintenance"): Promise<Incident[] | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("status_incident_history", {
      p_limit: limit,
      p_before: before ?? null,
      p_kind: kind ?? null,
    });
    if (error || !data) return null;
    return data as unknown as Incident[];
  },
);

/** The Downdetector-style report series: 15-minute buckets, baseline, verdict. */
export const getReportTimeline = cache(
  async (slug?: string | null, hours = 24): Promise<ReportTimeline | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("status_reports_timeline", {
      p_slug: slug ?? null,
      p_hours: hours,
    });
    if (error || !data) return null;
    return data as unknown as ReportTimeline;
  },
);

/**
 * Just slug and name, for Discord's autocomplete.
 *
 * A plain table read rather than `status_summary()` on purpose: autocomplete
 * fires as someone types and cannot be deferred, and the summary runs four
 * uptime aggregates per component. This is one indexed select.
 */
export const getStatusChoices = cache(async (): Promise<{ slug: string; name: string }[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("status_components")
    .select("slug, name")
    .eq("visible", true)
    .order("position");
  return data ?? [];
});

export interface RecentReport {
  id: string;
  problem: string;
  note: string | null;
  component: string | null;
  component_name: string | null;
  username: string | null;
  created_at: string;
}

/**
 * Individual reports for the admin console - the only reader that returns rows
 * rather than counts, because triaging "forty people say the shop is broken"
 * means reading what the forty people actually wrote. The RPC checks is_staff()
 * itself, so an ordinary session gets `forbidden` rather than data.
 */
export const getRecentReports = cache(async (limit = 50): Promise<RecentReport[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("status_recent_reports", { p_limit: limit });
  if (error || !data) return [];
  const doc = data as unknown as { ok: boolean; reports?: RecentReport[] };
  return doc.ok ? (doc.reports ?? []) : [];
});

/**
 * The schema version the database reports, for the versions panel.
 *
 * Read through the admin client when one is configured so it works even if the
 * table's read policy is ever tightened; falls back to the anon client, which
 * `status_meta`'s public select policy allows.
 */
export const getSchemaVersion = cache(async (): Promise<string | null> => {
  const supabase = createAdminClient() ?? (await createClient());
  const { data } = await supabase.from("status_meta").select("value").eq("key", "schema").maybeSingle();
  const value = data?.value as { version?: string } | null;
  return value?.version ?? null;
});
