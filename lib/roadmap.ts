/**
 * Public roadmap data. This is a living plan — items here are ideas and
 * intentions, not promises, and can change, ship early, or be dropped.
 * Rendered by app/(main)/roadmap/page.tsx.
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
    version: "v1.2.1",
    codename: "Identity & Connection",
    status: "next",
    timeframe: "Planned — after v1.2.0",
    summary:
      "The release that makes your profile truly yours and the community feel alive: deep cosmetics, richer friendships, group chats and a WhatsApp-grade messenger.",
    groups: [
      {
        heading: "Deeper profile customisation",
        icon: "Palette",
        blurb: "Take inspiration from Discord, Roblox, Steam and the social platforms — your profile should feel personal at a glance.",
        items: [
          {
            title: "Nameplates everywhere",
            description:
              "Your equipped nameplate follows you across search results, friends lists, leaderboards and chat — not just on your own profile page.",
          },
          {
            title: "Avatar decorations 2.0",
            description:
              "Discord-style avatar decorations — animated frames, orbiting particles and soft glows that render around your avatar wherever it appears.",
          },
          {
            title: "Tiered custom banners",
            description:
              "A plain solid colour for email-only accounts; animated gradients and a library of premade art for Discord-linked players; and full custom PNG/JPEG uploads for server boosters.",
          },
          {
            title: "Rich profile effects",
            description:
              "Go well beyond today's flair layer: choose a background colour or gradient, add ambient animated effects (falling snow, drifting stars, aurora) and layer multiple accents together.",
          },
          {
            title: "Profile frames",
            description: "Optional Discord-like decorative frames around your whole profile card.",
            status: "idea",
          },
          {
            title: "Display-name styles",
            description:
              "A curated set of fonts plus particle, glow and gradient treatments so your name stands out — tastefully.",
          },
          {
            title: "Organised inventory & presets",
            description:
              "A reorganised inventory with clear 'applied' indicators, one-tap apply/disable, and saved cosmetic presets so you can swap your entire look in a tap.",
          },
          {
            title: "Staff-exclusive cosmetics",
            description:
              "Genuinely special, unbuyable items for admins, mods and developers so staff are recognisable at a glance.",
          },
          {
            title: "Discord link on profile",
            description: "An optional 'connect' button that links to your Discord — for verified players who want it shown.",
          },
          {
            title: "More cosmetic ideas",
            description:
              "Borrowing from Discord/Roblox/Steam/social: a pinned 'featured achievement', a profile badge showcase, per-profile theme accents, seasonal/limited cosmetics and a rotating cosmetic shop.",
            status: "idea",
          },
        ],
      },
      {
        heading: "Friends & social",
        icon: "Users",
        items: [
          {
            title: "Mutual friends (opt-in)",
            description: "See friends you have in common with someone — only for users who choose to make that public.",
          },
          { title: "Follow users", description: "A lightweight one-way follow alongside two-way friendships." },
          {
            title: "Friends-list visibility",
            description: "Let users pick who can see their friends list: private, friends only, followers, or public.",
          },
          {
            title: "Group chats",
            description:
              "Create a group with a shareable invite link (e.g. /invite/<groupId>) and a group admin who manages members. Limited to boosters, mods and admins at first to keep it tidy.",
          },
          {
            title: "WhatsApp-grade messenger",
            description:
              "Rework messaging to feel like WhatsApp — minus file/image/video/audio sharing and calls: cleaner threads, better composer, replies and reactions.",
          },
          {
            title: "Stories",
            description:
              "Post text or achievements to a story that expires. Boosters, mods and admins only for now while we test it.",
          },
          {
            title: "Rich presence",
            description:
              "Upgrade online status to online / offline / do-not-disturb / sleep, plus 'last online' — each with audience controls for who can see it.",
          },
          {
            title: "Better messaging UX",
            description:
              "Cleaner UI, emoji support and a proper mobile keyboard experience — including fixing the frustrating built-in keyboard in Snakes & Ladders.",
          },
          {
            title: "Wishlist & gifting",
            description:
              "Add store items to a wishlist and gift them to other players at 75% of the normal price, so gifting is cheaper than buying for yourself.",
          },
          {
            title: "User notes",
            description: "Leave a private note on someone's profile that only you can see.",
          },
        ],
      },
      {
        heading: "Admin & quality of life",
        icon: "SlidersHorizontal",
        items: [
          {
            title: "Easier event customisation",
            description: "Set things like a credit multiplier for an event in a couple of clicks.",
          },
          {
            title: "Faster economy adjustments",
            description: "Give or take XP, credits and levels from the admin panel with far less friction.",
          },
          {
            title: "Auto device-appropriate controls",
            description:
              "Show on-screen mobile controls on mobile and desktop controls on desktop automatically — whichever the player is actually using.",
          },
        ],
      },
    ],
  },
  {
    version: "v1.3.0",
    codename: "Living Arcade",
    status: "later",
    timeframe: "Planned — future",
    summary:
      "Turn the hub into somewhere players return to for years, not weeks: original music, stacking events, long-term streaks, booster perks and a proper analytics + ads control centre.",
    groups: [
      {
        heading: "Long-term engagement",
        icon: "Repeat",
        blurb: "Daily streaks alone won't hold people for a year — these loops are built to.",
        items: [
          {
            title: "Community mega-events",
            description:
              "Big co-op goals where everyone pulls together — e.g. play 500 games collectively — and every participant earns an achievement and bonus credits.",
          },
          {
            title: "Level-milestone unlocks",
            description:
              "Reaching a level milestone unlocks a new feature — for example, level 10 could unlock creating groups (which also helps prevent spam).",
          },
          {
            title: "Message streaks",
            description:
              "A Snapchat-style daily streak, but with messages instead of images — keep a conversation going day after day for rewards.",
          },
          {
            title: "Return-worthy loops",
            description:
              "A deliberate mix of retention mechanics (streaks, evolving goals, collections, seasonal resets) aimed at year-one-and-beyond players, not just week-one.",
            status: "idea",
          },
        ],
      },
      {
        heading: "Rewards & economy",
        icon: "Gift",
        items: [
          {
            title: "Background music tracks",
            description:
              "Level 5+ players can buy original 'tracks' from the shop and play them in the background. All music is made in-house, so there are no copyright concerns.",
          },
          {
            title: "Extra booster rewards",
            description:
              "More perks for server boosters beyond the badge — for example, two bonus daily challenges, plus a set of curated extra rewards to be finalised.",
          },
          {
            title: "Stacking boosts + effect queue",
            description:
              "Let credit boosts stack up to 5× (10× for Discord boosters). Buy another beyond the cap and it joins an effect queue, automatically taking over when the current boost expires.",
          },
        ],
      },
      {
        heading: "Polish & performance",
        icon: "Sparkles",
        items: [
          {
            title: "More animation, better reduced-motion",
            description:
              "More life and motion across the site, with a genuinely well-optimised experience for players who turn animations off.",
          },
        ],
      },
      {
        heading: "Analytics & ads",
        icon: "BarChart3",
        items: [
          {
            title: "Admin analytics & ads centre",
            description:
              "A new admin section for analytics (site clicks, popular games and more) and ad controls — force-shutdown ads, choose where ads play, and tune placements easily.",
          },
          {
            title: "NitroPay ad integration",
            description: "Ads are planned to run through NitroPay (nitropay.com), pending final evaluation.",
            status: "idea",
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
