import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "./logo";
import { DiscordIcon } from "@/components/icons";
import { SITE } from "@/lib/constants";

const LINKS = {
  Platform: [
    { label: "Games", href: "/games" },
    { label: "Leaderboards", href: "/leaderboards" },
    { label: "Shop", href: "/shop" },
    { label: "Achievements", href: "/achievements" },
  ],
  Community: [
    { label: "Party", href: "/party" },
    { label: "Friends", href: "/friends" },
    { label: "Challenges", href: "/challenges" },
    { label: "Roadmap", href: "/roadmap" },
    { label: "Status", href: "/status" },
    { label: "Discord", href: SITE.discord, external: true },
    { label: "Founder", href: SITE.founder, external: true },
  ],
  Account: [
    { label: "Sign up", href: "/register" },
    { label: "Log in", href: "/login" },
    { label: "Settings", href: "/settings" },
    { label: "Inventory", href: "/inventory" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/legal/terms" },
    { label: "Privacy Policy", href: "/legal/privacy" },
  ],
};

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-muted/20">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{SITE.description}</p>
          <a
            href={SITE.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#5865F2] hover:underline"
          >
            <DiscordIcon className="size-4" /> Join our Discord
          </a>
        </div>
        {Object.entries(LINKS).map(([heading, links]) => (
          <div key={heading}>
            <h3 className="mb-3 text-sm font-semibold">{heading}</h3>
            <ul className="space-y-2 text-sm">
              {links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    target={"external" in l && l.external ? "_blank" : undefined}
                    rel={"external" in l && l.external ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                    {"external" in l && l.external && <ExternalLink className="size-3" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE.name}. Built by{" "}
        <a href={SITE.founder} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-foreground">
          BlobbyOfficial
        </a>
        . A community arcade — no pay-to-win, ever.{" "}
        <span className="whitespace-nowrap">
          <Link href="/legal/terms" className="hover:text-foreground">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/legal/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </span>
      </div>
    </footer>
  );
}
