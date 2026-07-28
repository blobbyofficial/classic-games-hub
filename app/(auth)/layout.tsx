import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { SITE } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    /* The ambience is a background gradient rather than blurred divs: the auth
       pages are often the first thing a visitor loads, and a full-viewport blur
       filter is the most expensive thing you can put on a first paint. */
    <div className="relative flex min-h-dvh flex-col bg-aurora">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />

      <header className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md motion-safe:animate-rise">{children}</div>
      </main>

      <footer className="relative z-10 p-6 text-center text-xs text-muted-foreground">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to {SITE.name}
        </Link>
      </footer>
    </div>
  );
}
