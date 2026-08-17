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

  const { data: existing } = await supabase.auth.mfa.listFactors();
  if ((existing?.totp ?? []).length > 0) {
    return { ok: false, error: "Two-factor authentication is already on for this account." };
  }
  for (const stale of (existing?.all ?? []).filter((f) => f.status !== "verified")) {
    await supabase.auth.mfa.unenroll({ factorId: stale.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
    issuer: SITE.name,
  });
  if (error || !data) return { ok: false, error: error?.message ?? "Could not start setup." };

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
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = (data?.all ?? []).find((f) => f.id === factorId);
  // Only ever cancels something unverified - this must not become a way to
  // remove a working factor without a code.
  if (factor && factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId });
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
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return { ok: false, error: "Enter the 6-digit code from your app." };

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
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
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
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return { error: "Enter the 6-digit code from your app." };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp ?? [];
  if (totp.length === 0) return { error: "Two-factor authentication is already off." };

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totp[0].id,
    code: digits,
  });
  if (verifyError) return { error: friendlyVerifyError(verifyError.message) };

  for (const factor of totp) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { error: error.message };
  }
  await supabase.rpc("mfa_recovery_clear");

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { message: "Two-factor authentication is off." };
}

/**
 * Clear the login challenge. Called from /two-factor, where the session is
 * authenticated but still `aal1` and therefore useless until this succeeds.
 */
export async function verifyTwoFactorChallenge(code: string): Promise<TwoFactorState> {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return { error: "Enter the 6-digit code from your app." };

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: listError.message };

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
  const normalised = normaliseRecoveryCode(code);
  if (normalised.length < 8) return { error: "Enter one of your recovery codes." };

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
  if (error) return { error: error.message };
  const message = recoveryError(data as Envelope | null);
  if (message) return { error: message };

  const { data: factorList } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  for (const factor of factorList?.factors ?? []) {
    await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user.id });
  }
  // The remaining codes go too: they were minted for a factor that no longer
  // exists, and leaving them is a second door onto a door that has been removed.
  await supabase.rpc("mfa_recovery_clear");

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
  if (error) return { ok: false, error: error.message };
  const env = data as Envelope | null;
  if (!env?.ok) return { ok: false, error: env?.error ?? "unknown error" };
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
  return message;
}
