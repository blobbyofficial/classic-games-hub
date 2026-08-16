import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildCsp } from "@/lib/security-headers";

/**
 * Next.js 16 "proxy" (formerly middleware). Refreshes the Supabase auth session
 * on every matched request, guards protected routes, and attaches the CSP.
 */
export async function proxy(request: NextRequest) {
  const { nonce, policy } = buildCsp();

  // Set on the *request* so Next can find the nonce and stamp it onto its own
  // inline scripts. These headers are internal and never reach the browser -
  // which is what keeps this report-only despite naming the enforcing header.
  // See lib/security-headers.ts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = await updateSession(request, requestHeaders);

  // Set on the *response*, so the browser checks the policy and reports what
  // would have been blocked without blocking anything. Promoting to enforcing
  // is renaming this one header.
  response.headers.set("Content-Security-Policy-Report-Only", policy);

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except static assets and images, so the auth cookie is
     * always refreshed before Server Components read the session.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|icons/|games/thumbs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
