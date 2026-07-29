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
    status: "in-progress",
    timeframe: "In progress",
    summary:
      "Long-term collecting, and the loose ends from earlier releases. Most of it is built: seasons and collectable sets, cosmetics that layer three deep, a monthly booster drop, the last two level milestones, a friends activity feed, a faster hub and a redrawn icon set. What's still listed below is what hasn't been built yet.",
    groups: [
      {
        heading: "Cosmetics & profile",
        icon: "Palette",
        blurb: "The expressive extras that didn't make the v1.2.0 cut - layered, optional, never pay-to-win.",
        items: [
          {
            title: "More expressive extras",
            description:
              "The rest of the stretch-cosmetic backlog: profile entrance animations, custom cursor trails, and short looping profile music drawn from the v1.3 track library. The profile-view counter and the 'now playing' widget have shipped; the three left all add motion or audio, so they wait on the animation work.",
            status: "idea",
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
        heading: "Polish & presentation",
        icon: "Sparkles",
        items: [
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
