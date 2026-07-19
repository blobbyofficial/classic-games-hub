import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE } from "@/lib/constants";
import "@/styles/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Play the Classics`, template: `%s · ${SITE.name}` },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster
                position="bottom-right"
                theme="system"
                richColors
                closeButton
                toastOptions={{ classNames: { toast: "glass !border-border" } }}
              />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
