"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema, settingsSchema, usernameSchema } from "@/lib/validators";
import type { RpcResult } from "@/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function updateProfile(input: { display_name?: string; bio?: string }): Promise<RpcResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name || null,
      bio: parsed.data.bio || null,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath(`/u/[username]`, "page");
  return { ok: true };
}

export async function updateSettings(input: Record<string, unknown>): Promise<RpcResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("user_settings").update(parsed.data).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeUsername(next: string): Promise<RpcResult> {
  const parsed = usernameSchema.safeParse(next);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("change_username", { p_new: parsed.data });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return data as RpcResult;
}

export async function setAvatarUrl(url: string | null): Promise<RpcResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setBannerUrl(url: string | null): Promise<RpcResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ banner_url: url }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/** Upload an avatar/banner to storage and point the profile at it. */
export async function uploadUserMedia(
  bucket: "avatars" | "banners",
  file: File,
): Promise<RpcResult> {
  const { supabase, user } = await requireUser();
  if (file.size > 4 * 1024 * 1024) return { ok: false, error: "Max file size is 4MB" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Images only" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (upErr) return { ok: false, error: upErr.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const patch =
    bucket === "avatars" ? { avatar_url: data.publicUrl } : { banner_url: data.publicUrl };
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { ok: true, url: data.publicUrl };
}

export async function markNotificationsRead(): Promise<RpcResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  return { ok: true };
}
