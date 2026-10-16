"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/queries";
import { submitReport } from "@/lib/status-report";
import type { ComponentStatus, IncidentStatus, ReportSignal } from "@/lib/status";
import type { RpcResult } from "@/types";

const PROBLEMS = [
  "cannot_load", "slow", "login", "gameplay", "scores",
  "purchases", "social", "discord", "other",
] as const;

const componentStatusSchema = z.enum([
  "operational", "degraded_performance", "partial_outage",
  "major_outage", "under_maintenance",
]);
const incidentStatusSchema = z.enum([
  "investigating", "identified", "monitoring", "resolved",
  "scheduled", "in_progress", "verifying", "completed",
]);
const slugSchema = z.string().trim().min(1).max(64).regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Invalid component slug.");
const reportSchema = z.object({
  slug: slugSchema.nullish(),
  problem: z.enum(PROBLEMS),
  note: z.string().trim().max(200).nullish(),
});

export interface ReportResult extends RpcResult {
  signal?: ReportSignal;
}

type RpcEnvelope = { ok: boolean; error?: string; ref?: number };
const rpcEnvelopeSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  ref: z.number().int().positive().optional(),
}).passthrough();

const STAFF_ERRORS: Record<string, string> = {
  forbidden: "You do not have permission to do that.",
  title_required: "Give the incident a title.",
  body_required: "Write an update to go with it.",
  bad_kind: "That is not a kind of incident.",
  unknown_incident: "That incident no longer exists.",
  unknown_component: "That component does not exist.",
};

function staffError(code: string | undefined): string {
  return (code && Object.prototype.hasOwnProperty.call(STAFF_ERRORS, code))
    ? STAFF_ERRORS[code]
    : "Something went wrong. Try again.";
}

function validationError(error: z.ZodError): RpcResult {
  const issue = error.issues[0];
  return { ok: false, error: issue ? `${issue.path.join(".") || "Input"}: ${issue.message}` : "Invalid input." };
}

function parseRpcResponse(data: unknown, operation: string): RpcEnvelope {
  const parsed = rpcEnvelopeSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  console.error(`[status] ${operation}: invalid RPC response envelope`);
  return { ok: false };
}

async function staffRpc(
  procedure: "status_incident_open" | "status_incident_post" | "status_component_pin",
  parameters: Record<string, unknown>,
): Promise<RpcEnvelope> {
  // Every call checks staff access before invoking the database operation.
  await requireStaff();
  const supabase = await createClient();
  try {
    // These RPC names are fixed, not derived from user input.
    const { data, error } = await supabase.rpc(procedure, parameters);
    if (error) {
      console.error(`[status] ${procedure} failed`, { code: error.code });
      return { ok: false };
    }
    return parseRpcResponse(data, procedure);
  } catch (error) {
    console.error(`[status] ${procedure} unexpected failure`, error);
    return { ok: false };
  }
}

function invalidateStatus(): void {
  revalidatePath("/status");
  revalidatePath("/admin/status");
}

/** Public outage reports are accepted without requiring a working login. */
export async function reportProblem(input: unknown): Promise<ReportResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createClient();
    // A user lookup may fail during the very outage being reported: remain anonymous.
    const { data, error } = await supabase.auth.getUser();
    const userId = error ? null : (data.user?.id ?? null);
    const result = await submitReport({
      slug: parsed.data.slug ?? null,
      problem: parsed.data.problem,
      note: parsed.data.note || null,
      userId,
      headers: await headers(),
    });
    if (!result.ok) {
      // Preserve the public rate-limit/validation messages from status-report.
      return { ok: false, error: result.error ?? "Could not record that report." };
    }
    revalidatePath("/status");
    return { ok: true, signal: result.signal };
  } catch (error) {
    console.error("[status] reportProblem failed", error);
    return { ok: false, error: "Could not record that report. Please try again." };
  }
}

const timestampSchema = z.union([
  z.literal(""),
  z.string().trim().max(40).refine((value) => Number.isFinite(Date.parse(value)), "Enter a valid date and time."),
]).optional();

const incidentSchema = z.object({
  title: z.string().trim().min(3, "Give the incident a title").max(120),
  body: z.string().trim().min(3, "Say what is happening").max(2000),
  impact: z.enum(["none", "minor", "major", "critical", "maintenance"]).default("minor"),
  kind: z.enum(["incident", "maintenance"]).default("incident"),
  status: incidentStatusSchema.optional(),
  components: z.array(z.object({
    slug: slugSchema,
    status: componentStatusSchema,
  })).max(100).default([]).refine(
    (items) => new Set(items.map((item) => item.slug)).size === items.length,
    "Each component may only appear once.",
  ),
  scheduled_for: timestampSchema,
  scheduled_until: timestampSchema,
}).superRefine((value, ctx) => {
  const start = value.scheduled_for ? Date.parse(value.scheduled_for) : null;
  const end = value.scheduled_until ? Date.parse(value.scheduled_until) : null;
  if (end !== null && start === null) {
    ctx.addIssue({ code: "custom", path: ["scheduled_until"], message: "Provide a start time first." });
  }
  if (start !== null && end !== null && end <= start) {
    ctx.addIssue({ code: "custom", path: ["scheduled_until"], message: "End time must be after start time." });
  }
});

function asTimestamp(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

export async function openIncident(input: unknown): Promise<RpcResult & { ref?: number }> {
  await requireStaff();
  const parsed = incidentSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const value = parsed.data;
  const result = await staffRpc("status_incident_open", {
    p_title: value.title,
    p_body: value.body,
    p_impact: value.impact,
    p_kind: value.kind,
    p_status: value.status ?? null,
    p_components: value.components,
    p_scheduled_for: asTimestamp(value.scheduled_for),
    p_scheduled_until: asTimestamp(value.scheduled_until),
  });
  if (!result.ok) return { ok: false, error: staffError(result.error) };
  invalidateStatus();
  return { ok: true, ref: result.ref };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: incidentStatusSchema,
  body: z.string().trim().min(3, "Say what has changed").max(2000),
});

export async function postIncidentUpdate(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const result = await staffRpc("status_incident_post", {
    p_id: parsed.data.id,
    p_status: parsed.data.status as IncidentStatus,
    p_body: parsed.data.body,
  });
  if (!result.ok) return { ok: false, error: staffError(result.error) };
  invalidateStatus();
  return { ok: true };
}

const pinSchema = z.object({
  slug: slugSchema,
  status: componentStatusSchema.nullish(),
  reason: z.string().trim().max(200).optional(),
}).superRefine((value, ctx) => {
  // Explicit reasons make manual overrides auditable.
  if (value.status !== null && value.status !== undefined && !value.reason?.length) {
    ctx.addIssue({ code: "custom", path: ["reason"], message: "Give a reason for this status override." });
  }
});

export async function pinComponent(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = pinSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const result = await staffRpc("status_component_pin", {
    p_slug: parsed.data.slug,
    p_status: (parsed.data.status as ComponentStatus | null) ?? null,
    p_reason: parsed.data.reason || null,
  });
  if (!result.ok) return { ok: false, error: staffError(result.error) };
  invalidateStatus();
  return { ok: true };
}
