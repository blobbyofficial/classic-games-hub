"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  normaliseRecoveryCode,
} from "@/lib/two-factor";

/**
 * Two-factor authentication: enrolling an authenticator app, clearing the
 * challenge at login, and getting back in with a recovery code.
 *
 * The factor itself is Supabase Auth's TOTP MFA, so nothing here stores a
 * secret or checks a six-digit code by hand - `auth.mfa.*` does both, and the
 * `aal2` claim it puts in the access token is the thing the proxy trusts.
 * Recovery codes are ours (0076) because Supabase has none.
 *
 * Two rules shape the whole file:
 *
 *   - **Enrolling is not enabling.** A factor is `unverified` until a code from
 *     the app has been accepted, and an unverified factor must never make the
 *     site ask for a code at login. Supabase enforces this; we make sure a
 *     half-finished attempt is cleaned up rather than left lying around.
 *   - **Turning it off costs a code.** Disabling asks for the authenticator
 *     again, so a borrowed session cannot quietly remove the protection.
 */

export type TwoFactorState = { error?: string; message?: string } | null;

/** What the client needs to render an enrolment: the QR, and the secret to type. */
export interface EnrollmentStart {
  factorId: string;
  /** Ready-to-use SVG data URL, so the dialog needs no QR library. */
  qr: string;
  secret: string;
  uri: string;
}

type Envelope = { ok?: boolean; error?: string; remaining?: number };

const factorIdValid = (id: unknown): id is string =>
  typeof id === "string" && /^[a-zA-Z0-9-]{1,128}$/.test(id);

function totpCode(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 32) return null;
  const code = value.trim();
  return /^\d{6}$/.test(code) ? code : null;
}

function publicAuthError(context: string, error: unknown): string {
  console.error(`[mfa] ${context}`, error);
  return "Could not complete the request. Try again.";
}

function validEnvelope(value: unknown): value is Envelope {
  return typeof value === "object" && value !== null &&
    typeof (value as Envelope).ok === "boolean";
}

/** RPC envelope → a sentence, for the handful of errors 0076 can return. */
function recoveryError(env: Envelope | null): string | null {
  if (env?.ok) return null;
  switch (env?.error) {
    case "unknown_code":
      return "That recovery code is not one of yours.";
    case "code_already_used":
      return "That recovery code has already been used.";
    case "not_authenticated":
      return "Log in again, then retry.";
    default:
      return "Could not check that recovery code. Try again.";
  }
}

/**
 * Begin enrolling an authenticator app.
 *
 * Any earlier unverified factor is dropped first: a person who opens the dialog,
 * wanders off, and comes back tomorrow would otherwise collect dead factors and
 * eventually hit Supabase's friendly-name conflict for no visible reason.
 */
export async function startTwoFactorEnrollment(): Promise<
  { ok: true; enrollment: EnrollmentStart } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Log in again, then retry." };

  const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError || !existing) return { ok: false, error: publicAuthError("list factors before enrollment", listError) };
  if ((existing.totp ?? []).length > 0) {
    return { ok: false, error: "Two-factor authentication is already on for this account." };
  }
  for (const stale of (existing?.all ?? []).filter((f) => f.status !== "verified")) {
    const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId: stale.id });
    if (cleanupError) return { ok: false, error: publicAuthError("remove stale enrollment", cleanupError) };
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
    issuer: SITE.name,
  });
  if (error || !data) return { ok: false, error: publicAuthError("enroll", error) };

  return {
    ok: true,
    enrollment: {
      factorId: data.id,
      qr: svgDataUrl(data.totp.qr_code),
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
  };
}

/**
 * Turn whatever Supabase gave us for `totp.qr_code` into an `<img>`-able data
 * URL, always base64.
 *
 * The field's shape is not stable across versions and the documentation
 * describes both: the type says "convert it to a URL by prepending
 * `data:image/svg+xml;utf-8,`", while the official React example passes the
 * value straight into `src`. It is currently the second - already a data URL -
 * and blindly base64-encoding it produced a data URL whose payload decoded to
 * the *text* `data:image/svg+xml;utf-8,<svg…>`, which is not an image. That is
 * why the QR did not render.
 *
 * So detect rather than assume, and re-encode as base64 either way: the
 * `;utf-8,` form carries raw `<`, `#` and `"` in a URL, where `#` truncates it
 * at the first colour literal.
 */
