import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 "proxy" (formerly middleware). Refreshes the Supabase auth session
 * on every matched request and guards protected routes.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
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
