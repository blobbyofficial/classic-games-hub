import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ConsentProvider } from "@/components/providers/consent-provider";
import { ConsentBanner } from "@/components/consent-banner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cookies } from "next/headers";
import { SITE } from "@/lib/constants";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { getCurrentSettings } from "@/lib/supabase/queries";
import { SITE_THEME_IDS } from "@/lib/themes";
import "@/styles/globals.css";

// `display: swap` shows the fallback immediately rather than blocking first
// paint on a slow connection; `preload` on the body face only - the mono face
// is used in a handful of small labels and isn't worth a render-blocking hint.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
  adjustFontFallback: true,
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} - Play the Classics`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: SITE.shortName },
  openGraph: {
    type: "website",
    title: SITE.name,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
  },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#151320" },
    { media: "(prefers-color-scheme: light)", color: "#faf9fc" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Apply the player's global colour theme before first paint (no flash).
  // Signed-out visitors always get the default theme, so skip the auth
  // round-trip entirely unless a Supabase session cookie is actually present -
  // that keeps anonymous traffic (and 404s) off the auth endpoint.
  const cookieStore = await cookies();
  const hasSession = cookieStore.getAll().some((c) => /^sb-.*auth-token/.test(c.name));
  const settings = hasSession ? await getCurrentSettings().catch(() => null) : null;
  const rawTheme = (settings as { site_theme?: string } | null)?.site_theme ?? "default";
  const siteTheme = SITE_THEME_IDS.has(rawTheme) ? rawTheme : "default";

  // Reduced motion has to land on the server-rendered html tag: applying it
  // after hydration would mean the animations play once before being switched
  // off, which is the opposite of what the setting is for.
  const reducedMotion = Boolean((settings as { reduced_motion?: boolean } | null)?.reduced_motion);

  const supabaseOrigin = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-site-theme={siteTheme}
      data-reduced-motion={reducedMotion ? "true" : undefined}
    >
      <head>
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {/* Site-wide identity, on every page so no single page has to be the one
            Google indexes for it to resolve. Both carry a stable @id, which is
            what lets the per-page blocks reference the publisher instead of
            restating it. */}
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <ConsentProvider>
          <ThemeProvider>
            <TooltipProvider delayDuration={250} skipDelayDuration={400}>
              {children}
              <Toaster
                // Above the mobile tab bar on phones, bottom-right everywhere else.
                position="bottom-right"
                theme="system"
                richColors
                closeButton
                gap={10}
                offset={16}
                mobileOffset={{ bottom: 84, left: 12, right: 12 }}
                toastOptions={{ classNames: { toast: "glass !border-border !rounded-xl" } }}
              />
            </TooltipProvider>
          </ThemeProvider>
          <ConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
