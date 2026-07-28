"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SOCIAL_NAV, LIBRARY_NAV, SITE, type NavItem } from "@/lib/constants";
import { useSessionStore } from "@/lib/stores/session-store";
import { DiscordIcon } from "@/components/icons";

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const badge = useSessionStore((s) =>
    item.badgeKey === "notifications"
      ? s.unreadNotifications
      : item.badgeKey === "friendRequests"
        ? s.pendingFriendRequests
        : 0,
  );

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl py-2.5 pl-3.5 pr-3 text-sm font-medium",
        "transition-[color,background-color] duration-200 ease-[var(--ease-standard)]",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      {/* A rail on the active item rather than a moving pill: it reads instantly,
          survives a hard navigation, and costs nothing to animate. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-primary",
          "transition-[height,opacity] duration-300 ease-[var(--ease-spring)]",
          active ? "h-5 opacity-100" : "h-0 opacity-0",
        )}
      />
      <item.icon
        className={cn(
          "size-[18px] shrink-0 transition-transform duration-200 ease-[var(--ease-standard)]",
          !active && "motion-safe:group-hover:scale-110",
        )}
      />
      <span className="truncate">{item.label}</span>
      {badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold tnum text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function NavGroup({ label, items, pathname }: { label?: string; items: NavItem[]; pathname: string }) {
  return (
    <div>
      {label && (
        <p className="px-3.5 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          {label}
        </p>
      )}
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const userId = useSessionStore((s) => s.userId);
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col overflow-y-auto border-r border-border/60 px-3 py-5 lg:flex">
      <NavGroup items={PRIMARY_NAV} pathname={pathname} />

      {userId && (
        <>
          <NavGroup label="Social" items={SOCIAL_NAV} pathname={pathname} />
          <NavGroup label="Library" items={LIBRARY_NAV} pathname={pathname} />
        </>
      )}

      <div className="mt-auto pt-6">
        <a
          href={SITE.discord}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-xl bg-[#5865F2]/10 px-3.5 py-2.5 text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/20"
        >
          <DiscordIcon className="size-[18px] transition-transform duration-200 motion-safe:group-hover:scale-110" />
          <span>Join Discord</span>
          <ExternalLink className="ml-auto size-3.5 opacity-60" />
        </a>
      </div>
    </aside>
  );
}
