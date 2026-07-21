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
    version: "v1.2.0",
    codename: "Identity & Connection",
    status: "shipped",
    timeframe: "Shipped",
    summary:
      "The release that makes your profile unmistakably yours and the community feel alive: Discord-grade cosmetics, expressive identity, richer friendships, group chats, a modern messenger, and a shop and inventory that are finally a pleasure to use.",
    groups: [
      {
        heading: "Profile customisation",
        icon: "Palette",
        blurb:
          "Your profile should say who you are before you type a word. We're taking cues from Discord, Roblox, Steam and the big social platforms — layered, expressive, and never pay-to-win.",
        items: [
          {
            title: "Nameplates everywhere",
            description:
              "Your equipped nameplate stops living only on your profile page and follows you across the whole site — search results, friends lists, leaderboards, chat headers and message bubbles — so people recognise you instantly wherever you show up.",
          },
          {
            title: "Avatar decorations 2.0",
            description:
              "Discord-style avatar decorations that render everywhere your avatar appears: animated frames, orbiting particles, soft pulsing glows and looping effects. Layered above your picture and tuned to stay readable at small sizes.",
          },
          {
            title: "Tiered custom banners",
            description:
              "Banners scale with how invested you are: a clean solid colour for email-only accounts; animated gradients and a curated library of premade art for Discord-linked players; and full custom PNG/JPEG uploads (with sensible size limits and moderation) for server boosters.",
          },
          {
            title: "Rich profile effects",
            description:
              "A real effects engine, not just a flair badge. Pick a background colour or gradient, add ambient animated layers (falling snow, drifting stars, aurora, embers, confetti), set intensity, and stack multiple accents together for a look that's genuinely yours.",
          },
          {
            title: "Profile themes & accents",
            description:
              "Recolour your whole profile card — buttons, highlights and dividers — with a curated accent theme, so a visitor feels your vibe the moment the page loads. Hand-picked palettes only, so nothing ever clashes.",
          },
          {
            title: "Profile frames",
            description:
              "Optional Discord-like decorative frames around your entire profile card — seasonal, achievement-gated and cosmetic-shop variants.",
            status: "idea",
          },
          {
            title: "Display-name styles",
            description:
              "A curated set of display fonts plus particle, glow, shimmer and gradient treatments for your name — expressive but always legible.",
          },
          {
            title: "Trophy case & showcases",
            description:
              "Steam-style showcases: pin your rarest cosmetics, proudest achievements, favourite games and best scores to the top of your profile so the first thing people see is what you're proud of.",
          },
          {
            title: "Featured achievement pin",
            description: "Choose one achievement to headline your profile with its full art and rarity.",
          },
          {
            title: "About-me widgets",
            description:
              "Optional profile fields — pronouns, a one-line status, favourite game, join date and a short bio — arranged as tidy widgets you can show or hide.",
          },
          {
            title: "Cosmetic rarity tiers",
            description:
              "Every cosmetic gets a rarity — common through mythic — with matching visual treatment and a clear label in the shop and inventory, so rare items actually feel rare.",
          },
          {
            title: "Staff-exclusive cosmetics",
            description:
              "Genuinely special, unbuyable cosmetics for admins, mods and developers — distinct animated nameplates, frames and decorations — so staff are recognisable at a glance and the role feels earned.",
          },
          {
            title: "Discord link on profile",
            description:
              "An optional 'Connect' button that surfaces your Discord for verified players who want it shown — off by default, entirely your call.",
          },
          {
            title: "More expressive extras",
            description:
              "A backlog of stretch cosmetics inspired by the platforms we love: profile entrance animations, custom cursor trails on your page, an optional profile-view counter, a mini 'now playing' game widget, and short looping profile music (from the v1.3 track library).",
            status: "idea",
          },
        ],
      },
      {
        heading: "Friends & social",
        icon: "Users",
        blurb: "Make the hub somewhere you come to hang out, not just to play.",
        items: [
          {
            title: "Mutual friends (opt-in)",
            description:
              "See the friends you have in common with someone — shown only for users who choose to make their friends list visible, so it's discovery without exposure.",
          },
          {
            title: "Follow users",
            description:
              "A lightweight one-way follow alongside two-way friendships — keep up with players you admire without needing them to accept, and they're notified when you do.",
          },
          {
            title: "Friends-list visibility",
            description:
              "Per-user control over who can see your friends list: private, friends only, followers, or fully public.",
          },
          {
            title: "Friend nicknames & notes",
            description:
              "Set a private nickname for a friend that only you see, and leave a private note on anyone's profile as a personal reminder of who they are.",
          },
          {
            title: "Group chats",
            description:
              "Create a group with a shareable invite link (e.g. /invite/<groupId>), managed by a group admin who can add, remove and promote members. Limited to boosters, mods and admins at first to keep it clean and spam-free.",
          },
          {
            title: "Modern messenger",
            description:
              "Rework messaging to feel like WhatsApp — minus file/image/video/audio sharing and calls: clean threads, emoji reactions, replies, pinned and favourite chats, and delivered/seen receipts done right.",
          },
          {
            title: "Emoji & a better mobile keyboard",
            description:
              "A proper emoji picker and a solid mobile typing experience across the site — including fixing the frustrating built-in keyboard in Snakes & Ladders while we're in there.",
          },
          {
            title: "Stories",
            description:
              "Post text or an achievement to a story that expires after a day. Boosters, mods and admins only for now while we prove out the format and moderation.",
          },
          {
            title: "Rich presence",
            description:
              "Upgrade online status to online / offline / do-not-disturb / sleep, add a 'last online' time, and even an optional 'playing now' game — each with fine-grained controls over exactly who can see it.",
          },
          {
            title: "Friends activity feed",
            description:
              "An opt-in feed of what friends are up to — new achievements, level-ups and personal-best scores — respecting everyone's visibility settings.",
            status: "idea",
          },
          {
            title: "Wishlist & gifting",
            description:
              "Add store items to a wishlist you can view and manage from your inventory, and gift items to other players at 75% of the normal price — deliberately cheaper than buying for yourself, so gifting is the generous and the smart move.",
          },
        ],
      },
      {
        heading: "Store & inventory",
        icon: "ShoppingBag",
        blurb: "Buying, previewing and managing cosmetics should be effortless — and fun.",
        items: [
          {
            title: "Live item previews",
            description:
              "Click any shop item to open a full preview page (in a new tab) that renders the effect live — see exactly how a nameplate, banner, effect or decoration looks on a real profile before you spend a single credit.",
          },
          {
            title: "Apply straight from the shop",
            description:
              "Already own an item? Apply it to your profile or avatar right from the shop page — no detour through the inventory required.",
          },
          {
            title: "Inventory search & filters",
            description:
              "A search bar plus filters — by cost, rarity/exclusivity, date acquired and item type — so even a huge collection stays easy to browse and organise.",
          },
          {
            title: "Better boost display",
            description:
              "Fix the boost countdown timer and multiplier readout so active boosts always show the correct time remaining and the true stacked multiplier at a glance.",
          },
        ],
      },
      {
        heading: "Interface & quality of life",
        icon: "SlidersHorizontal",
        items: [
          {
            title: "Redesigned navigation",
            description:
              "A proper mobile hamburger menu — today's bar is far too cramped for the space — plus a cleaner desktop nav with more breathing room between items, better spacing and smoother animations. It should simply look and feel good.",
          },
          {
            title: "Organised inventory & presets",
            description:
              "A rebuilt inventory with clear 'applied' indicators on every item, one-tap apply/disable, and saved loadout presets so you can switch your entire look — banner, nameplate, effects and name style — in a single tap.",
          },
          {
            title: "Easier event customisation",
            description:
              "Spin up an event and set things like a credit multiplier, duration and banner in a couple of clicks — no fiddly config.",
          },
          {
            title: "Faster economy adjustments",
            description:
              "Give or take XP, credits and levels from the admin panel with far less friction — search a player, adjust, done, with an audit trail.",
          },
          {
            title: "Auto device-appropriate controls",
            description:
              "Detect the player's device and show on-screen touch controls on mobile and keyboard/desktop hints on desktop automatically — whichever they're actually using, without a manual toggle.",
          },
        ],
      },
    ],
  },
  {
    version: "v1.2.1",
    codename: "Notifications & Polish",
    status: "shipped",
    timeframe: "Shipped — point release",
    summary:
      "A small polish release on top of v1.2.0: richer notifications, linkable announcements, a redesigned podium and a handful of quality-of-life fixes.",
    groups: [
      {
        heading: "Notifications & announcements",
        icon: "Megaphone",
        items: [
          {
            title: "Notification detail overlay",
            description:
              "Tap any notification to open it in full — the complete message, the exact date and time it was sent, and an Open button when a link is attached. Opening marks it read.",
          },
          {
            title: "Linkable announcements",
            description:
              "Admins can attach a call-to-action link to an announcement, and publishing with 'Notify everyone' now actually sends a notification (with that link) to every player — the toggle previously did nothing.",
          },
        ],
      },
      {
        heading: "Polish",
        icon: "Sparkles",
        items: [
          {
            title: "Podium glow-up",
            description:
              "The global leaderboard's top three now sit on a proper tiered gold/silver/bronze podium with rank badges, a crowned #1 and equipped nameplates.",
          },
          {
            title: "Group chat menu",
            description:
              "Group conversations gained a header menu to copy the invite link again or leave the group.",
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
      "Turn the hub into somewhere players return to for years, not weeks: original music, stacking events, long-term streaks, deep booster and level rewards, and a proper analytics + ads control centre.",
    groups: [
      {
        heading: "Long-term engagement",
        icon: "Repeat",
        blurb: "Daily streaks alone won't hold someone for a year — these loops are designed to.",
        items: [
          {
            title: "Community mega-events",
            description:
              "Server-wide co-op goals where everyone pulls in the same direction — e.g. 'play 500 games together this weekend' — with a live progress bar and an achievement plus bonus credits for everyone who took part.",
          },
          {
            title: "Level-milestone unlocks",
            description:
              "Hitting a level milestone unlocks a real feature, giving levelling a point beyond a number. A first-draft ladder: L5 buy background music · L10 create groups · L15 stories · L20 extra loadout preset slots · L30 a vanity profile URL · L50 an exclusive mythic cosmetic. Gating features like groups behind levels also quietly fights spam.",
          },
          {
            title: "Message streaks",
            description:
              "A Snapchat-style daily streak, but with messages instead of images — keep a conversation going day after day with a friend to build a streak and earn rewards, giving people a reason to check in on each other.",
          },
          {
            title: "Collections & seasons",
            description:
              "Collectable cosmetic sets and seasonal passes with a fresh theme each season, so there's always a longer-term goal to chip away at and a reason to come back after a break.",
            status: "idea",
          },
        ],
      },
      {
        heading: "Booster rewards",
        icon: "Heart",
        blurb:
          "Boosters keep the community's home running — the perks should feel genuinely worth it, while never becoming pay-to-win.",
        items: [
          {
            title: "Bonus daily challenges",
            description: "Two extra daily challenges on top of everyone else's — more ways to earn, every day.",
          },
          {
            title: "Monthly cosmetic drop",
            description:
              "An exclusive cosmetic every month you're boosting — a nameplate, decoration or effect that only boosters of that month receive, so the collection tells a story over time.",
          },
          {
            title: "Boost-tenure badge tiers",
            description:
              "The Booster badge evolves the longer you've boosted (1 month → 3 → 6 → 12), with a visibly fancier treatment at each tier to recognise loyalty.",
          },
          {
            title: "Bigger daily & streak bonuses",
            description: "A larger daily reward and a faster-growing streak multiplier while your boost is active.",
          },
          {
            title: "Early access",
            description:
              "A head start on new games and features — try them a week before everyone else and help shape them before launch.",
          },
          {
            title: "Monthly gift token",
            description:
              "A free token each month to gift a temporary cosmetic to a friend — spread the perks and pull friends in.",
            status: "idea",
          },
          {
            title: "Vanity profile URL",
            description: "Claim a custom profile link (e.g. /u/yourname) while you're boosting.",
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
              "Level 5+ players can buy original 'tracks' from the shop and play them in the background while they browse and play. Every track is composed in-house, so there are zero copyright concerns — and boosters can set one as their profile theme song.",
          },
          {
            title: "Stacking boosts + effect queue",
            description:
              "Credit boosts stack up to 5× (10× for Discord boosters). Buy another beyond the cap and it doesn't go to waste — it joins an effect queue and automatically takes over the moment the current boost runs out, so your boosts are always working.",
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
              "More life and motion across the whole site — page transitions, micro-interactions and celebratory moments — paired with a genuinely well-optimised, snappy experience for players who prefer animations off.",
          },
        ],
      },
      {
        heading: "Analytics, ads & admin",
        icon: "BarChart3",
        items: [
          {
            title: "Admin analytics & ads centre",
            description:
              "A dedicated admin section for analytics — site clicks, popular games, active players, retention and revenue — alongside full ad controls: force-shutdown all ads instantly, choose where ads appear, and tune placements without touching code.",
          },
          {
            title: "Editable roadmap from admin",
            description:
              "Manage this very roadmap from the admin dashboard — add, edit and reorder releases and items without touching code, so plans stay fresh with a few clicks.",
          },
          {
            title: "NitroPay ad integration",
            description:
              "Ads are planned to run through NitroPay (nitropay.com), wired so they can be paused or relocated entirely from the admin ads centre. Pending final evaluation.",
            status: "idea",
          },
        ],
      },
    ],
  },
  {
    version: "v1.4.0",
    codename: "New Dimensions",
    status: "later",
    timeframe: "Planned — games update",
    summary:
      "The big games update: a step into 3D, real multiplayer with parties, and store-decorated avatars that show up when you play together — plus admin control over the home screen itself.",
    groups: [
      {
        heading: "3D games",
        icon: "Box",
        blurb: "Beyond the 2D arcade — fully playable 3D games in the browser.",
        items: [
          {
            title: "Playable 3D games",
            description:
              "Browser-based 3D titles running smoothly on desktop and mobile — think a racing game, a Rubik's cube and more — bringing a whole new dimension to the arcade.",
          },
        ],
      },
      {
        heading: "Multiplayer & parties",
        icon: "Gamepad2",
        blurb: "Play with other people — across accounts online, or on one device in the same room.",
        items: [
          {
            title: "Real multiplayer games",
            description:
              "Games multiple people can play together — either online across accounts or locally on one device (pass-and-play). Noughts & crosses works either way; the racing game is online-only.",
          },
          {
            title: "Parties",
            description:
              "Group up into a party to jump into multiplayer games together, with invites and a shared lobby — the social backbone that multiplayer is built on.",
          },
          {
            title: "Store-decorated avatars",
            description:
              "Decorate your avatar — your profile picture — with items bought from the store, so you show up in style in multiplayer lobbies and parties.",
          },
        ],
      },
      {
        heading: "Admin & layout",
        icon: "LayoutDashboard",
        items: [
          {
            title: "Customisable home screen",
            description:
              "Rearrange the homepage straight from the admin dashboard — move the daily reward to the bottom, reorder 'Continue playing' and 'Featured games', and lay the home screen out however works best.",
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
