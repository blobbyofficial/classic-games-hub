"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Flag,
  Megaphone,
  ScrollText,
  ToggleRight,
  Bot,
  BarChart3,
  PartyPopper,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Grouped rather than a flat row of eleven.
 *
 * Eleven equal-weight links read as one long list to scan every time; three
 * short labelled groups are read once and then navigated by position. The
 * groups are the questions an admin actually arrives with — who's here, what
 * they play, and how the place is configured.
 */
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Community",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/reports", label: "Reports", icon: Flag },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/events", label: "Events", icon: PartyPopper, adminOnly: true },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/games", label: "Games", icon: Gamepad2 },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/site", label: "Site", icon: Globe, adminOnly: true },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/discord", label: "Discord bot", icon: Bot, adminOnly: true },
      { href: "/admin/flags", label: "Feature flags", icon: ToggleRight, adminOnly: true },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
    ],
  },
];

const OVERVIEW: NavItem = { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true };

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const link = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive(item)
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <item.icon className="size-4" />
      {item.label}
    </Link>
  );

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || role === "admin"),
  })).filter((g) => g.items.length > 0);

  return (
    <nav className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex">{link(OVERVIEW)}</div>

      <div className="grid gap-3 sm:grid-cols-3">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">{group.items.map(link)}</div>
          </div>
        ))}
      </div>
    </nav>
  );
}
