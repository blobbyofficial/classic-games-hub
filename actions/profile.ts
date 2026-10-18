"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema, settingsSchema, usernameSchema } from "@/lib/validators";
import type { RpcResult } from "@/types";

const AUTH_ERROR = "Sign in to continue.";
const SAVE_ERROR = "Couldn't save your changes. Please try again.";
const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const notificationIdSchema = z.number().int().positive().safe();
const styleSchema = z.string().trim().max(80).regex(/^[a-zA-Z0-9_-]*$/);
const colourSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const profileUrlSchema = z.string().url().max(2048).refine((value) => {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Use a valid HTTPS URL.");

function invalid(schema: z.ZodTypeAny, value: unknown, message = "Invalid input."): string | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? message);
}

async function authenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

function refreshProfile() {
  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  revalidatePath("/", "layout");
}

function logFailure(action: string, error: { code?: string; message?: string } | null) {
  console.error(`[profile] ${action} failed`, { code: error?.code, message: error?.message });
}

function rpcResult(value: unknown): RpcResult {
  if (!value || typeof value !== "object" || typeof (value as { ok?: unknown }).ok !== "boolean") {
    return { ok: false, error: SAVE_ERROR };
  }
  return value as RpcResult;
}

export async function updateProfile(input: {
  display_name?: string;
  bio?: string;
  pronouns?: string;
  status_text?: string;
  favourite_game_slug?: string;
}): Promise<RpcResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile." };
  // Only write fields explicitly provided. Partial edits must not erase other fields.
  const patch: { display_name?: string | null; bio?: string | null; pronouns?: string | null; status_text?: string | null; favourite_game_slug?: string | null } = {};
  for (const key of ["display_name", "bio", "pronouns", "status_text", "favourite_game_slug"] as const) {
    const value = parsed.data[key];
    if (value !== undefined) patch[key] = value === "" ? null : value;
  }
  if (!Object.keys(patch).length) return { ok: true };
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { error } = await auth.supabase.from("profiles").update(patch).eq("id", auth.user.id);
  if (error) { logFailure("updateProfile", error); return { ok: false, error: SAVE_ERROR }; }
  refreshProfile();
  return { ok: true };
}

/** NOTE: The read-modify-write of equipped can race with other equipment actions.
 * Move this patch into an atomic SQL RPC before production deployment. */
async function updateEquipped(field: "name_style" | "banner", value: string | null): Promise<RpcResult> {
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { data, error: readError } = await auth.supabase.from("profiles")
    .select("equipped").eq("id", auth.user.id).single();
  if (readError || !data) { logFailure("readEquipped", readError); return { ok: false, error: SAVE_ERROR }; }
  const current = data.equipped;
  if (current !== null && (typeof current !== "object" || Array.isArray(current))) {
    return { ok: false, error: "Your equipment data is invalid. Contact support." };
  }
  const equipped: Record<string, string> = {};
  for (const [key, entry] of Object.entries((current ?? {}) as Record<string, unknown>)) {
    if (typeof entry !== "string") return { ok: false, error: "Your equipment data is invalid. Contact support." };
    equipped[key] = entry;
  }
  if (value === null) delete equipped[field];
  else equipped[field] = value;
  const { error } = await auth.supabase.from("profiles")
    .update({ equipped }).eq("id", auth.user.id);
  if (error) { logFailure("updateEquipped", error); return { ok: false, error: SAVE_ERROR }; }
  refreshProfile();
  return { ok: true, equipped };
}

export async function setNameStyle(style: string): Promise<RpcResult> {
  const issue = invalid(styleSchema, style);
  if (issue) return { ok: false, error: issue };
  const trimmed = style.trim();
  return updateEquipped("name_style", trimmed && trimmed !== "none" ? trimmed : null);
}

