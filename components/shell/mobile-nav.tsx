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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const badge = item.badgeKey === "friendRequests" ? pending : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <item.icon className="size-5" />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
                    {badge > 9 ? "9" : badge}
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
