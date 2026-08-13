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
  Activity,
  type LucideIcon,
} from "lucide-react";

/**
 * One list describing the admin section: what the pages are, what they're for,
 * and how they group. The nav and the page heading both read from it, so a new
 * page is added in one place and can't end up in the nav without a heading (or
 * the other way round).
 */

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
}

export const OVERVIEW: NavItem = {
  href: "/admin",
  label: "Overview",
  description: "How the platform is doing right now.",
  icon: LayoutDashboard,
  exact: true,
};

export const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Community",
    items: [
      { href: "/admin/users", label: "Users", description: "Find a player, adjust credits, change roles.", icon: Users },
      { href: "/admin/reports", label: "Reports", description: "Player reports waiting on a decision.", icon: Flag },
      {
        href: "/admin/announcements",
        label: "Announcements",
        description: "Publish a notice to everyone on the site.",
        icon: Megaphone,
      },
      {
        href: "/admin/events",
        label: "Events",
        description: "Run seasonal events and community goals.",
        icon: PartyPopper,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/games", label: "Games", description: "Add, edit and publish games.", icon: Gamepad2 },
      {
        href: "/admin/analytics",
        label: "Analytics",
        description: "Active players, plays per day, retention.",
        icon: BarChart3,
      },
      { href: "/admin/site", label: "Site", description: "Banners and the homepage layout.", icon: Globe, adminOnly: true },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/admin/status",
        label: "Status",
        description: "Declare an incident, post updates, review player reports.",
        icon: Activity,
      },
      {
        href: "/admin/discord",
        label: "Discord bot",
        description: "Run commands, sync settings, tune each feature.",
        icon: Bot,
        adminOnly: true,
      },
      {
        href: "/admin/flags",
        label: "Feature flags",
        description: "Turn features on and off without a deploy.",
        icon: ToggleRight,
        adminOnly: true,
      },
      { href: "/admin/audit", label: "Audit log", description: "Every privileged action, newest first.", icon: ScrollText },
    ],
  },
];

/** Route → heading, for the shared page header. */
export const PAGE_META: Record<string, NavItem> = Object.fromEntries(
  [OVERVIEW, ...GROUPS.flatMap((g) => g.items)].map((item) => [item.href, item]),
);
