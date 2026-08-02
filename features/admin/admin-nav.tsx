"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GROUPS, OVERVIEW, type NavItem } from "./nav-items";

/**
 * Grouped rather than a flat row of eleven.
 *
 * Eleven equal-weight links read as one long list to scan every time; three
 * short labelled groups are read once and then navigated by position. The
 * groups are the questions an admin actually arrives with - who's here, what
 * they play, and how the place is configured.
 */
export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const link = (item: NavItem) => {
    const active = isActive(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <item.icon className="size-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || role === "admin"),
  })).filter((g) => g.items.length > 0);

  return (
    <nav className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex">{link(OVERVIEW)}</div>

      {/* One column: it sits in a narrow sidebar on desktop, and three cramped
          columns is worse than a short list on mobile. */}
      <div className="space-y-4">
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
