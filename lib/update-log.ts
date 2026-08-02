/**
 * The update log - everything that has actually shipped.
 *
 * The roadmap (lib/roadmap.ts) is for what is *coming*; the moment something
 * ships it moves here, so neither page has to carry both jobs. Release entries
 * were moved verbatim out of the roadmap when v1.5.0 was formed, minus the
 * per-item statuses that only mattered while the work was pending.
 *
 * `LANDED` is generated from `git log --first-parent main` - every change that
 * reached production, whether it arrived through a pull request or as a direct
 * commit. Regenerate it after a release rather than editing by hand.
 */

export interface UpdateItem {
  title: string;
  description: string;
  /** A plan that was announced and then abandoned. Rendered struck through. */
  dropped?: boolean;
}

export interface UpdateGroup {
  heading: string;
  /** lucide-react icon name, mapped to a component in the page. */
  icon: string;
  blurb?: string;
  items: UpdateItem[];
}

export interface UpdateRelease {
  version: string;
  codename: string;
  date: string;
  /** Set when a release was added to after its first ship date. */
  dateNote?: string;
  summary: string;
  groups: UpdateGroup[];
}

/** One entry per change that landed on `main`, newest first. */
export interface LandedChange {
  sha: string;
  date: string;
  subject: string;
  /** Present when the change arrived as a merged pull request. */
  pr?: number;
}

export const REPO_URL = "https://github.com/blobbyofficial/classic-games-hub";

