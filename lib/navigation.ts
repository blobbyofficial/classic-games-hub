import { PRIMARY_NAV, SOCIAL_NAV, LIBRARY_NAV, type NavItem } from "@/lib/constants";

/** One source of navigation destinations for the shell and command palette. */
export const MAIN_NAV_GROUPS: ReadonlyArray<{ label: string | null; items: readonly NavItem[] }> = [
  { label: null, items: PRIMARY_NAV },
  { label: "Social", items: SOCIAL_NAV },
  { label: "Library", items: LIBRARY_NAV },
];

export const ALL_MAIN_NAV: readonly NavItem[] = MAIN_NAV_GROUPS.flatMap((group) => group.items);

/** The bottom bar is intentionally a shortlist; the drawer contains the full navigation. */
export const MOBILE_NAV_SIGNED_IN: readonly NavItem[] = [
  PRIMARY_NAV[0], // Home
  PRIMARY_NAV[1], // Games
  SOCIAL_NAV[0],  // Party
  SOCIAL_NAV[2],  // Messages
  SOCIAL_NAV[1],  // Friends
];

export const MOBILE_NAV_PUBLIC: readonly NavItem[] = [
  PRIMARY_NAV[0], // Home
  PRIMARY_NAV[1], // Games
  PRIMARY_NAV[2], // Leaderboards
  PRIMARY_NAV[3], // Shop
];

/** Match nested routes without accidentally matching similarly prefixed paths. */
export function isNavRouteActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function visibleNavigation(isSignedIn: boolean): readonly NavItem[] {
  return ALL_MAIN_NAV.filter((item) => isSignedIn || !item.auth);
}
