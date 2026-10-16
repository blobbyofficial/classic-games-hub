"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/supabase/queries";
import { botDb } from "@/lib/discord/bot-db";
import type { OpResult, PushSection } from "@/lib/discord/ops";

/**
 * Dashboard actions share the underlying Discord operations with slash commands.
 * Authentication happens in every exported action; the operations layer must
 * additionally enforce bot permissions, target hierarchy and audit requirements.
 */
const discordIdSchema = z.string().regex(/^\d{5,25}$/, "Enter a valid Discord ID.");
const pushSectionSchema = z.enum(["level_roles", "verification", "tickets", "stats", "publishing"]);
const PUSH_SECTIONS = pushSectionSchema.options;
const publishingChoiceSchema = z.enum(["releases", "announcements", "both"]);

type ActorResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string };

async function actor(): Promise<ActorResult> {
  const profile = await requireStaff();
  const discordId = await botDb.discordIdFor(profile.id);
  if (!discordId || !discordIdSchema.safeParse(discordId).success) {
    return {
      ok: false,
      error: "Link your Discord account first (Settings → Connections). Moderation actions must be attributable to the staff member who performed them.",
    };
  }
  return {
    ok: true,
    id: discordId,
    name: profile.display_name?.trim() || profile.username || discordId,
  };
}

function invalid(error: z.ZodError): OpResult {
  const issue = error.issues[0];
  return { ok: false, error: issue?.message ?? "Invalid input." };
}

/** Only catches integration errors; authorisation errors must propagate. */
async function runDiscord(label: string, operation: () => Promise<OpResult>): Promise<OpResult> {
  try {
    return await operation();
  } catch (error) {
    console.error(`[admin/discord] ${label} failed`, error);
    return { ok: false, error: "The Discord operation failed unexpectedly. Check the server logs and try again." };
  }
}

/** Apply one configured section to Discord. */
export async function adminPushBotSection(section: PushSection): Promise<OpResult> {
  await requireStaff();
  const parsed = pushSectionSchema.safeParse(section);
  if (!parsed.success) return invalid(parsed.error);

  const res = await runDiscord(`push ${parsed.data}`, async () => {
    const { pushSection } = await import("@/lib/discord/ops");
    return pushSection(parsed.data);
  });
  revalidatePath("/admin/discord");
  return res;
}

/** Apply every pushable section, allowing independently failing sections to continue. */
export async function adminPushAllBotSections(): Promise<OpResult> {
  await requireStaff();
  const { pushSection } = await import("@/lib/discord/ops");
  const succeeded: string[] = [];
  const failures: string[] = [];

  for (const section of PUSH_SECTIONS) {
    const res = await runDiscord(`push ${section}`, () => pushSection(section));
    if (res.ok) succeeded.push(`${section}: ${res.detail ?? "done"}`);
    else failures.push(`${section}: ${res.error ?? "failed"}`);
  }

  revalidatePath("/admin/discord");
  // The success flag follows the existing partial-success contract; consumers
  // must show `error` even when `ok` is true.
  return {
    ok: succeeded.length > 0,
    detail: succeeded.length ? succeeded.join(" · ") : undefined,
    error: failures.length ? failures.join(" · ") : undefined,
  };
}

/** Bring either or both publishing channels into sync with saved content. */
export async function adminSyncPublishing(
  what: "releases" | "announcements" | "both",
): Promise<OpResult> {
  await requireStaff();
  const parsed = publishingChoiceSchema.safeParse(what);
  if (!parsed.success) return invalid(parsed.error);

  const { syncAnnouncements, syncUpdateLog, summariseSync } = await import("@/lib/discord/publish");
  const parts: string[] = [];
  const problems: string[] = [];

  if (parsed.data === "releases" || parsed.data === "both") {
    const res = await runDiscord("sync update log", syncUpdateLog);
    if (res.ok) parts.push(`Update log: ${summariseSync(res as Awaited<ReturnType<typeof syncUpdateLog>>)}`);
    else problems.push(`Update log: ${res.error ?? res.detail ?? "failed"}`);
  }
  if (parsed.data === "announcements" || parsed.data === "both") {
    const res = await runDiscord("sync announcements", syncAnnouncements);
    if (res.ok) parts.push(`Announcements: ${summariseSync(res as Awaited<ReturnType<typeof syncAnnouncements>>)}`);
    else problems.push(`Announcements: ${res.error ?? res.detail ?? "failed"}`);
  }

  revalidatePath("/admin/discord");
  return {
    ok: parts.length > 0,
    detail: parts.length ? parts.join(" · ") : undefined,
    error: problems.length ? problems.join(" · ") : undefined,
  };
}