export async function setBannerColor(color: string | null): Promise<RpcResult> {
  if (color !== null && color !== "") {
    const issue = invalid(colourSchema, color);
    if (issue) return { ok: false, error: "Use a six-digit hex colour, for example #336699." };
  }
  return updateEquipped("banner", color || null);
}

export async function setShowcase(slugs: string[]): Promise<RpcResult> {
  const parsed = z.array(slugSchema).max(4).safeParse(slugs);
  if (!parsed.success) return { ok: false, error: "Choose up to four valid game slugs." };
  const clean = [...new Set(parsed.data)];
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { error } = await auth.supabase.from("profiles").update({ showcase: clean }).eq("id", auth.user.id);
  if (error) { logFailure("setShowcase", error); return { ok: false, error: SAVE_ERROR }; }
  refreshProfile();
  return { ok: true };
}

export async function setFeaturedAchievement(slug: string | null): Promise<RpcResult> {
  if (slug !== null && invalid(slugSchema, slug)) return { ok: false, error: "Invalid achievement." };
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { error } = await auth.supabase.from("profiles")
    .update({ featured_achievement: slug }).eq("id", auth.user.id);
  if (error) { logFailure("setFeaturedAchievement", error); return { ok: false, error: SAVE_ERROR }; }
  refreshProfile();
  return { ok: true };
}

