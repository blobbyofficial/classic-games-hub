/**
 * Public roadmap data - what is *coming*, and nothing else.
 *
 * Shipped releases live in lib/update-log.ts and render at /updates. Keeping
 * the two apart means the roadmap stays a short, readable statement of intent
 * instead of an ever-growing archive, and a release only has to be moved once:
 * out of here, into the log.
 *
 * This is a living plan - items are intentions, not promises, and can change,
 * ship early, or be dropped. Rendered by app/(main)/roadmap/page.tsx.
 */

export type RoadmapStatus = "shipped" | "in-progress" | "next" | "later" | "idea";

export interface RoadmapItem {
  title: string;
  description: string;
  /** Optional per-item status override (defaults to the release status). */
  status?: RoadmapStatus;
}

export interface RoadmapGroup {
  heading: string;
  /** lucide-react icon name, mapped to a component in the page. */
  icon: string;
  blurb?: string;
  items: RoadmapItem[];
}

export interface RoadmapRelease {
  version: string;
  codename: string;
  status: RoadmapStatus;
  timeframe: string;
  summary: string;
  groups: RoadmapGroup[];
}

export const STATUS_META: Record<RoadmapStatus, { label: string; className: string }> = {
  shipped: { label: "Shipped", className: "bg-success/15 text-success border-success/30" },
  "in-progress": { label: "In progress", className: "bg-primary/15 text-primary border-primary/30" },
  next: { label: "Next up", className: "bg-neon/15 text-neon border-neon/30" },
  later: { label: "Later", className: "bg-muted text-muted-foreground border-border" },
  idea: { label: "Exploring", className: "bg-gold/10 text-gold border-gold/30" },
};

export const ROADMAP: RoadmapRelease[] = [
  {
    version: "v1.5.0",
    codename: "Collector's Edition",
    status: "next",
    timeframe: "Next up",
    summary:
      "Everything from earlier releases that hasn't been built yet, gathered in one place rather than left scattered as loose ends. The theme that emerged: long-term collecting. Seasons to chase, cosmetics that layer and evolve, booster perks that accumulate month after month, the last two level milestones, and more 3D on the way.",
    groups: [
      {
        heading: "Collections & seasons",
        icon: "Gift",
        blurb:
          "The longest loop we've attempted: something to chip away at over months, and a reason to come back after a break.",
        items: [
          {
            title: "Collections & seasons",
            description:
              "Collectable cosmetic sets and seasonal passes with a fresh theme each season, so there's always a longer-term goal to work towards and a reason to return after time away.",
            status: "next",
          },
        ],
      },
      {
        heading: "Cosmetics & profile",
        icon: "Palette",
        blurb: "The expressive extras that didn't make the v1.2.0 cut - layered, optional, never pay-to-win.",
        items: [
          {
            title: "Profile frames",
            description:
              "Optional Discord-like decorative frames around your entire profile card - seasonal, achievement-gated and cosmetic-shop variants.",
            status: "later",
          },
          {
            title: "More expressive extras",
            description:
              "A backlog of stretch cosmetics inspired by the platforms we love: profile entrance animations, custom cursor trails on your page, an optional profile-view counter, a mini 'now playing' game widget, and short looping profile music drawn from the v1.3 track library.",
            status: "idea",
          },
        ],
      },
      {
        heading: "Booster rewards",
        icon: "Heart",
        blurb:
          "Perks that accumulate the longer you boost - the tenure badge and bigger daily bonuses already do; these three are the rest of the plan.",
        items: [
          {
            title: "Monthly cosmetic drop",
            description:
              "An exclusive cosmetic every month you're boosting - a nameplate, decoration or effect that only boosters of that month receive, so the collection tells a story over time.",
            status: "next",
          },
          {
            title: "Early access",
            description:
              "A head start on new games and features - try them a week before everyone else and help shape them before launch.",
            status: "later",
          },
          {
            title: "Monthly gift token",
            description:
              "A free token each month to gift a temporary cosmetic to a friend - spread the perks and pull friends in.",
            status: "idea",
          },
        ],
      },
      {
        heading: "Social",
        icon: "Users",
        items: [
          {
            title: "Friends activity feed",
            description:
              "A quiet feed of what your friends have been up to - new high scores, achievements unlocked, games they've picked up - so the hub feels inhabited even when nobody's talking.",
            status: "later",
          },
        ],
      },
      {
        heading: "More dimensions",
        icon: "Box",
        blurb: "Turbo Horizon proved the browser can carry it. These are the follow-ups.",
        items: [
          {
            title: "More 3D titles",
            description:
              "Beyond the pseudo-3D racer: a playable Rubik's cube, and true-3D titles running smoothly on desktop and mobile.",
            status: "later",
          },
        ],
      },
      {
        heading: "Speed",
        icon: "Gauge",
        blurb:
          "The hub should feel instant. Less to download before the first paint, pages that arrive in pieces rather than all at once, and a loading state only when there's genuinely something to wait for.",
        items: [
          {
            title: "Smaller first load",
            description:
              "Cutting what every page has to download before it can do anything - heavy libraries now load only for the players and moments that actually need them.",
            status: "in-progress",
          },
          {
            title: "Pages that load in sections",
            description:
              "Instead of waiting on the slowest query before showing anything, the page shell and its quick parts appear straight away and the rest fills in as it arrives.",
            status: "in-progress",
          },
          {
            title: "Honest loading states",
            description:
              "Skeletons shaped like the page they're standing in for, and only once a wait is long enough to notice - a placeholder that flashes for a moment is worse than none at all.",
            status: "in-progress",
          },
        ],
      },
      {
        heading: "Polish & presentation",
        icon: "Sparkles",
        items: [
          {
            title: "New icons and thumbnails",
            description:
              "A proper redraw of the whole icon set - the app icon and favicon, and all twenty-four game thumbnails as one consistent family rather than a set of unrelated drawings.",
            status: "next",
          },
          {
            title: "More animation, better reduced-motion",
            description:
              "More life and motion across the whole site - page transitions, micro-interactions and celebratory moments - paired with a genuinely well-optimised, snappy experience for players who prefer animations off.",
            status: "later",
          },
        ],
      },
    ],
  },
];

/**
 * The standards every shipped feature is held to. Shown on the roadmap so the
 * bar is public, and a reminder to ourselves.
 */
export const DEFINITION_OF_DONE: string[] = [
  "Documentation is updated",
  "The changelog is updated",
  "Obsolete code is removed",
  "TypeScript reports no errors",
  "Linting passes",
  "The project builds successfully",
  "Both mobile and desktop are verified working",
];
