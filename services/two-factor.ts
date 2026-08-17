import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * What the current session can be told about its own second factor.
 *
 * Factors live in Supabase Auth rather than in a table of ours, so this is an
 * auth-API read wrapped in `cache()` for the same reason the database reads are:
 * the settings page and the login challenge both want it, and neither should
 * pay for it twice in one render.
 */

export interface TwoFactorFactor {
  id: string;
  friendlyName: string | null;
  createdAt: string;
}

export interface TwoFactorState {
  /** A verified TOTP factor exists, so logins ask for a code. */
  enabled: boolean;
  factors: TwoFactorFactor[];
  /** `aal1` until this session has actually cleared the second factor. */
  currentLevel: string | null;
  /** `aal2` once a verified factor exists - i.e. what this session *owes*. */
  nextLevel: string | null;
  recovery: { total: number; remaining: number };
}

export const getTwoFactorState = cache(async (): Promise<TwoFactorState> => {
  const supabase = await createClient();

  const [{ data: factorData }, { data: aal }, { data: recovery }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.rpc("mfa_recovery_status"),
  ]);

  // listFactors() already filters to verified factors on `totp`; a half-finished
  // enrolment is not a second factor and must not make the page claim one.
  const factors = (factorData?.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    createdAt: f.created_at,
  }));

  const counts = (recovery ?? { total: 0, remaining: 0 }) as { total: number; remaining: number };

  return {
    enabled: factors.length > 0,
    factors,
    currentLevel: aal?.currentLevel ?? null,
    nextLevel: aal?.nextLevel ?? null,
    recovery: { total: Number(counts.total ?? 0), remaining: Number(counts.remaining ?? 0) },
  };
});
