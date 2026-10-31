import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "./logo";
import { SITE } from "@/lib/constants";

const FOOTER_LINKS = [
  { label: "Games", href: "/games" },
  { label: "Updates", href: "/updates" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Status", href: "/status" },
  { label: "Discord", href: SITE.discord, external: true },
  { label: "Founder", href: SITE.founder, external: true },
] as const;

const LEGAL_LINKS = [
  { label: "Terms", href: "/legal/terms" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Cookies", href: "/legal/cookies" },
] as const;

export function Footer() {
  return (
    <footer className="halloween-footer mt-12 border-t border-border/70 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="max-w-sm space-y-2">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Play classic games, earn rewards and connect with friends.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <ul className="flex max-w-xl flex-wrap gap-x-5 gap-y-3 text-sm">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    target={"external" in link ? "_blank" : undefined}
                    rel={"external" in link ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground focus-visible:underline"
                  >
                    {link.label}
                    {"external" in link && <ExternalLink className="size-3" aria-hidden="true" />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col gap-3 border-t border-border/60 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name} · Built by BlobbyOfficial</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground focus-visible:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