const announceSchema = z.object({
  channelId: discordIdSchema,
  message: z.string().trim().min(1, "Write something to announce.").max(4000),
  title: z.string().trim().max(256).optional(),
  pingRoleId: z.union([discordIdSchema, z.literal("")]).optional(),
  imageUrl: z.union([z.string().url().startsWith("https://", "Image URLs must use HTTPS."), z.literal("")]).optional(),
  plain: z.boolean().optional(),
});

export async function adminAnnounce(input: unknown): Promise<OpResult> {
  await requireStaff();
  const parsed = announceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return runDiscord("announce", async () => {
    const { announce } = await import("@/lib/discord/ops");
    return announce({
      channelId: parsed.data.channelId,
      message: parsed.data.message,
      title: parsed.data.title || undefined,
      pingRoleId: parsed.data.pingRoleId || undefined,
      imageUrl: parsed.data.imageUrl || undefined,
      plain: parsed.data.plain,
    });
  });
}

const modSchema = z.object({
  action: z.enum(["warn", "timeout", "untimeout", "kick", "ban", "unban"]),
  targetId: discordIdSchema,
  reason: z.string().trim().max(400).optional(),
  minutes: z.number().int().min(1).max(40320).optional(),
}).superRefine(({ action, minutes }, ctx) => {
  if (action === "timeout" && minutes === undefined) {
    ctx.addIssue({ code: "custom", path: ["minutes"], message: "Specify the timeout duration in minutes." });
  }
});

export async function adminModerate(input: unknown): Promise<OpResult> {
  const who = await actor();
  if (!who.ok) return { ok: false, error: who.error };
  const parsed = modSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const res = await runDiscord(`moderation ${parsed.data.action}`, async () => {
    const { moderate } = await import("@/lib/discord/ops");
    return moderate({
      action: parsed.data.action,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason ?? "",
      minutes: parsed.data.minutes,
      actor: { id: who.id, name: who.name },
    });
  });
  revalidatePath("/admin/audit");
  return res;
}

const purgeSchema = z.object({
  channelId: discordIdSchema,
  count: z.number().int().min(1).max(100).optional(),
});
const slowmodeSchema = z.object({
  channelId: discordIdSchema,
  seconds: z.number().int().min(0).max(21600),
});
const lockSchema = z.object({
  channelId: discordIdSchema,
  locked: z.boolean(),
});

export async function adminPurge(input: unknown): Promise<OpResult> {
  const who = await actor();
  if (!who.ok) return { ok: false, error: who.error };
  const parsed = purgeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return runDiscord("purge", async () => {
    const { purge } = await import("@/lib/discord/ops");
    return purge(parsed.data.channelId, parsed.data.count ?? 10, { id: who.id, name: who.name });
  });
}

export async function adminSetSlowmode(input: unknown): Promise<OpResult> {
  await requireStaff();
  const parsed = slowmodeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return runDiscord("set slowmode", async () => {
    const { setSlowmode } = await import("@/lib/discord/ops");
    return setSlowmode(parsed.data.channelId, parsed.data.seconds);
  });
}

export async function adminSetChannelLock(input: unknown): Promise<OpResult> {
  const who = await actor();
  if (!who.ok) return { ok: false, error: who.error };
  const parsed = lockSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return runDiscord("set channel lock", async () => {
    const { setChannelLock } = await import("@/lib/discord/ops");
    return setChannelLock(parsed.data.channelId, parsed.data.locked, { id: who.id, name: who.name });
  });
}
