"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Gamepad2, Flag, Megaphone, Flag as FlagIcon, ScrollText, ToggleRight, Bot, BarChart3, PartyPopper, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/flags", label: "Feature flags", icon: ToggleRight, adminOnly: true },
  { href: "/admin/discord", label: "Discord bot", icon: Bot, adminOnly: true },
  { href: "/admin/events", label: "Events", icon: PartyPopper, adminOnly: true },
  { href: "/admin/site", label: "Site", icon: Globe, adminOnly: true },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  void FlagIcon;

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
      {ITEMS.filter((i) => !i.adminOnly || role === "admin").map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
