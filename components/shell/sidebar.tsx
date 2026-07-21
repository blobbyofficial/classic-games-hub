"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SOCIAL_NAV, LIBRARY_NAV, SITE, type NavItem } from "@/lib/constants";
import { useSessionStore } from "@/lib/stores/session-store";
import { Separator } from "@/components/ui/separator";
import { DiscordIcon } from "@/components/icons";

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 motion-safe:hover:translate-x-0.5",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-primary/10"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <item.icon className="relative z-10 size-[18px]" />
      <span className="relative z-10">{item.label}</span>
      {badge > 0 && (
        <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white tabular-nums">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const userId = useSessionStore((s) => s.userId);

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border/60 px-3 py-5 lg:flex">
      <nav className="flex flex-col gap-0.5">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} />
        ))}
      </nav>

      {userId && (
        <>
          <Separator className="my-3" />
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Social
          </p>
          <nav className="flex flex-col gap-0.5">
            {SOCIAL_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </nav>
          <Separator className="my-3" />
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Library
          </p>
          <nav className="flex flex-col gap-0.5">
            {LIBRARY_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </nav>
        </>
      )}

      <div className="mt-auto pt-4">
        <a
          href={SITE.discord}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl bg-[#5865F2]/10 px-3 py-2.5 text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/20"
        >
          <DiscordIcon className="size-[18px]" />
          <span>Join Discord</span>
          <ExternalLink className="ml-auto size-3.5 opacity-60" />
        </a>
      </div>
    </aside>
  );
}