export const RELEASES: UpdateRelease[] = [
  {
    version: "v1.5.0",
    codename: "Collector's Edition",
    date: "2 Aug 2026",
    summary:
      "Things worth keeping. Seasons and collectable sets give the long game a shape, cosmetics now layer three deep and finally include the expressive extras that have been promised since v1.2.0, and the arcade gained two games - a playable Rubik's cube, and the first title rendered with the camera inside the scene.",
    groups: [
      {
        heading: "The arcade",
        icon: "Gamepad2",
        blurb: "Two new games, and the renderer that makes a third one cheap.",
        items: [
          {
            title: "Cube",
            description:
              "The classic 3x3 twisty puzzle. Drag a sticker in the direction you want it to travel and that layer turns, drag the background to look around, or use the standard letters on a keyboard. Scored on moves and time, so a tidy solve beats a lucky one.",
          },
          {
            title: "Labyrinth",
            description:
              "A first-person maze in real 3D: corridors you cannot see round, walls that light properly as you turn, and a map that fills itself in only where you have actually been. Three mazes to a run, each bigger than the last.",
          },
          {
            title: "A 3D renderer, not a 3D library",
            description:
              "Both games are drawn on the same plain 2D canvas as everything else in the arcade. Adding a 3D library would have put back more weight than every game engine here carries put together, and undone the work v1.4.1 did to make pages lighter. The renderer is shared, so the next 3D game starts from a camera rather than from trigonometry.",
          },
        ],
      },
      {
        heading: "Cosmetics & profile",
        icon: "Palette",
        blurb: "Layered, optional, and never pay-to-win.",
        items: [
          {
            title: "Decorations and profile frames",
            description:
              "Two new layers that sit alongside the ones you already wear rather than replacing them: a decoration over your avatar, and a frame around the whole profile card. An avatar frame, a decoration, a profile frame, a nameplate and an effect can all be on at once.",
          },
          {
            title: "Entrances, cursor trails and profile music",
            description:
              "The last of the extras promised back in v1.2.0. Your profile can arrive with an animation, leave a trail behind a visitor's cursor, and play a track you already own from the music library. The music is click-to-play, never automatic - a profile that starts making noise on its own is nobody's favourite feature.",
          },
          {
            title: "Now playing, and an optional view counter",
            description:
              "A chip under your name shows what you are playing, or last played, worked out from your sessions rather than anything new being recorded, and it follows the online-status setting you already had. The visitor counter is off by default, counts unique people per day rather than refreshes, and never counts you.",
          },
          {
            title: "Loadout presets",
            description:
              "Save everything you are wearing as a set and switch between them. Unlocked at level 20.",
          },
        ],
      },
      {
        heading: "Collecting",
        icon: "Gift",
        blurb: "The long game: sets to complete, seasons to climb, and perks for boosters.",
        items: [
          {
            title: "Seasons",
            description:
              "A tier track that fills as you play, with a reward at each tier. Progress is worked out from what you have actually done rather than a stored counter, so it can never drift; the only thing recorded is whether you have taken a reward.",
          },
          {
            title: "Collections",
            description:
              "Cosmetic sets with an exclusive badge for finishing one. Owning the set is derived from your inventory, so items arriving by any route count.",
          },
          {
            title: "Booster perks",
            description:
              "A monthly exclusive cosmetic, a monthly token to gift any cosmetic to a friend for 30 days, and early access to new games before everyone else. Locked games stay visible with a countdown, because a perk nobody can see is a perk nobody wants.",
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
              "Recent achievements, purchases and new friendships from the people you follow, in one place.",
          },
        ],
      },
      {
        heading: "Under the hood",
        icon: "Rocket",
        items: [
          {
            title: "Loading states everywhere",
            description:
              "Ten more routes now show a skeleton of the page instead of a blank screen, and spinners wait 200ms before appearing so a fast load never flashes one.",
          },
          {
            title: "One thumbnail system",
            description:
              "Every game card is generated from the same near-black base, grid and vignette, with a single accent hue giving each game its identity. Twenty-six cards now read as one product rather than twenty-six pieces of unrelated art.",
          },
        ],
      },
    ],
  },
  {
    version: "v1.4.1",
    codename: "Refined",
    date: "28 Jul 2026",
    summary:
      "A ground-up pass over how the site looks, feels and performs. One design system instead of many near-copies, motion that stays out of the way, and a lighter page on every device - the whole animation runtime and the query cache left the bundle entirely.",
    groups: [
      {
        heading: "Design system",
        icon: "Palette",
        blurb:
          "The parts every page is built from, fixed once so eight screens stop drifting into eight slightly different looks.",
        items: [
          {
            title: "Elevation, motion and type tokens",
            description:
              "Shadows are now brand-tinted tokens that deepen properly in dark mode, headings scale fluidly instead of jumping at breakpoints, and every transition uses one of two shared easing curves. Body text meets AA contrast in both themes.",
          },
          {
            title: "One page header, one empty state",
            description:
              "Every top-level page opens with the same masthead, and every 'nothing here yet' surface - no friends, no messages, an empty inventory, no search results - uses the same component, with a real explanation and a way forward rather than a bare sentence.",
          },
          {
            title: "Rebuilt primitives",
            description:
              "Buttons gained a proper loading state that doesn't resize mid-click, cards gained surface variants, inputs and selects finally match each other, and dialogs stay inside a short phone screen instead of overflowing off it.",
          },
        ],
      },
      {
        heading: "Motion & interaction",
        icon: "Sparkles",
        blurb: "Enough to feel alive, little enough to stay out of the way.",
        items: [
          {
            title: "Micro-interactions throughout",
            description:
              "Cards lift on hover, grids stagger in, the credit balance rolls when it changes, menus scale from the button that opened them, and the play button on a game card springs up under the pointer. All of it is transform and opacity only, so it runs on the compositor.",
          },
          {
            title: "Reduced motion is a real mode",
            description:
              "Every animation is gated behind a motion-safe check rather than merely shortened, so choosing 'reduce motion' gives a genuinely still interface instead of a fast one.",
          },
        ],
      },
      {
        heading: "Performance",
        icon: "Rocket",
        blurb: "Fewer bytes to download, fewer pixels to repaint.",
        items: [
          {
            title: "Two dependencies removed",
            description:
              "The animation library was doing six small jobs that CSS does natively, and the query cache existed for a single call in the command palette. Both are gone; the palette now caches the game list in module scope, and every animation they powered still works.",
          },
          {
            title: "Cheaper painting",
            description:
              "Hero and auth backdrops swapped full-viewport blur filters for background gradients, skeleton shimmer became a transform instead of an animated gradient position, and below-the-fold sections skip layout and paint until they approach the viewport.",
          },
          {
            title: "Faster first paint",
            description:
              "Fonts swap in rather than blocking, the mono face no longer preloads, and the image size ladder was trimmed to the widths the layout actually requests.",
          },
        ],
      },
      {
        heading: "Accessibility & responsiveness",
        icon: "Users",
        items: [
          {
            title: "Keyboard and screen-reader fixes",
            description:
              "A skip link opens every page, focus rings are consistent everywhere and never fire on a mouse click, navigation marks the current page, loading skeletons announce themselves, and progress bars report their value.",
          },
          {
            title: "Built for touch first",
            description:
              "The favourite button no longer hides behind a hover state on phones, tab bars and filter rows scroll instead of wrapping, every tap target clears 44px, text inputs stay at 16px so iOS won't zoom, and toasts sit above the mobile tab bar.",
          },
          {
            title: "Grids that fit every width",
            description:
              "Game grids fill available space rather than snapping between fixed column counts, which fixes the awkward tablet range where four columns were too many and three left a gap.",
          },
        ],
      },
    ],
  },
  {
    version: "v1.4.0",
    codename: "New Dimensions",
    date: "22 Jul 2026",
    dateNote: "extended 28 Jul 2026",
    summary:
      "The big games update: a step into 3D, real multiplayer with parties, and store-decorated avatars that show up when you play together - plus admin control over the home screen itself.",
    groups: [
      {
        heading: "3D games",
        icon: "Box",
        blurb: "Beyond the 2D arcade - fully playable 3D games in the browser.",
        items: [
          {
            title: "Playable 3D games",
            description:
              "Browser-based 3D titles running smoothly on desktop and mobile. First out: Turbo Horizon, an OutRun-style pseudo-3D racer. Further titles are planned for v1.5.0.",
          },
        ],
      },
      {
        heading: "Multiplayer & parties",
        icon: "Gamepad2",
        blurb: "Play with other people - across accounts online, or on one device in the same room.",
        items: [
          {
            title: "Real multiplayer games",
            description:
              "Games multiple people can play together, online across accounts. Tic-Tac-Toe, Connect 4 and Reversi are true head-to-head matches on one shared board with alternating turns; every other game becomes a score race - same game, same moment, live standings. Local pass-and-play remains in Tic-Tac-Toe via the 2P toggle.",
          },
          {
            title: "Parties",
            description:
              "Group up into a party to jump into multiplayer games together. Create one, share a six-character code or invite friends straight from your friends list, and the leader picks the game and starts it for everyone at once.",
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
              "Rearrange the homepage straight from the admin dashboard - reorder or hide any section from Admin → Site, no code required.",
          },
        ],
      },
    ],
  },
  {
    version: "v1.3.0",
    codename: "Living Arcade",
    date: "22 Jul 2026",
    summary:
      "Turn the hub into somewhere players return to for years, not weeks: original music, stacking events, long-term streaks, deep booster and level rewards, and a proper analytics control centre.",
    groups: [
      {
        heading: "Long-term engagement",
        icon: "Repeat",
        blurb: "Daily streaks alone won't hold someone for a year - these loops are designed to.",
        items: [
          {
            title: "Community mega-events",
            description:
              "Server-wide co-op goals where everyone pulls in the same direction - e.g. 'play 500 games together this weekend' - with a live progress bar and an achievement plus bonus credits for everyone who took part.",
          },
          {
            title: "Level-milestone unlocks",
            description:
              "Hitting a level milestone unlocks a real feature, giving levelling a point beyond a number: L5 background music · L10 create groups · L15 stories · L30 a vanity profile URL. Two further milestones are planned for v1.5.0.",
          },
          {
            title: "Message streaks",
            description:
              "A Snapchat-style daily streak, but with messages instead of images - keep a conversation going day after day with a friend to build a streak and earn rewards, giving people a reason to check in on each other.",
          },
        ],
      },
      {
        heading: "Booster rewards",
        icon: "Heart",
        blurb:
          "Boosters keep the community's home running - the perks should feel genuinely worth it, while never becoming pay-to-win.",
        items: [
          {
            title: "Bonus daily challenges",
            description:
              "An extra daily challenge on top of everyone else's - more ways to earn, every day. Everyone can see it, so the perk is visible, but only boosters can claim it.",
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
            title: "Vanity profile URL",
            description:
              "Claim a custom profile link (e.g. /u/yourname). Unlocked by boosting, by reaching level 30, or by being staff - claim or change it from Settings.",
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
              "Level 5+ players can buy original 'tracks' from the shop and play them in the background while they browse and play. Every track is composed in-house, so there are zero copyright concerns - and boosters can set one as their profile theme song.",
          },
          {
            title: "Stacking boosts + effect queue",
            description:
              "Credit boosts stack up to 5× (10× for Discord boosters). Buy another beyond the cap and it doesn't go to waste - it joins an effect queue and automatically takes over the moment the current boost runs out, so your boosts are always working.",
          },
        ],
      },
      {
        heading: "Analytics & admin",
        icon: "BarChart3",
        items: [
          {
            title: "Admin analytics centre",
            description:
              "A dedicated admin section for analytics - site clicks, popular games, active players and retention - plus control over which surfaces appear across the site, without touching code.",
          },
          {
            title: "Editable roadmap from admin",
            description:
              "Manage this very roadmap from the admin dashboard - add, edit and reorder releases and items without touching code, so plans stay fresh with a few clicks.",
          },
          {
            title: "Rewarded ads & NitroPay",
            description:
              "The plan to run ads - the simulated 'watch to double your credits' flow and a NitroPay integration - has been dropped. It complicated the reward maths and there was never a network behind it, so the whole programme was removed rather than left half-built. Credits now come from playing, streaks and boosts alone.",
            dropped: true,
          },
        ],
      },
    ],
  },
  {
    version: "v1.2.3",
    codename: "The Bot Update",
    date: "22 Jul 2026",
    summary:
      "The Discord bot becomes a first-class citizen - rebuilt serverlessly so it runs for free, with secure account linking, an Arcane-replacing level system, automatic role sync, and a proper legal foundation for the whole platform.",
    groups: [
      {
        heading: "Discord bot 2.0",
        icon: "Bot",
        blurb: "One bot, wired straight into your Hub account - no paid hosting anywhere.",
        items: [
          {
            title: "Serverless slash commands",
            description:
              "All commands (/link, /rank, /levels, /daily, /pay, /profile, /leaderboard, /sync, moderation) now run through Discord HTTP interactions served by the website itself - signature-verified, free, and always on.",
          },
          {
            title: "Secure account linking",
            description:
              "Link Discord from Settings → Connections via Discord OAuth, or with a one-time /link code minted in the server. Both paths prove you own the Discord account; unlink any time.",
          },
          {
            title: "Discord levels (goodbye Arcane)",
            description:
              "Chat XP with configurable rates, cooldowns and level curve - anti-spam enforced in the database. /rank and /levels leaderboards, level-up announcements, website notifications, and an optional XP trickle into your Hub level.",
          },
          {
            title: "Role sync",
            description:
              "Hub badges, achievements, staff status, nameplates and levels map to Discord roles. Synced on change, on join, on /sync and nightly - the website is always the source of truth.",
          },
          {
            title: "Admin bot controls",
            description:
              "A new Admin → Discord bot page to tune XP rates, curves, announcements and the role map without touching code.",
          },
        ],
      },
      {
        heading: "Platform",
        icon: "Sparkles",
        items: [
          {
            title: "Level-milestone unlocks",
            description:
              "Levelling now unlocks real features: create groups at level 10 and post stories at level 15 - or link Discord for instant access, as before.",
          },
          {
            title: "Admin analytics",
            description:
              "A new Admin → Analytics page: daily/weekly/monthly active players, plays per day, sign-ups per day and average session length - computed from existing data, no extra tracking.",
          },
          {
            title: "Terms of Service & Privacy Policy",
            description:
              "Proper, readable legal pages written for UK GDPR and linked from the footer, sign-up and settings - describing exactly what the platform actually collects.",
          },
          {
            title: "Social share card",
            description: "Links to the Hub now unfurl with a proper branded preview image.",
          },
        ],
      },
    ],
  },
  {
    version: "v1.2.2",
    codename: "Arcade & Chat Polish",
    date: "21 Jul 2026",
    summary:
      "A quality pass on the two things people do most - play and chat. Six more games rebuilt to a modern, tactile bar; the kept cosmetics given a Discord-tier animation glow-up; and messaging made genuinely reliable, now with GIFs.",
    groups: [
      {
        heading: "Messaging",
        icon: "MessageSquare",
        blurb: "Chat should feel instant and alive - and a little more fun.",
        items: [
          {
            title: "Send GIFs",
            description:
              "A Discord-style GIF picker in the composer, powered by Giphy: search or browse trending GIFs and tap one to send. It arrives as a message that renders inline as an image. You pick from Giphy only - no uploading or pasting your own image URLs - so it stays clean and safe.",
          },
          {
            title: "Reliable sending",
            description:
              "Messages no longer get stuck on 'Sending…' until you refresh. A sent message now resolves the instant the server confirms it, independent of the realtime echo.",
          },
          {
            title: "Live, lightweight updates",
            description:
              "The thread stays live for both sent and received messages without ever reloading the whole page - a cheap background sync fills in anything realtime misses, so you see new messages within seconds.",
          },
        ],
      },
      {
        heading: "Games",
        icon: "Gamepad2",
        blurb: "Every game held to the standard set by Tic-Tac-Toe and Connect Four.",
        items: [
          {
            title: "Six games rebuilt",
            description:
              "Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush and Reversi rebuilt from scratch as animated, mobile-first, tactile canvas games - glowing feedback, satisfying motion and smarter opponents where it counts.",
          },
        ],
      },
      {
        heading: "Cosmetics & shop",
        icon: "Sparkles",
        items: [
          {
            title: "Cosmetics glow-up",
            description:
              "The kept nameplates, frames, effects, themes, banners, badges and boosts had their particles and animations reworked to a Discord-tier bar - flowing gradients, travelling sheens, rotating rims and layered particle systems, all reduced-motion friendly.",
          },
          {
            title: "Shop refinement",
            description:
              "A curated cull of overlapping cosmetics with automatic credit refunds, and the group-creation bug fixed so groups always create cleanly.",
          },
        ],
      },
    ],
  },
  {
    version: "v1.2.1",
    codename: "Notifications & Polish",
    date: "21 Jul 2026",
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
              "Tap any notification to open it in full - the complete message, the exact date and time it was sent, and an Open button when a link is attached. Opening marks it read.",
          },
          {
            title: "Linkable announcements",
            description:
              "Admins can attach a call-to-action link to an announcement, and publishing with 'Notify everyone' now actually sends a notification (with that link) to every player - the toggle previously did nothing.",
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
    version: "v1.2.0",
    codename: "Identity & Connection",
    date: "21 Jul 2026",
    summary:
      "The release that makes your profile unmistakably yours and the community feel alive: Discord-grade cosmetics, expressive identity, richer friendships, group chats, a modern messenger, and a shop and inventory that are finally a pleasure to use.",
    groups: [
      {
        heading: "Profile customisation",
        icon: "Palette",
        blurb:
          "Your profile should say who you are before you type a word. We're taking cues from Discord, Roblox, Steam and the big social platforms - layered, expressive, and never pay-to-win.",
        items: [
          {
            title: "Nameplates everywhere",
            description:
              "Your equipped nameplate stops living only on your profile page and follows you across the whole site - search results, friends lists, leaderboards, chat headers and message bubbles - so people recognise you instantly wherever you show up.",
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
              "Recolour your whole profile card - buttons, highlights and dividers - with a curated accent theme, so a visitor feels your vibe the moment the page loads. Hand-picked palettes only, so nothing ever clashes.",
          },
          {
            title: "Display-name styles",
            description:
              "A curated set of display fonts plus particle, glow, shimmer and gradient treatments for your name - expressive but always legible.",
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
              "Optional profile fields - pronouns, a one-line status, favourite game, join date and a short bio - arranged as tidy widgets you can show or hide.",
          },
          {
            title: "Cosmetic rarity tiers",
            description:
              "Every cosmetic gets a rarity - common through mythic - with matching visual treatment and a clear label in the shop and inventory, so rare items actually feel rare.",
          },
          {
            title: "Staff-exclusive cosmetics",
            description:
              "Genuinely special, unbuyable cosmetics for admins, mods and developers - distinct animated nameplates, frames and decorations - so staff are recognisable at a glance and the role feels earned.",
          },
          {
            title: "Discord link on profile",
            description:
              "An optional 'Connect' button that surfaces your Discord for verified players who want it shown - off by default, entirely your call.",
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
              "See the friends you have in common with someone - shown only for users who choose to make their friends list visible, so it's discovery without exposure.",
          },
          {
            title: "Follow users",
            description:
              "A lightweight one-way follow alongside two-way friendships - keep up with players you admire without needing them to accept, and they're notified when you do.",
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
              "Rework messaging to feel like WhatsApp - minus file/image/video/audio sharing and calls: clean threads, emoji reactions, replies, pinned and favourite chats, and delivered/seen receipts done right.",
          },
          {
            title: "Emoji & a better mobile keyboard",
            description:
              "A proper emoji picker and a solid mobile typing experience across the site - including fixing the frustrating built-in keyboard in Snakes & Ladders while we're in there.",
          },
          {
            title: "Stories",
            description:
              "Post text or an achievement to a story that expires after a day. Boosters, mods and admins only for now while we prove out the format and moderation.",
          },
          {
            title: "Rich presence",
            description:
              "Upgrade online status to online / offline / do-not-disturb / sleep, add a 'last online' time, and even an optional 'playing now' game - each with fine-grained controls over exactly who can see it.",
          },
          {
            title: "Wishlist & gifting",
            description:
              "Add store items to a wishlist you can view and manage from your inventory, and gift items to other players at 75% of the normal price - deliberately cheaper than buying for yourself, so gifting is the generous and the smart move.",
          },
        ],
      },
      {
        heading: "Store & inventory",
        icon: "ShoppingBag",
        blurb: "Buying, previewing and managing cosmetics should be effortless - and fun.",
        items: [
          {
            title: "Live item previews",
            description:
              "Click any shop item to open a full preview page (in a new tab) that renders the effect live - see exactly how a nameplate, banner, effect or decoration looks on a real profile before you spend a single credit.",
          },
          {
            title: "Apply straight from the shop",
            description:
              "Already own an item? Apply it to your profile or avatar right from the shop page - no detour through the inventory required.",
          },
          {
            title: "Inventory search & filters",
            description:
              "A search bar plus filters - by cost, rarity/exclusivity, date acquired and item type - so even a huge collection stays easy to browse and organise.",
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
              "A proper mobile hamburger menu - today's bar is far too cramped for the space - plus a cleaner desktop nav with more breathing room between items, better spacing and smoother animations. It should simply look and feel good.",
          },
          {
            title: "Organised inventory",
            description:
              "A rebuilt inventory with clear 'applied' indicators on every item and one-tap apply/disable.",
          },
          {
            title: "Easier event customisation",
            description:
              "Spin up an event and set things like a credit multiplier, duration and banner in a couple of clicks - no fiddly config.",
          },
          {
            title: "Faster economy adjustments",
            description:
              "Give or take XP, credits and levels from the admin panel with far less friction - search a player, adjust, done, with an audit trail.",
          },
          {
            title: "Auto device-appropriate controls",
            description:
              "Detect the player's device and show on-screen touch controls on mobile and keyboard/desktop hints on desktop automatically - whichever they're actually using, without a manual toggle.",
          },
        ],
      },
    ],
  },
];