function svgDataUrl(qrCode: string): string {
  const value = qrCode.trim();
  const asBase64 = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;

  if (!value.startsWith("data:")) return asBase64(value);

  const comma = value.indexOf(",");
  if (comma === -1) return asBase64(value);

  const mediaType = value.slice(5, comma);
  const payload = value.slice(comma + 1);
  if (/;base64$/i.test(mediaType)) return value;

  // A `;utf-8,` payload may or may not be percent-encoded; decoding a string
  // with a bare `%` throws, and the raw markup is the right answer then.
  let svg = payload;
  try {
    svg = decodeURIComponent(payload);
  } catch {
    // Not percent-encoded - use it as it came.
  }
  return asBase64(svg);
}

/** Abandon an in-progress enrolment, so closing the dialog leaves nothing behind. */
export async function cancelTwoFactorEnrollment(factorId: string): Promise<void> {
  if (!factorIdValid(factorId)) return;
  const supabase = await createClient();
  const { data, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) { publicAuthError("list factors for cancellation", listError); return; }
  const factor = (data?.all ?? []).find((f) => f.id === factorId);
  // Only ever cancels something unverified - this must not become a way to
  // remove a working factor without a code.
  if (factor && factor.status !== "verified") {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) publicAuthError("cancel enrollment", error);
  }
}

/**
 * Finish enrolling: accept the first code from the app, then issue recovery
 * codes. The codes come back in the response and are never readable again -
 * only their hashes reach the database.
 */
export async function confirmTwoFactorEnrollment(
  factorId: string,
  code: string,
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  const digits = totpCode(code);
  if (!digits) return { ok: false, error: "Enter the 6-digit code from your app." };
  if (!factorIdValid(factorId)) return { ok: false, error: "Invalid authenticator enrollment." };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: digits });
  if (error) return { ok: false, error: friendlyVerifyError(error.message) };

  const codes = await issueRecoveryCodes(supabase);
  if (!codes.ok) {
    // The factor is live and the session is aal2 either way; say so plainly
    // rather than pretending setup failed and leaving the two disagreeing.
    return { ok: false, error: `Two-factor is on, but recovery codes could not be created: ${codes.error}` };
  }

  revalidatePath("/settings");
  return { ok: true, recoveryCodes: codes.codes };
}

/**
 * Replace the recovery codes for an account that already has 2FA on. The old
 * set stops working immediately, which is the point.
 */
export async function regenerateRecoveryCodes(): Promise<
  { ok: true; recoveryCodes: string[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: aal, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) return { ok: false, error: publicAuthError("check assurance", assuranceError) };
  if (aal?.currentLevel !== "aal2") {
    return { ok: false, error: "Enter a code from your authenticator app first." };
  }

  const codes = await issueRecoveryCodes(supabase);
  if (!codes.ok) return { ok: false, error: codes.error };

  revalidatePath("/settings");
  return { ok: true, recoveryCodes: codes.codes };
}

/** Turn 2FA off. Costs a current code, and takes the recovery codes with it. */
export async function disableTwoFactor(code: string): Promise<TwoFactorState> {
  const digits = totpCode(code);
  if (!digits) return { error: "Enter the 6-digit code from your app." };

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: publicAuthError("list factors for disable", listError) };
  const totp = factors?.totp ?? [];
  if (totp.length === 0) return { error: "Two-factor authentication is already off." };

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totp[0].id,
    code: digits,
  });
  if (verifyError) return { error: friendlyVerifyError(verifyError.message) };

  for (const factor of totp) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { error: publicAuthError("unenroll factor", error) };
  }
  const { data: clearData, error: clearError } = await supabase.rpc("mfa_recovery_clear");
  if (clearError || (validEnvelope(clearData) && !clearData.ok)) {
    return { error: "Authenticator disabled, but recovery-code cleanup failed. Contact support before using recovery codes." };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { message: "Two-factor authentication is off." };
}

