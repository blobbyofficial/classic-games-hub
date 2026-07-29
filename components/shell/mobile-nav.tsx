"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gamepad2, Trophy, Store, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/stores/session-store";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/leaderboards", label: "Ranks", icon: Trophy },
  { href: "/shop", label: "Shop", icon: Store },
  { href: "/friends", label: "Friends", icon: Users, badgeKey: "friendRequests" as const },
];

/** Fixed bottom tab bar for phones. */
export function MobileNav() {
  const pathname = usePathname();
  const pending = useSessionStore((s) => s.pendingFriendRequests);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const badge = item.badgeKey === "friendRequests" ? pending : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                // 56px tall: comfortably above the 44px minimum touch target.
                "group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium",
                "transition-colors duration-200 motion-safe:active:scale-95",
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
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold tnum text-white ring-2 ring-background">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
