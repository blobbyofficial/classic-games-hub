"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { botDb } from "@/lib/discord/bot-db";
import { syncMemberRoles } from "@/lib/discord/role-sync";
import { requireStaff } from "@/lib/supabase/queries";
import {
  announcementSchema,
  bannerPayloadSchema,
  gameUpsertSchema,
  seasonalEventSchema,
  usernameSchema,
} from "@/lib/validators";
import type { RpcResult } from "@/types";

export async function adminAdjustCredits(userId: string, amount: number, reason: string): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_adjust_credits", {
    p_user: userId,
    p_amount: Math.trunc(amount),
    p_reason: reason.slice(0, 200) || "Manual adjustment",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function adminSetRole(userId: string, role: "user" | "moderator" | "admin"): Promise<RpcResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  // Mirror the change onto their Discord roles (best-effort, post-response).
  after(async () => {
    const discordId = await botDb.discordIdFor(userId);
    if (discordId) await syncMemberRoles(discordId);
  });
  return { ok: true };
}

export async function adminSetUsername(userId: string, newName: string): Promise<RpcResult> {
  await requireStaff();
  const parsed = usernameSchema.safeParse(newName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_username", {
    p_user: userId,
    p_new: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return data as RpcResult;
}

export async function adminSetLevelXp(userId: string, level: number, xp: number): Promise<RpcResult> {
  await requireStaff();
  if (!Number.isFinite(level) || !Number.isFinite(xp)) {
    return { ok: false, error: "Enter valid numbers" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_level_xp", {
    p_user: userId,
    p_level: Math.trunc(level),
    p_xp: Math.trunc(xp),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return data as RpcResult;
}

export async function adminUpdateAnnouncement(id: string, input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      level: parsed.data.level,
      published: parsed.data.published,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return { ok: true };
}

export async function adminDeleteAnnouncement(id: string): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return { ok: true };
}

export async function adminSetBanned(userId: string, banned: boolean): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_banned", { p_user: userId, p_banned: banned });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  // Banned accounts lose their managed Discord roles (and get them back on unban).
  after(async () => {
    const discordId = await botDb.discordIdFor(userId);
    if (discordId) await syncMemberRoles(discordId);
  });
  return { ok: true };
}

export async function adminUpsertGame(input: unknown, id?: string): Promise<RpcResult> {
  await requireStaff();
  const parsed = gameUpsertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    tagline: parsed.data.tagline || null,
    description: parsed.data.description || null,
  };
  const query = id
    ? supabase.from("games").update(payload).eq("id", id)
    : supabase.from("games").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/games");
  revalidatePath("/games");
  return { ok: true };
}

export async function adminToggleFeatured(id: string, featured: boolean): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("games").update({ featured }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/games");
  revalidatePath("/games");
  return { ok: true };
}

export async function adminSetGameStatus(
  id: string,
  status: "published" | "draft" | "archived" | "coming_soon",
): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("games").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/games");
  revalidatePath("/games");
  return { ok: true };
}

export async function adminPublishAnnouncement(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { title, body, level, published, notify, link_label, link_href } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("broadcast_announcement", {
    p_title: title,
    p_body: body,
    p_level: level,
    p_link_label: link_label ?? "",
    p_link_href: link_href ?? "",
    p_publish: published,
    p_notify: Boolean(notify) && published,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/", "layout");
  return data as RpcResult;
}

export async function adminResolveReport(
  id: number,
  status: "resolved" | "dismissed",
): Promise<RpcResult> {
  const profile = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_by: profile.id, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function adminSetFlag(key: string, enabled: boolean): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("feature_flags").update({ enabled }).eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/flags");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminSetSeasonalEvent(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = seasonalEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { enabled, ...payload } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled, payload })
    .eq("key", "seasonal_event");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/flags");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminSetBannerPayload(key: string, input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = bannerPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_flags")
    .update({ payload: parsed.data })
    .eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/flags");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Discord bot configuration ──────────────────────────────────────────

const levelingConfigSchema = z.object({
  enabled: z.boolean(),
  xp_min: z.number().int().min(1).max(1000),
  xp_max: z.number().int().min(1).max(1000),
  cooldown_seconds: z.number().int().min(5).max(3600),
  curve_quad: z.number().int().min(0).max(100),
  curve_linear: z.number().int().min(0).max(1000),
  curve_base: z.number().int().min(1).max(10000),
  announce_level_ups: z.boolean(),
  announce_channel_id: z.string().regex(/^\d{5,25}$/).nullable().or(z.literal("").transform(() => null)),
  no_xp_channel_ids: z.array(z.string().regex(/^\d{5,25}$/)).max(50),
  hub_xp_share: z.number().min(0).max(1),
});

const roleSyncConfigSchema = z.object({
  enabled: z.boolean(),
  role_map: z.record(z.string().min(1).max(64), z.string().regex(/^\d{5,25}$/)),
});

export async function adminSetBotLeveling(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = levelingConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.xp_max < parsed.data.xp_min) {
    return { ok: false, error: "Max XP must be at least the min XP" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_bot_config", {
    p_key: "leveling",
    p_value: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  const res = data as { ok?: boolean; error?: string } | null;
  if (!res?.ok) return { ok: false, error: res?.error ?? "Failed to save" };
  revalidatePath("/admin/discord");
  return { ok: true };
}

export async function adminSetBotRoleSync(input: unknown): Promise<RpcResult> {
  await requireStaff();
  const parsed = roleSyncConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Role map must map award keys to Discord role IDs" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_bot_config", {
    p_key: "role_sync",
    p_value: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  const res = data as { ok?: boolean; error?: string } | null;
  if (!res?.ok) return { ok: false, error: res?.error ?? "Failed to save" };
  revalidatePath("/admin/discord");
  return { ok: true };
}

export async function adminRunFullRoleSync(): Promise<RpcResult & { detail?: string }> {
  await requireStaff();
  const { syncAllMembers } = await import("@/lib/discord/role-sync");
  const result = await syncAllMembers(200);
  return {
    ok: true,
    detail: `Scanned ${result.scanned} linked member(s); updated ${result.changed}; ${result.errors} error(s).`,
  };
}
