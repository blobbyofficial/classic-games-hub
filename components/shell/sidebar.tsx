"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE, type NavItem } from "@/lib/constants";
import { MAIN_NAV_GROUPS, isNavRouteActive } from "@/lib/navigation";
import { useSessionStore } from "@/lib/stores/session-store";
import { DiscordIcon } from "@/components/icons";

function SidebarLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
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
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "halloween-sidebar-link group relative flex items-center gap-3 rounded-xl py-2.5 pl-3.5 pr-3 text-sm font-medium",
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
      {!collapsed && <span className="truncate">{item.label}</span>}
      {badge > 0 && (
        <span className={cn(collapsed ? "absolute right-0 top-0" : "ml-auto", "flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold tnum text-white")}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function NavGroup({ label, items, pathname, collapsed }: { label?: string; items: readonly NavItem[]; pathname: string; collapsed: boolean }) {
  return (
    <div>
      {label && !collapsed && (
        <p className="px-3.5 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          {label}
        </p>
      )}
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isNavRouteActive(pathname, item.href)}
          />
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const userId = useSessionStore((s) => s.userId);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("cgh:sidebar-collapsed") === "true"); } catch { /* storage may be unavailable */ }
  }, []);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("cgh:sidebar-collapsed", String(next)); } catch { /* storage may be unavailable */ }
  };

  return (
    <aside aria-label="Site navigation" className={cn("halloween-sidebar sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col overflow-y-auto border-r border-border/60 py-4 lg:flex", collapsed ? "w-[68px] px-2" : "w-56 px-3")}>
      <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} className="mb-3 flex size-10 shrink-0 items-center justify-center self-end rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
        {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
      </button>
      {MAIN_NAV_GROUPS.map((group) =>
        group.label && !userId ? null : (
          <NavGroup key={group.label ?? "primary"} label={group.label ?? undefined} items={group.items} pathname={pathname} collapsed={collapsed} />
        ),
      )}

      <div className="mt-auto pt-6">
        <a
          href={SITE.discord}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join Discord"
          title={collapsed ? "Join Discord" : undefined}
          className="group flex items-center gap-3 rounded-xl bg-[#5865F2]/10 px-3.5 py-2.5 text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/20"
        >
          <DiscordIcon className="size-[18px] transition-transform duration-200 motion-safe:group-hover:scale-110" />
          {!collapsed && <><span>Join Discord</span><ExternalLink className="ml-auto size-3.5 opacity-60" /></>}
        </a>
      </div>
    </aside>
  );
}
