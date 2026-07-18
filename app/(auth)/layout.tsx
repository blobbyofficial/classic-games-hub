import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { SITE } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-grid">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 size-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 size-96 rounded-full bg-[oklch(0.7_0.18_330)]/15 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="relative z-10 p-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← Back to {SITE.name}
        </Link>
      </footer>
    </div>
  );
}