export const LANDED: LandedChange[] = [
  { sha: "7479a8f", date: "2 Aug 2026", subject: "Merged pull request from v1-5-0-dev-plan-gmjufz", pr: 22 },
  { sha: "0785bc3", date: "29 Jul 2026", subject: "Merged pull request from website-ui-ux-redesign-fn7ric", pr: 20 },
  { sha: "f91cbea", date: "29 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 21 },
  { sha: "2479a5e", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 19 },
  { sha: "3221adc", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 18 },
  { sha: "3ce4e03", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 17 },
  { sha: "a13d56c", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 16 },
  { sha: "d3986d0", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 15 },
  { sha: "1c16784", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 14 },
  { sha: "1da5a10", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 13 },
  { sha: "13ceba6", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 12 },
  { sha: "88a3df3", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 11 },
  { sha: "f5da50b", date: "28 Jul 2026", subject: "Merged pull request from games-hub-online-multiplayer-hzzyf4", pr: 10 },
  { sha: "36848c8", date: "27 Jul 2026", subject: "Merged pull request from discord-bot-consolidation-2gq23j", pr: 9 },
  { sha: "4488be0", date: "27 Jul 2026", subject: "Add permissions configuration to settings.local.json" },
  { sha: "bb4b7cf", date: "26 Jul 2026", subject: "fix(security): revoke from PUBLIC, not just anon, on 5 signed-in-only RPCs" },
  { sha: "7e8bfdc", date: "26 Jul 2026", subject: "fix(economy): queued boosts no longer lost; dedupe auth round-trips" },
  { sha: "d0c55c9", date: "22 Jul 2026", subject: "feat(v1.4.1): games & fullscreen overhaul, global colour themes, perf polish" },
  { sha: "fc67f53", date: "22 Jul 2026", subject: "feat(v1.4): Turbo Horizon pseudo-3D racer + pass-and-play; roadmap/changelog/docs" },
  { sha: "389595f", date: "22 Jul 2026", subject: "feat(v1.3): Living Arcade - stacking boosts, streaks, mega-events, music, admin surfaces" },
  { sha: "d240a91", date: "22 Jul 2026", subject: "feat(admin): analytics centre; level-milestone unlocks; v1.2.3 roadmap + changelog" },
  { sha: "9b72ea1", date: "22 Jul 2026", subject: "feat(seo)+chore(security): OG share image; security-hardening migration" },
  { sha: "fcf723d", date: "22 Jul 2026", subject: "feat(legal): Terms of Service + Privacy Policy (UK GDPR)" },
  { sha: "c36ed76", date: "22 Jul 2026", subject: "feat(discord): serverless bot v2 - interactions endpoint, secure linking, role sync, leveling" },
  { sha: "43fef05", date: "21 Jul 2026", subject: "docs: roadmap + changelog for v1.2.2 (games, cosmetics, messaging, GIFs)" },
  { sha: "90c5192", date: "21 Jul 2026", subject: "feat(messages): Giphy GIF picker - send GIFs in chat (Discord-style)" },
  { sha: "2b4d810", date: "21 Jul 2026", subject: "fix(messages): resolve sent messages instantly + live incremental updates" },
  { sha: "d514f0b", date: "21 Jul 2026", subject: "v1.2.2: revamp kept shop cosmetics to a Discord-tier quality bar" },
  { sha: "f72cb90", date: "21 Jul 2026", subject: "v1.2.2: rebuild 6 coming-soon games to the quality bar" },
  { sha: "b4e9788", date: "21 Jul 2026", subject: "fix(groups): repair create_group invite-code generation" },
  { sha: "1767a9c", date: "21 Jul 2026", subject: "Add permissions to settings.json for Bash commands" },
  { sha: "778eede", date: "21 Jul 2026", subject: "v1.2.2: shop cull + refunds; rebuild Connect Four" },
  { sha: "63e5495", date: "21 Jul 2026", subject: "v1.2.2: rebuild Tic-Tac-Toe (quality-bar exemplar)" },
  { sha: "97223b9", date: "21 Jul 2026", subject: "v1.2.1 finish + v1.2.2 start: profile wishlist gifting; weak games -> coming soon" },
  { sha: "4ea3e49", date: "21 Jul 2026", subject: "v1.2.1: roadmap + changelog" },
  { sha: "a74459c", date: "21 Jul 2026", subject: "v1.2.1: group chat header menu (copy invite / leave)" },
  { sha: "1861209", date: "21 Jul 2026", subject: "v1.2.1: podium glow-up" },
  { sha: "2da428b", date: "21 Jul 2026", subject: "v1.2.1: notification detail overlay + announcement links & real broadcast" },
  { sha: "4c94d75", date: "21 Jul 2026", subject: "Release v1.2.0 - Identity & Connection" },
  { sha: "c5be7ec", date: "20 Jul 2026", subject: "Merged pull request from classic-games-hub-deploy-r2yvgc", pr: 8 },
  { sha: "7fa939d", date: "20 Jul 2026", subject: "Roadmap: expand and deepen v1.2.1 and v1.3.0 plans" },
  { sha: "842ac66", date: "20 Jul 2026", subject: "Add public roadmap page" },
  { sha: "cc319b6", date: "20 Jul 2026", subject: "Merged pull request from classic-games-hub-deploy-r2yvgc", pr: 7 },
  { sha: "b4de700", date: "20 Jul 2026", subject: "Add files via upload" },
  { sha: "8ceae6e", date: "20 Jul 2026", subject: "Merged pull request from classic-games-hub-deploy-r2yvgc", pr: 6 },
  { sha: "bccb0cd", date: "19 Jul 2026", subject: "Point app at dedicated classic-games-hub Supabase project" },
  { sha: "5099af4", date: "19 Jul 2026", subject: "Add files via upload" },
  { sha: "1dfa001", date: "19 Jul 2026", subject: "Add production env defaults (publishable values) for zero-config deploy" },
  { sha: "5feca91", date: "19 Jul 2026", subject: "Relocate CI workflow out of .github/workflows" },
  { sha: "4aad195", date: "19 Jul 2026", subject: "Generate PWA raster icons at build time via sharp" },
  { sha: "1efeb47", date: "19 Jul 2026", subject: "Add PWA assets, error/loading boundaries, README, CI" },
];

/**
 * Every pull request merged into `main`, from the GitHub API.
 *
 * This is a longer list than the merge commits visible in `LANDED`: #1–#5 were
 * merged in March 2026, before the repository was rebuilt as a Next.js app, and
 * their merge commits are no longer reachable from `main`. GitHub still records
 * them, so they are kept here rather than lost.
 */
export interface MergedPullRequest {
  number: number;
  title: string;
  date: string;
}

export const PULL_REQUESTS: MergedPullRequest[] = [
  { number: 22, title: "v1.5.0 \"Collector's Edition\": cosmetics, seasons, collections & social", date: "2 Aug 2026" },
  { number: 20, title: "feat(ui): redesign the interface and cut two runtime dependencies", date: "29 Jul 2026" },
  { number: 21, title: "Admin dashboard: sidebar layout, shared page furniture, one set of primitives", date: "29 Jul 2026" },
  { number: 19, title: "Tidy the admin dashboard: tabs for the Discord page, grouped nav", date: "28 Jul 2026" },
  { number: 18, title: "Rename the bot to Classic Games Bot, and fix four bugs found in a sweep", date: "28 Jul 2026" },
  { number: 17, title: "Fix three dashboard settings that could never take effect", date: "28 Jul 2026" },
  { number: 16, title: "Use a linked role or channel, and update it - never replace it", date: "28 Jul 2026" },
  { number: 15, title: "Run the bot from the dashboard, and make saving actually apply", date: "28 Jul 2026" },
  { number: 14, title: "Fix: audit-log reason header broke every write to Discord", date: "28 Jul 2026" },
  { number: 13, title: "Report Discord's actual error when /setup can't create something", date: "28 Jul 2026" },
  { number: 12, title: "Show which Discord credentials are missing instead of failing opaquely", date: "28 Jul 2026" },
  { number: 11, title: "Update log at /updates, a forward-only roadmap, and one-click slash-command registration", date: "28 Jul 2026" },
  { number: 10, title: "Parties & online multiplayer, /status, vanity URLs - plus the missing bot heartbeat", date: "28 Jul 2026" },
  { number: 9, title: "feat(discord): one bot replacing Appy, Sapphire, Arcane and ServerStats", date: "27 Jul 2026" },
  { number: 8, title: "Roadmap: restructure into v1.2.0 / v1.3.0 / v1.4.0 with new plans", date: "20 Jul 2026" },
  { number: 7, title: "Deploy: classic-games-hub", date: "20 Jul 2026" },
  { number: 6, title: "Deploy: classic-games-hub", date: "20 Jul 2026" },
  { number: 5, title: "Add playable Snake and Tetris launch titles", date: "21 Mar 2026" },
  { number: 4, title: "Add richer game metadata support", date: "21 Mar 2026" },
  { number: 3, title: "Extract shared frontend assets and slim page HTML", date: "21 Mar 2026" },
  { number: 2, title: "Enhance game landing page with metadata-driven content", date: "21 Mar 2026" },
  { number: 1, title: "Add browser-persisted player stats dashboard", date: "21 Mar 2026" },
];

/** Totals shown at the top of /updates, derived so they can never drift. */
export const UPDATE_STATS = {
  releases: RELEASES.length,
  features: RELEASES.reduce((n, r) => n + r.groups.reduce((m, g) => m + g.items.length, 0), 0),
  landed: LANDED.length,
  pullRequests: PULL_REQUESTS.length,
};
