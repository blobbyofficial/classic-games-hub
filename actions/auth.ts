"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { emailSchema, passwordSchema } from "@/lib/validators";
import { SITE } from "@/lib/constants";

export type AuthState = { error?: string; message?: string } | null;

type OAuthProvider = "google" | "discord" | "github" | "azure";

/** Begin an OAuth flow and hand back the provider's redirect URL. */
export async function signInWithOAuth(provider: OAuthProvider, next = "/") {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${SITE.url}/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: provider === "azure" ? "email openid profile" : undefined,
    },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return null;
}

export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  // The login field accepts either an email or a username.
  const identifierRaw = formData.get("identifier") ?? formData.get("email");
  const identifier = typeof identifierRaw === "string" ? identifierRaw.trim() : "";
  const password = z_password(formData.get("password"));
  const next = (formData.get("next") as string) || "/";

  if (!identifier) return { error: "Enter your username or email" };
  if (!password) return { error: "Enter your password" };

  // Resolve a username to its account email server-side (never exposed to the
  // client) when the field isn't already an email address.
  let email = identifier;
  if (!emailSchema.safeParse(identifier).success) {
    const resolved = await resolveLoginEmail(identifier);
    if (!resolved) return { error: "That username or password is incorrect" };
    email = resolved;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");

  // A password alone leaves the session at aal1. If the account has a verified
  // second factor it owes a code before it is worth anything, so send it
  // straight to the challenge - the proxy would bounce it there anyway, and one
  // redirect reads better than two.
  const owesSecondFactor = (data.user?.factors ?? []).some((f) => f.status === "verified");
  if (owesSecondFactor) {
    redirect(next === "/" ? "/two-factor" : `/two-factor?next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

/**
 * Look up the account email for a username using the privileged client, so the
 * mapping never leaves the server. Returns null if the username is unknown or
 * no service key is configured (in which case the user must log in by email).
 */
async function resolveLoginEmail(username: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username) // profiles.username is citext → case-insensitive
    .maybeSingle();
  if (!profile) return null;

  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

export async function signUpWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));

  if (!email.success) return { error: "Enter a valid email address" };
  if (!password.success) return { error: password.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { emailRedirectTo: `${SITE.url}/auth/callback` },
  });
  if (error) return { error: error.message };

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }
  return { message: "Check your email to confirm your account, then log in." };
}

export async function resetPasswordRequest(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${SITE.url}/auth/callback?next=/settings/security`,
  });
  if (error) return { error: error.message };
  return { message: "If that email exists, a reset link is on the way." };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: error.message };
  return { message: "Password updated." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// Tiny helper kept local so the file has no partial-schema import weight.
function z_password(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
