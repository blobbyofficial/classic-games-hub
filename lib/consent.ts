/**
 * Cookie consent - the shared vocabulary, usable from client and server.
 *
 * Deliberately tiny and dependency-free. This is read on the very first paint,
 * before anything else has loaded, because the whole point is that nothing
 * optional runs until a choice exists.
 *
 * Nothing here is legal advice. The mechanics follow GDPR/PECR as best we
 * understand them - no non-essential storage before consent, refusal as easy as
 * acceptance, a durable record, and a way to change your mind - but the policy
 * wording needs review by someone qualified before launch.
 */

/** Bump when the policy changes in a way that widens what is collected. */
export const CONSENT_POLICY_VERSION = 1;

export const CONSENT_COOKIE = "cgh_consent";

/** A year. Long enough not to nag, short enough that consent is refreshed. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export interface ConsentChoice {
  /** Vercel Analytics and Speed Insights. */
  analytics: boolean;
  /** Which policy version was shown when this was decided. */
  v: number;
  /** Stable id for a signed-out visitor, so their record has a subject. */
  aid?: string;
}

/**
 * Strictly-necessary is not a category anyone is asked about, and that is not
 * an oversight: session and auth cookies are required to deliver a service the
 * user asked for, so consent for them is neither required nor meaningful. Only
 * genuinely optional things belong in the banner.
 */
export const ESSENTIAL_COOKIES = [
  { name: "sb-*-auth-token", purpose: "Keeps you signed in.", provider: "Supabase" },
  { name: CONSENT_COOKIE, purpose: "Remembers this very choice.", provider: "Classic Games Hub" },
  { name: "theme", purpose: "Remembers light or dark mode.", provider: "Classic Games Hub" },
] as const;

export const ANALYTICS_COOKIES = [
  {
    name: "No cookies set",
    purpose:
      "Vercel Analytics and Speed Insights count page views and measure load speed. They are cookieless and do not identify you, but they are still optional and off until you say otherwise.",
    provider: "Vercel",
  },
] as const;

/** Parses the cookie value. Anything unreadable is treated as "not asked yet". */
export function parseConsent(raw: string | undefined | null): ConsentChoice | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentChoice>;
    if (typeof parsed?.analytics !== "boolean") return null;
    // A consent given against an older policy is not consent to the new one.
    if (parsed.v !== CONSENT_POLICY_VERSION) return null;
    return { analytics: parsed.analytics, v: parsed.v, aid: parsed.aid };
  } catch {
    return null;
  }
}

export function serialiseConsent(choice: ConsentChoice): string {
  return encodeURIComponent(JSON.stringify(choice));
}

/**
 * Whether the browser is signalling a blanket refusal.
 *
 * Global Privacy Control is a legally recognised opt-out signal in several
 * jurisdictions, so honouring it is not a courtesy: showing someone a banner
 * after they have already refused at the browser level, and treating a stray
 * click as consent, is exactly what it exists to prevent.
 */
export function globalPrivacyControl(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}
