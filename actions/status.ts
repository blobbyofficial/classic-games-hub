"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/queries";
import { submitReport } from "@/lib/status-report";
import type { ComponentStatus, IncidentStatus, ReportSignal } from "@/lib/status";
import type { RpcResult } from "@/types";

/**
 * Writes behind the status page.
 *
 * Two audiences with two very different permission stories, deliberately in one
 * file because they are the same feature: anyone at all can report a problem,
 * and only staff can say anything about one. The database enforces both - these
 * translate `{ok, error}` envelopes into sentences, they do not decide.
 */

const PROBLEMS = [
  "cannot_load",
  "slow",
  "login",
  "gameplay",
  "scores",
  "purchases",
  "social",
  "discord",
  "other",
] as const;

const reportSchema = z.object({
  slug: z.string().trim().max(64).nullish(),
  problem: z.enum(PROBLEMS),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export interface ReportResult extends RpcResult {
  signal?: ReportSignal;
}

/**
 * Record a "this is broken for me" report.
 *
 * No sign-in required, and that is the point: someone who cannot sign in is
 * precisely the person with something to report. A signed-in visitor gets their
 * id attached, which only widens the rate limit's view of them - it never
 * unlocks anything.
 */
export async function reportProblem(input: unknown): Promise<ReportResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await submitReport({
    slug: parsed.data.slug ?? null,
    problem: parsed.data.problem,
    note: parsed.data.note || null,
    userId: user?.id ?? null,
    headers: await headers(),
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Could not record that report." };

  revalidatePath("/status");
  return { ok: true, signal: result.signal };
}

// ── staff ───────────────────────────────────────────────────────────────────

const incidentSchema = z.object({
  title: z.string().trim().min(3, "Give the incident a title").max(120),
  body: z.string().trim().min(3, "Say what is happening").max(2000),
  impact: z.enum(["none", "minor", "major", "critical", "maintenance"]).default("minor"),
  kind: z.enum(["incident", "maintenance"]).default("incident"),
  status: z
    .enum([
      "investigating",
      "identified",
      "monitoring",
      "resolved",
      "scheduled",
      "in_progress",
      "verifying",
      "completed",
    ])
    .optional(),
  components: z
    .array(
      z.object({
        slug: z.string().trim().min(1),
        status: z.enum([
          "operational",
          "degraded_performance",
          "partial_outage",
          "major_outage",
          "under_maintenance",
        ]),
      }),
    )
    .default([]),
  scheduled_for: z.string().trim().optional().or(z.literal("")),
  scheduled_until: z.string().trim().optional().or(z.literal("")),
});

/** ISO or nothing - an empty datetime-local field must not become epoch zero. */
const asTimestamp = (value: string | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export async function openIncident(input: unknown): Promise<RpcResult & { ref?: number }> {
  await requireStaff();
  const parsed = incidentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("status_incident_open", {
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_impact: parsed.data.impact,
    p_kind: parsed.data.kind,
    p_status: parsed.data.status ?? null,
    p_components: parsed.data.components,
    p_scheduled_for: asTimestamp(parsed.data.scheduled_for),
    p_scheduled_until: asTimestamp(parsed.data.scheduled_until),
  });
  if (error) return { ok: false, error: error.message };

  const result = data as unknown as { ok: boolean; error?: string; ref?: number };
  if (!result?.ok) return { ok: false, error: staffError(result?.error) };

  revalidatePath("/status");
  revalidatePath("/admin/status");
  return { ok: true, ref: result.ref };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "investigating",
    "identified",
    "monitoring",
    "resolved",
    "scheduled",
    "in_progress",
    "verifying",
    "completed",
  ]),
  body: z.string().trim().min(3, "Say what has changed").max(2000),
});

/**
 * Post an update, which is also how an incident is closed - `resolved` or
 * `completed` sets the resolved timestamp and releases the components. There is
 * no separate close action, so a resolved incident can never have a timeline
 * that stops mid-sentence.
 */
export async function postIncidentUpdate(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("status_incident_post", {
    p_id: parsed.data.id,
    p_status: parsed.data.status as IncidentStatus,
    p_body: parsed.data.body,
  });
  if (error) return { ok: false, error: error.message };

  const result = data as unknown as { ok: boolean; error?: string };
  if (!result?.ok) return { ok: false, error: staffError(result?.error) };

  revalidatePath("/status");
  revalidatePath("/admin/status");
  return { ok: true };
}

const pinSchema = z.object({
  slug: z.string().trim().min(1),
  status: z
    .enum([
      "operational",
      "degraded_performance",
      "partial_outage",
      "major_outage",
      "under_maintenance",
    ])
    .nullish(),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

/**
 * Pin a component's status, overriding the probes, or clear the pin by passing
 * a null status. The only control here that can make the board look *better*
 * than the evidence, which is why the reason is recorded with it.
 */
export async function pinComponent(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = pinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("status_component_pin", {
    p_slug: parsed.data.slug,
    p_status: (parsed.data.status as ComponentStatus | null) ?? null,
    p_reason: parsed.data.reason || null,
  });
  if (error) return { ok: false, error: error.message };

  const result = data as unknown as { ok: boolean; error?: string };
  if (!result?.ok) return { ok: false, error: staffError(result?.error) };

  revalidatePath("/status");
  revalidatePath("/admin/status");
  return { ok: true };
}

const STAFF_ERRORS: Record<string, string> = {
  forbidden: "You do not have permission to do that.",
  title_required: "Give the incident a title.",
  body_required: "Write an update to go with it.",
  bad_kind: "That is not a kind of incident.",
  unknown_incident: "That incident no longer exists.",
  unknown_component: "That component does not exist.",
};

function staffError(code: string | undefined): string {
  return (code && STAFF_ERRORS[code]) || "Something went wrong. Try again.";
}
