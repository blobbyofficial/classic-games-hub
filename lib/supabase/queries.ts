import { cache } from "react";
import { createClient } from "./server";
import type { Profile, UserSettings } from "@/types";

/**
 * Server-side auth + profile helpers. Wrapped in React `cache` so multiple
 * components in one render share a single round-trip.
 */

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
});

export const getCurrentSettings = cache(async (): Promise<UserSettings | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
  return data;
});

export const getFeatureFlags = cache(async (): Promise<Record<string, boolean>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("feature_flags").select("key, enabled");
  return Object.fromEntries((data ?? []).map((f) => [f.key, f.enabled]));
});

export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return count ?? 0;
});

export async function requireStaff(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    throw new Error("forbidden");
  }
  return profile;
}