export async function updateSettings(input: Record<string, unknown>): Promise<RpcResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { error } = await auth.supabase.from("user_settings")
    .update(parsed.data).eq("user_id", auth.user.id);
  if (error) {
    // An older database migration still rejecting Halloween is an operational
    // schema mismatch, not a generic network/save error. Give an actionable
    // message while the repair migration is applied.
    if (parsed.data.site_theme === "halloween" &&
        (error.message.includes("invalid_theme") ||
         error.message.includes("Unknown site theme") ||
         error.code === "23514")) {
      logFailure("updateSettings.halloween-schema", error);
      return { ok: false, error: "Halloween is not enabled in the database yet. Apply the theme migration." };
    }
    if (error.message.includes("boosters and staff")) {
      return { ok: false, error: "That theme is for server boosters and staff." };
    }
    logFailure("updateSettings", error);
    return { ok: false, error: SAVE_ERROR };
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

async function usernameRpc(next: string, procedure: "change_username" | "set_username"): Promise<RpcResult> {
  const parsed = usernameSchema.safeParse(next);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid username." };
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await auth.supabase.rpc(procedure, { p_new: parsed.data });
  if (error) { logFailure(procedure, error); return { ok: false, error: SAVE_ERROR }; }
  const result = rpcResult(data);
  if (result.ok) refreshProfile();
  return result;
}

export async function changeUsername(next: string): Promise<RpcResult> {
  return usernameRpc(next, "change_username");
}

export async function chooseUsername(next: string): Promise<RpcResult> {
  return usernameRpc(next, "set_username");
}

export async function setVanitySlug(slug: string): Promise<RpcResult> {
  if (typeof slug !== "string" || slug.length > 100) return { ok: false, error: "Invalid vanity URL." };
  const value = slug.trim();
  if (value && !/^[a-zA-Z0-9_-]{3,24}$/.test(value)) {
    return { ok: false, error: "Use 3–24 characters: letters, numbers, hyphens or underscores." };
  }
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await auth.supabase.rpc("set_vanity_slug", { p_slug: value || null });
  if (error) { logFailure("setVanitySlug", error); return { ok: false, error: SAVE_ERROR }; }
  const result = rpcResult(data);
  if (!result.ok) {
    const messages: Record<string, string> = {
      not_eligible: "Vanity URLs unlock at level 30, or by boosting the Discord server.",
      bad_format: "Use 3–24 characters: letters, numbers, hyphens or underscores.",
      reserved: "That one's reserved.",
      taken: "That one's already taken.",
    };
    return { ok: false, error: messages[result.error ?? ""] ?? "Couldn't set that vanity URL." };
  }
  refreshProfile();
  return result;
}

async function setMediaUrl(field: "avatar_url" | "banner_url", url: string | null): Promise<RpcResult> {
  if (url !== null && invalid(profileUrlSchema, url)) {
    return { ok: false, error: "Use a valid HTTPS image URL." };
  }
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  // IMPORTANT: URL syntax is not proof of ownership. Prefer an upload ID +
  // server-side ownership check; see migration notes accompanying this file.
  const { error } = await auth.supabase.from("profiles").update(field === "avatar_url" ? { avatar_url: url } : { banner_url: url }).eq("id", auth.user.id);
  if (error) { logFailure("setMediaUrl", error); return { ok: false, error: SAVE_ERROR }; }
  refreshProfile();
  return { ok: true };
}

export async function setAvatarUrl(url: string | null): Promise<RpcResult> {
  return setMediaUrl("avatar_url", url);
}
export async function setBannerUrl(url: string | null): Promise<RpcResult> {
  return setMediaUrl("banner_url", url);
}

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const FILE_TYPES = {
  "image/jpeg": { ext: "jpg", magic: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { ext: "png", magic: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a },
  "image/webp": { ext: "webp", magic: (bytes: Uint8Array) => String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP" },
} as const;

/** Upload a restricted raster image and point this user's profile at it. */
export async function uploadUserMedia(bucket: "avatars" | "banners", file: File): Promise<RpcResult> {
  if (bucket !== "avatars" && bucket !== "banners") return { ok: false, error: "Invalid media destination." };
  if (!file || typeof file.arrayBuffer !== "function" || typeof file.size !== "number") {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "Choose an image smaller than 4 MB." };
  }
  const typeInfo = FILE_TYPES[file.type as keyof typeof FILE_TYPES];
  if (!typeInfo) return { ok: false, error: "Only JPEG, PNG and WebP images are supported." };
  let head: Uint8Array;
  try { head = new Uint8Array(await file.slice(0, 12).arrayBuffer()); }
  catch { return { ok: false, error: "Couldn't read the image." }; }
  if (head.length < 12 || !typeInfo.magic(head)) {
    return { ok: false, error: "The file doesn't match its image format." };
  }

  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { supabase, user } = auth;
  const path = `${user.id}/${randomUUID()}.${typeInfo.ext}`;
  const storage = supabase.storage.from(bucket);
  const { error: uploadError } = await storage.upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) { logFailure("uploadMedia", uploadError); return { ok: false, error: "Image upload failed. Please try again." }; }

  const { data } = storage.getPublicUrl(path);
  const field = bucket === "avatars" ? "avatar_url" : "banner_url";
  const { error } = await supabase.from("profiles").update(field === "avatar_url" ? { avatar_url: data.publicUrl } : { banner_url: data.publicUrl }).eq("id", user.id);
  if (error) {
    logFailure("saveUploadedMedia", error);
    const { error: cleanupError } = await storage.remove([path]);
    if (cleanupError) logFailure("cleanupUploadedMedia", cleanupError);
    return { ok: false, error: "Image uploaded, but couldn't update your profile. Please retry." };
  }
  refreshProfile();
  return { ok: true, url: data.publicUrl };
}

export async function markNotificationRead(id: number): Promise<RpcResult> {
  if (invalid(notificationIdSchema, id)) return { ok: false, error: "Invalid notification." };
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { error } = await auth.supabase.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", auth.user.id).is("read_at", null);
  if (error) { logFailure("markNotificationRead", error); return { ok: false, error: SAVE_ERROR }; }
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  return { ok: true };
}

export async function markNotificationsRead(): Promise<RpcResult> {
  const auth = await authenticated();
  if (!auth) return { ok: false, error: AUTH_ERROR };
  const { error } = await auth.supabase.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", auth.user.id).is("read_at", null);
  if (error) { logFailure("markNotificationsRead", error); return { ok: false, error: SAVE_ERROR }; }
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  return { ok: true };
}
