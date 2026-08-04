"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_POLICY_VERSION,
  globalPrivacyControl,
  parseConsent,
  serialiseConsent,
  type ConsentChoice,
} from "@/lib/consent";

/**
 * Holds the consent decision, and mounts the optional scripts only once it is
 * granted.
 *
 * The gating is structural rather than a flag inside the analytics components:
 * `<Analytics />` is not rendered at all until consent exists, so there is no
 * path where it loads first and is told to be quiet afterwards. "Loaded but
 * disabled" is not the same as "not loaded", and only one of them is what was
 * asked for.
 *
 * The initial value is read from the cookie synchronously on mount, so a
 * returning visitor never sees the banner flash before it is dismissed.
 */

interface ConsentContext {
  choice: ConsentChoice | null;
  /** True once we know the answer - decided or explicitly not yet asked. */
  ready: boolean;
  save: (analytics: boolean) => void;
  /** Re-opens the banner, for the "change your mind" link in Settings. */
  reopen: () => void;
}

const Ctx = createContext<ConsentContext>({
  choice: null,
  ready: false,
  save: () => {},
  reopen: () => {},
});

export const useConsent = () => useContext(Ctx);

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [ready, setReady] = useState(false);

  const persist = useCallback((analytics: boolean) => {
    // Signed-out visitors still need a subject for the durable record. Random
    // and stored only alongside the choice itself - it identifies a decision,
    // not a person, and is never joined to anything else.
    const existing = parseConsent(readCookie(CONSENT_COOKIE));
    const aid = existing?.aid ?? (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
    const next: ConsentChoice = { analytics, v: CONSENT_POLICY_VERSION, aid };

    document.cookie = [
      `${CONSENT_COOKIE}=${serialiseConsent(next)}`,
      `Max-Age=${CONSENT_MAX_AGE}`,
      "Path=/",
      "SameSite=Lax",
      location.protocol === "https:" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");

    setChoice(next);

    // The durable record is best-effort and deliberately not awaited by the UI:
    // the choice is already in effect from the cookie, and a failed write must
    // never leave someone stuck at a banner they have answered.
    void import("@/lib/supabase/client").then(({ createClient }) =>
      createClient()
        .rpc("record_consent", {
          p_analytics: analytics,
          p_anonymous_id: aid,
          p_policy_version: CONSENT_POLICY_VERSION,
        })
        .then(({ error }) => {
          if (error) console.warn("[consent] record failed:", error.message);
        }),
    );
  }, []);

  useEffect(() => {
    const existing = parseConsent(readCookie(CONSENT_COOKIE));
    if (existing) {
      setChoice(existing);
      setReady(true);
      return;
    }
    // A browser-level refusal is an answer. Record it as a refusal rather than
    // asking again - the signal exists precisely so people are not asked.
    if (globalPrivacyControl()) persist(false);
    setReady(true);
  }, [persist]);

  const reopen = useCallback(() => setChoice(null), []);

  return (
    <Ctx.Provider value={{ choice, ready, save: persist, reopen }}>
      {children}
      {choice?.analytics && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </Ctx.Provider>
  );
}
