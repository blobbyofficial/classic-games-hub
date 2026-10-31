"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_PUBLIC, MOBILE_NAV_SIGNED_IN, isNavRouteActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/stores/session-store";

/** Fixed bottom tab bar for phones. */
export function MobileNav() {
  const pathname = usePathname();
  const pending = useSessionStore((s) => s.pendingFriendRequests);
  const unread = useSessionStore((s) => s.unreadNotifications);
  const signedIn = useSessionStore((s) => Boolean(s.userId));
  const items = signedIn ? MOBILE_NAV_SIGNED_IN : MOBILE_NAV_PUBLIC;

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="halloween-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md lg:hidden"
    >
      <div className={cn("mx-auto grid w-full max-w-lg px-1 pb-[env(safe-area-inset-bottom)]", signedIn ? "grid-cols-5" : "grid-cols-4")}>
        {items.map((item) => {
          const active = isNavRouteActive(pathname, item.href);
          const badge = item.badgeKey === "friendRequests" ? pending : item.badgeKey === "notifications" ? unread : 0;
          const label = item.label === "Leaderboards" ? "Ranks" : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={badge > 0 ? `${item.label}, ${badge} ${item.badgeKey === "friendRequests" ? "pending friend requests" : "unread notifications"}` : item.label}
              className={cn(
                // 56px tall: comfortably above the 44px minimum touch target.
                "halloween-mobile-link group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
                "transition-colors duration-200 motion-safe:active:scale-95 motion-reduce:transition-none",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {/* The active tab gets a short bar at the top edge rather than a
                  filled pill, so the bar stays visually quiet at phone size. */}
              <span
                aria-hidden
                className={cn(
                  "absolute -top-px h-[3px] rounded-b-full bg-primary transition-[width,opacity] duration-300 ease-[var(--ease-spring)]",
                  active ? "w-8 opacity-100" : "w-0 opacity-0",
                )}
              />
              <span className="relative">
                <item.icon
                  className={cn(
                    "size-[22px] transition-transform duration-300 ease-[var(--ease-spring)]",
                    active && "motion-safe:-translate-y-0.5 motion-safe:scale-105",
                  )}
                />
                {badge > 0 && (
                  <span aria-hidden="true" className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold tnum text-white ring-2 ring-background">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
