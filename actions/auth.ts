"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { emailSchema, passwordSchema, usernameSchema } from "@/lib/validators";

export type AuthState = { error?: string; message?: string } | null;

type OAuthProvider = "google" | "discord" | "github" | "azure";
const oauthProviderSchema = z.enum(["google", "discord", "github", "azure"]);
const INVALID_LOGIN = "Incorrect username/email or password.";
const RESET_SENT = "If that email exists, a reset link is on the way.";

/**
 * A redirect destination comes from user-controlled form data or a server-action
 * argument. Only use local absolute paths. Never allow protocol-relative URLs,
 * backslashes (which browsers can treat as slashes), or control characters.
 * The callback route must independently validate its own `next` parameter too.
 */
function safeNext(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  return value;
}

function stringField(data: FormData, field: string): string {
  const value = data.get(field);
  return typeof value === "string" ? value : "";
}

function loginIdentifier(data: FormData): string {
  const identifier = data.get("identifier") ?? data.get("email");
  return typeof identifier === "string" ? identifier.trim() : "";
}

function validationError(result: { error: { issues: { message: string }[] } }): AuthState {
  return { error: result.error.issues[0]?.message ?? "Invalid input." };
}

/** Begin an OAuth flow with a validated provider and a local return path. */
export async function signInWithOAuth(provider: OAuthProvider, next = "/") {
  const parsedProvider = oauthProviderSchema.safeParse(provider);
  if (!parsedProvider.success) return { error: "Unsupported sign-in provider." };

  const destination = safeNext(next);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsedProvider.data,
    options: {
      redirectTo: `${SITE.url}/auth/callback?next=${encodeURIComponent(destination)}`,
      scopes: parsedProvider.data === "azure" ? "email openid profile" : undefined,
    },
  });

  if (error) return { error: "Could not start sign-in. Please try again." };
  if (!data.url) return { error: "The sign-in provider did not return a redirect URL." };
  redirect(data.url);
}

export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const identifier = loginIdentifier(formData);
  const password = stringField(formData, "password");
  const next = safeNext(formData.get("next"));

  if (!identifier) return { error: "Enter your username or email." };
  if (!password) return { error: "Enter your password." };
  // Bound work and reject implausibly large identifiers before a privileged lookup.
  if (identifier.length > 320 || password.length > 4096) return { error: INVALID_LOGIN };

  let email = identifier;
  if (!emailSchema.safeParse(identifier).success) {
    if (!usernameSchema.safeParse(identifier).success) return { error: INVALID_LOGIN };
    email = (await resolveLoginEmail(identifier)) ?? "";
    if (!email) return { error: INVALID_LOGIN };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: INVALID_LOGIN };

  revalidatePath("/", "layout");

  // Preserve the project's explicit MFA challenge flow. Its route and middleware
  // must independently enforce the required assurance level.
  const hasVerifiedFactor = (data.user.factors ?? []).some((factor) => factor.status === "verified");
  if (hasVerifiedFactor) {
    redirect(next === "/" ? "/two-factor" : `/two-factor?next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

/** Privileged lookup stays server-side. Authorization is handled by the auth API. */
async function resolveLoginEmail(username: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    if (!admin) return null;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (profileError || !profile) return null;

    const { data, error } = await admin.auth.admin.getUserById(profile.id);
    return error ? null : (data.user?.email ?? null);
  } catch (error) {
    console.error("[auth] Username login lookup failed", error);
    return null;
  }
}

export async function signUpWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!email.success) return { error: "Enter a valid email address." };
  if (!password.success) return validationError(password);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { emailRedirectTo: `${SITE.url}/auth/callback` },
  });
  if (error) return { error: "Unable to create an account. Please try again." };

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }
  return { message: "Check your email to confirm your account, then log in." };
}

export async function resetPasswordRequest(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${SITE.url}/auth/callback?next=${encodeURIComponent("/settings/security")}`,
  });
  // Do not reveal whether an account exists. Server-side monitoring should track
  // provider failures separately from the public-facing response.
  if (error) console.error("[auth] Password reset request failed", { code: error.code });
  return { message: RESET_SENT };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return validationError(password);

  const supabase = await createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) return { error: "Sign in before updating your password." };

  // For accounts enrolled in MFA, do not allow an aal1 session to update the
  // password. Password-recovery workflows should be checked separately.
  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || !assurance) return { error: "Could not verify your session. Try again." };
  if (assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    return { error: "Complete two-factor verification before changing your password." };
  }

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "Unable to update your password. Try again." };
  return { message: "Password updated." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Unable to sign out. Please try again.");
  revalidatePath("/", "layout");
  redirect("/");
}
