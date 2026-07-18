"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  const email = emailSchema.safeParse(formData.get("email"));
  const password = z_password(formData.get("password"));
  const next = (formData.get("next") as string) || "/";

  if (!email.success) return { error: "Enter a valid email address" };
  if (!password) return { error: "Enter your password" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(next);
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
