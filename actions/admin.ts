"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/queries";
import { announcementSchema, gameUpsertSchema, usernameSchema } from "@/lib/validators";
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

export async function adminSetBanned(userId: string, banned: boolean): Promise<RpcResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_banned", { p_user: userId, p_banned: banned });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
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
  const profile = await requireStaff();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ ...parsed.data, author_id: profile.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return { ok: true };
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
