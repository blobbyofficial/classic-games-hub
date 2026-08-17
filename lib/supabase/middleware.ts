import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/** Routes that require an authenticated session. */
const PROTECTED_PREFIXES = [
  "/settings",
  "/friends",
  "/messages",
  "/inventory",
  "/notifications",
  "/dashboard",
];

/**
 * Reachable while a session still owes its second factor: being half-logged-in
 * is no reason not to be able to read the privacy policy or check whether the
 * site is down. The way *out* is the sign-out form on /two-factor itself, which
 * posts to /two-factor and so is never caught by the redirect below.
 */
const PUBLIC_WHILE_PENDING = ["/legal", "/status"];

/**
 * Refreshes the Supabase session cookie on every request and enforces auth on
 * protected routes. Must run in middleware so Server Components see fresh auth.
 *
 * `requestHeaders` lets the caller hand down headers the app should see on the
 * way in - the CSP nonce, in practice. It has to be threaded through here
 * rather than applied afterwards because every NextResponse.next() below
 * rebuilds the request, and a header set outside this function would be
 * dropped by the first cookie refresh.
 */
export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const headers = requestHeaders ?? request.headers;
  let response = NextResponse.next({ request: { headers } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser - it refreshes tokens.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Two-factor: a session that owes a second factor is authenticated and still
  // worthless until it clears one, so it is funneled to /two-factor and nothing
  // else. `getAuthenticatorAssuranceLevel()` reads the aal claim out of the
  // access token already in hand and compares it with the factors on the session
  // - no extra round trip, which matters in a proxy that runs on every request.
  if (user && !pathname.startsWith("/auth") && !pathname.startsWith("/api")) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const owesSecondFactor = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";

    if (owesSecondFactor && pathname !== "/two-factor" && !PUBLIC_WHILE_PENDING.some((p) => pathname.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/two-factor";
      if (pathname !== "/") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (!owesSecondFactor && pathname === "/two-factor") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Onboarding / forced username reset: users who owe a free username pick are
  // funneled to /welcome until they choose one; everyone else is kept off it.
  if (user && !pathname.startsWith("/auth") && !pathname.startsWith("/api")) {
    const { data: onboard } = await supabase
      .from("profiles")
      .select("needs_username")
      .eq("id", user.id)
      .single();
    const needsUsername = Boolean(onboard?.needs_username);
    if (needsUsername && pathname !== "/welcome") {
      const url = request.nextUrl.clone();
      url.pathname = "/welcome";
      return NextResponse.redirect(url);
    }
    if (!needsUsername && pathname === "/welcome") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
