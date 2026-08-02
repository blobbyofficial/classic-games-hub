"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/supabase/queries";
import { botDb } from "@/lib/discord/bot-db";
import type { OpResult, PushSection } from "@/lib/discord/ops";

/**
 * Running Discord commands from the dashboard.
 *
 * Every one of these calls the same function the matching slash command calls,
 * so a case raised here is indistinguishable from one raised in Discord -
 * numbered the same way, DM'd the same way, logged to the same channel and the
 * same website audit trail.
 *
 * The actor is the signed-in staff member's *Discord* account, resolved from
 * their linked profile. Someone who hasn't linked can't act: an unattributable
 * moderation case is worse than no case, and the mod log has to name a person.
 */

const idSchema = z.string().regex(/^\d{5,25}$/, "That doesn't look like a Discord ID.");

async function actor(): Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  const profile = await requireStaff();
  const discordId = await botDb.discordIdFor(profile.id);
  if (!discordId) {
    return {
      ok: false,
      error:
        "Link your Discord account first (Settings → Connections). Actions are recorded against the moderator who took them, so they can't be run from an unlinked account.",
    };
  }
  return { ok: true, id: discordId, name: profile.display_name ?? profile.username };
}

/** Applies a section's saved settings to the Discord server. */
export async function adminPushBotSection(section: PushSection): Promise<OpResult> {
  await requireStaff();
  const { pushSection } = await import("@/lib/discord/ops");
  const res = await pushSection(section);
  revalidatePath("/admin/discord");
  return res;
}

/** Applies every section at once. */
export async function adminPushAllBotSections(): Promise<OpResult> {
  await requireStaff();
  const { pushSection } = await import("@/lib/discord/ops");
  const sections: PushSection[] = ["level_roles", "verification", "tickets", "stats"];

  const done: string[] = [];
  const problems: string[] = [];
  for (const section of sections) {
    const res = await pushSection(section);
    if (res.ok) done.push(`${section}: ${res.detail ?? "done"}`);
    else problems.push(`${section}: ${res.error}`);
  }
  revalidatePath("/admin/discord");
  return {
    // Partial success is still success - report what didn't take rather than
    // failing the whole push because one section isn't configured yet.
    ok: done.length > 0,
    detail: done.join(" · "),
    error: problems.length ? problems.join(" · ") : undefined,
  };
}

const announceSchema = z.object({
  channelId: idSchema,
  message: z.string().trim().min(1, "Write something to announce.").max(4000),
  title: z.string().trim().max(256).optional(),
  pingRoleId: z.union([idSchema, z.literal("")]).optional(),
  imageUrl: z.string().url().startsWith("https://", "Image URLs must be https.").or(z.literal("")).optional(),
  plain: z.boolean().optional(),
});

export async function adminAnnounce(input: unknown): Promise<OpResult> {
  await requireStaff();
  const parsed = announceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { announce } = await import("@/lib/discord/ops");
  return announce({
    channelId: parsed.data.channelId,
    message: parsed.data.message,
    title: parsed.data.title || undefined,
    pingRoleId: parsed.data.pingRoleId || undefined,
    imageUrl: parsed.data.imageUrl || undefined,
    plain: parsed.data.plain,
  });
}

const modSchema = z.object({
  action: z.enum(["warn", "timeout", "untimeout", "kick", "ban", "unban"]),
  targetId: idSchema,
  reason: z.string().trim().max(400).optional(),
  minutes: z.number().int().min(1).max(40320).optional(),
});

export async function adminModerate(input: unknown): Promise<OpResult> {
  const who = await actor();
  if (!who.ok) return { ok: false, error: who.error };

  const parsed = modSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { moderate } = await import("@/lib/discord/ops");
  const res = await moderate({
    action: parsed.data.action,
    targetId: parsed.data.targetId,
    reason: parsed.data.reason ?? "",
    minutes: parsed.data.minutes,
    actor: { id: who.id, name: who.name },
  });
  revalidatePath("/admin/audit");
  return res;
}

const channelSchema = z.object({
  channelId: idSchema,
  count: z.number().int().min(1).max(100).optional(),
  seconds: z.number().int().min(0).max(21600).optional(),
  locked: z.boolean().optional(),
});

export async function adminPurge(input: unknown): Promise<OpResult> {
  const who = await actor();
  if (!who.ok) return { ok: false, error: who.error };
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { purge } = await import("@/lib/discord/ops");
  return purge(parsed.data.channelId, parsed.data.count ?? 10, { id: who.id, name: who.name });
}

export async function adminSetSlowmode(input: unknown): Promise<OpResult> {
  await requireStaff();
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { setSlowmode } = await import("@/lib/discord/ops");
  return setSlowmode(parsed.data.channelId, parsed.data.seconds ?? 0);
}

export async function adminSetChannelLock(input: unknown): Promise<OpResult> {
  const who = await actor();
  if (!who.ok) return { ok: false, error: who.error };
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { setChannelLock } = await import("@/lib/discord/ops");
  return setChannelLock(parsed.data.channelId, parsed.data.locked ?? true, { id: who.id, name: who.name });
}