/**
 * Clear the login challenge. Called from /two-factor, where the session is
 * authenticated but still `aal1` and therefore useless until this succeeds.
 */
export async function verifyTwoFactorChallenge(code: string): Promise<TwoFactorState> {
  const digits = totpCode(code);
  if (!digits) return { error: "Enter the 6-digit code from your app." };

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: publicAuthError("list challenge factors", listError) };

  const totp = factors?.totp ?? [];
  if (totp.length === 0) return { error: "This account has no authenticator app set up." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp[0].id, code: digits });
  if (error) return { error: friendlyVerifyError(error.message) };

  revalidatePath("/", "layout");
  return { message: "Verified." };
}

/**
 * Get back in with a recovery code.
 *
 * A recovery code cannot raise a session to `aal2` - only the factor can - so it
 * does the other thing that unblocks the account: it spends the code and then
 * removes the factor, which drops what the session *owes* back to `aal1`. The
 * user lands signed in with 2FA off and is told to set it up again.
 *
 * Removing a verified factor is an `aal2` action, so it goes through the auth
 * admin API. Without a service key there is no way to do it, and saying so is
 * better than burning the code for nothing.
 */
export async function useRecoveryCode(code: string): Promise<TwoFactorState> {
  if (typeof code !== "string" || code.length > 128)
    return { error: "Enter one of your recovery codes." };
  const normalised = normaliseRecoveryCode(code);
  if (normalised.length < 8 || normalised.length > 64)
    return { error: "Enter one of your recovery codes." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Log in again, then retry." };

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Recovery is unavailable on this deployment. Contact support to reset 2FA." };
  }

  const { data, error } = await supabase.rpc("mfa_recovery_consume", {
    p_hash: hashRecoveryCode(normalised),
  });
  if (error) return { error: publicAuthError("consume recovery code", error) };
  if (!validEnvelope(data)) return { error: "Could not verify the recovery code. Contact support if it was already used." };
  const message = recoveryError(data);
  if (message) return { error: message };

  const { data: factorList, error: factorsError } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  if (factorsError || !factorList) {
    return { error: "Recovery code was used, but authenticator removal failed. Contact support; do not retry with another code." };
  }
  for (const factor of factorList.factors ?? []) {
    // Never silently claim that recovery succeeded if Supabase rejected deletion.
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user.id });
    if (deleteError) {
      console.error("[mfa] admin factor removal failed", deleteError);
      return { error: "Recovery code was used, but authenticator removal was incomplete. Contact support; do not retry with another code." };
    }
  }
  // The remaining codes go too: they were minted for a factor that no longer
  // exists, and leaving them is a second door onto a door that has been removed.
  const { data: clearData, error: clearError } = await supabase.rpc("mfa_recovery_clear");
  if (clearError || (validEnvelope(clearData) && !clearData.ok)) {
    return { error: "Authenticator removed, but recovery-code cleanup failed. Contact support." };
  }

  revalidatePath("/", "layout");
  return {
    message:
      "Recovery code accepted. Two-factor authentication has been turned off - set it up again from Settings → Security.",
  };
}

/** Mint a set, hash it, store the hashes, hand back the plaintext once. */
async function issueRecoveryCodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ ok: true; codes: string[] } | { ok: false; error: string }> {
  const codes = generateRecoveryCodes();
  const { data, error } = await supabase.rpc("mfa_recovery_replace", {
    p_hashes: codes.map((c) => hashRecoveryCode(c)),
  });
  if (error) return { ok: false, error: publicAuthError("replace recovery codes", error) };
  if (!validEnvelope(data) || !data.ok) return { ok: false, error: "Could not save recovery codes." };
  return { ok: true, codes };
}

/**
 * Supabase's TOTP errors are accurate and unhelpful ("Invalid TOTP code
 * entered"). The clock-drift hint is worth saying because it is the cause
 * people cannot guess.
 */
function friendlyVerifyError(message: string): string {
  if (/invalid.*(totp|code)/i.test(message)) {
    return "That code is not right. Codes last 30 seconds - check your phone's clock is set automatically.";
  }
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Wait a minute and try again.";
  console.error("[mfa] verification failed:", message);
  return "Could not verify the code. Try again.";
}
