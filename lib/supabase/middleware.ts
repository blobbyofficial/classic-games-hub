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
 * Refreshes the Supabase session cookie on every request and enforces auth on
 * protected routes. Must run in middleware so Server Components see fresh auth.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
