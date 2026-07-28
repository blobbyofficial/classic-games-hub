import {
  Home,
  Gamepad2,
  Trophy,
  Users,
  MessageSquare,
  ShoppingBag,
  Store,
  Award,
  Bell,
  Settings,
  ShieldCheck,
  Sparkles,
  Package,
  Target,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export const SITE = {
  name: "Classic Games Hub",
  shortName: "CG Hub",
  description:
    "A modern arcade platform — play 23 classic games, earn credits and XP, unlock achievements, climb leaderboards and hang out with friends.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://classic-games-hub.blobbyofficial.com",
  discord: "https://discord.gg/A8PThHqedD",
  founder: "https://www.blobbyofficial.com",
} as const;

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  auth?: boolean;
  badgeKey?: "notifications" | "friendRequests";
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/leaderboards", label: "Leaderboards", icon: Trophy },
  { href: "/shop", label: "Shop", icon: Store },
  { href: "/achievements", label: "Achievements", icon: Award },
];

export const SOCIAL_NAV: NavItem[] = [
  { href: "/party", label: "Party", icon: PartyPopper, auth: true },
  { href: "/friends", label: "Friends", icon: Users, auth: true, badgeKey: "friendRequests" },
  { href: "/messages", label: "Messages", icon: MessageSquare, auth: true },
  { href: "/notifications", label: "Notifications", icon: Bell, auth: true, badgeKey: "notifications" },
];

export const LIBRARY_NAV: NavItem[] = [
  { href: "/inventory", label: "Inventory", icon: Package, auth: true },
  { href: "/challenges", label: "Challenges", icon: Target, auth: true },
];

export const CATEGORIES = ["Arcade", "Puzzle", "Strategy", "Shooter"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<string, { color: string; glow: string }> = {
  Arcade: { color: "text-cyan-400", glow: "shadow-cyan-500/20" },
  Puzzle: { color: "text-violet-400", glow: "shadow-violet-500/20" },
  Strategy: { color: "text-emerald-400", glow: "shadow-emerald-500/20" },
  Shooter: { color: "text-rose-400", glow: "shadow-rose-500/20" },
};

export const USERNAME_CHANGE_COST = 500;

export const ICONS = {
  Sparkles,
  Settings,
  ShieldCheck,
  ShoppingBag,
} satisfies Record<string, LucideIcon>;
