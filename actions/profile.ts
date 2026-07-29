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

export async function updateProfile(input: {
  display_name?: string;
  bio?: string;
  pronouns?: string;
  status_text?: string;
  favourite_game_slug?: string;
}): Promise<RpcResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name || null,
      bio: parsed.data.bio || null,
      pronouns: parsed.data.pronouns || null,
      status_text: parsed.data.status_text || null,
      favourite_game_slug: parsed.data.favourite_game_slug || null,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath(`/u/[username]`, "page");
  return { ok: true };
}

/** Set (or clear) the display-name style, stored in the equipped jsonb. */
export async function setNameStyle(style: string): Promise<RpcResult> {
  const { supabase, user } = await requireUser();
  const { data: prof } = await supabase.from("profiles").select("equipped").eq("id", user.id).single();
  const equipped = { ...((prof?.equipped as Record<string, string>) ?? {}) };
  if (style && style !== "none") equipped.name_style = style;
  else delete equipped.name_style;
  const { error } = await supabase.from("profiles").update({ equipped }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  revalidatePath("/", "layout");
  return { ok: true, equipped };
}

/** Set a plain solid-colour banner (email tier) via equipped.banner, or clear it. */
export async function setBannerColor(color: string | null): Promise<RpcResult> {
  const { supabase, user } = await requireUser();
  const { data: prof } = await supabase.from("profiles").select("equipped").eq("id", user.id).single();
  const equipped = { ...((prof?.equipped as Record<string, string>) ?? {}) };
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) equipped.banner = color;
  else delete equipped.banner;
  const { error } = await supabase.from("profiles").update({ equipped }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  revalidatePath("/", "layout");
  return { ok: true, equipped };
}

/** Pin favourite games to the profile showcase (max 4 slugs). */
export async function setShowcase(slugs: string[]): Promise<RpcResult> {
  const { supabase, user } = await requireUser();
  const clean = [...new Set(slugs.filter((s) => /^[a-z0-9-]+$/.test(s)))].slice(0, 4);
  const { error } = await supabase.from("profiles").update({ showcase: clean }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  return { ok: true };
}

/** Pin (or clear) a featured achievement on the profile. */
export async function setFeaturedAchievement(slug: string | null): Promise<RpcResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ featured_achievement: slug }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  return { ok: true };
}

export async function updateSettings(input: Record<string, unknown>): Promise<RpcResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("user_settings").update(parsed.data).eq("user_id", user.id);
  if (error) {
    if (error.message.includes("boosters and staff")) {
      return { ok: false, error: "That theme is for server boosters and staff." };
    }
    return { ok: false, error: error.message };
  }

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

/** Free, one-time username pick used by onboarding and forced resets. */
export async function chooseUsername(next: string): Promise<RpcResult> {
  const parsed = usernameSchema.safeParse(next);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("set_username", { p_new: parsed.data });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return data as RpcResult;
}

/**
 * Claim (or clear, with an empty string) a vanity URL - the second handle that
 * makes /u/<slug> work alongside /u/<username>. Eligibility and uniqueness are
 * both decided in `set_vanity_slug`; this only translates its codes.
 */
export async function setVanitySlug(slug: string): Promise<RpcResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("set_vanity_slug", { p_slug: slug.trim() || null });
  if (error) return { ok: false, error: error.message };

  const res = data as RpcResult;
  if (!res.ok) {
    const messages: Record<string, string> = {
      not_eligible: "Vanity URLs unlock at level 30, or by boosting the Discord server.",
      bad_format: "Use 3–24 characters: letters, numbers, hyphens or underscores.",
      reserved: "That one's reserved.",
      taken: "That one's already taken.",
    };
    return { ok: false, error: messages[res.error ?? ""] ?? res.error };
  }

  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  return res;
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

export async function markNotificationRead(id: number): Promise<RpcResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
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
