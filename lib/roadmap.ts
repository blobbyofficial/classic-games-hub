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

/**
 * Two entries, because the work behind them is two different sizes and
 * versioning it the same way would mislead.
 *
 * v1.6.0 is not a patch - rewriting the engines,
 * adding real multiplayer and building tournaments is a release in its own
 * right, and calling that a point-one would set the wrong expectation for how
 * long it takes. The last entry is unscheduled on purpose: ideas worth writing
 * down are not the same as work anyone has committed to.

 */
export const ROADMAP: RoadmapRelease[] = [
  {
    version: "v1.6.0",
    codename: "Head to Head",
    status: "later",
    timeframe: "After v1.5.1",
    summary:
      "The arcade has twenty-six games and no good way to play one against another person, and several of the best-known titles are the weakest to actually play. This release is about both: bring the flagship games up to the standard of the newest ones, then give people something to do with them together - and finally tell people when it is happening.",
    groups: [
      {
        heading: "Make the popular games good",
        icon: "Gamepad2",
        blurb:
          "The games most people open first are among the oldest here, written before the engine conventions settled. Being popular is exactly why they should be the ones rewritten.",
        items: [
          {
            title: "Rewrite the flagship engines",
            description:
              "Frogger, Neon Runner and 2048 first - the three named as worst to play, and between them the most opened games on the site. The faults repeat across all of them: input polled once per frame so quick presses vanish, movement tied to frame rate rather than elapsed time so the game is harder on a slow device, no input buffering or forgiveness window, hit boxes that match the drawing rather than what feels fair, difficulty that steps rather than ramps, and no feedback on a hit beyond a number changing.",
            status: "later",
          },
          {
            title: "A house standard for how a game feels",
            description:
              "Write down what every engine owes the player and hold new ones to it: fixed-timestep simulation with interpolated rendering, a buffered input queue, a defined difficulty ramp, a pause that genuinely pauses, state that survives a tab-out, and shared juice - screen shake, hit pause, particles - available to every engine instead of reinvented per game. Cheaper than fixing the same bug twenty-six times.",
            status: "later",
          },
          {
            title: "Per-game mastery",
            description:
              "Each game gets its own progression: a handful of goals that teach it - survive a minute, clear without losing a life, finish on hard - rather than one global XP number that treats every game as interchangeable. It gives the rewritten games something to show for the depth they gain.",
            status: "idea",
          },
        ],
      },
      {
        heading: "Finding the right game",
        icon: "Box",
        items: [
          {
            title: "3D and multiplayer, as tags rather than categories",
            description:
              "Both were asked for as categories, but a game holds exactly one category, so adding them as categories would force Labyrinth and Cube out of Puzzle and Noughts and Crosses out of Strategy just to gain the label. They are properties, not genres - a game can be a 3D puzzle. A tags column alongside the category, with filter chips that combine, and room for `quick`, `endless` or `touch-friendly` later without another schema change each time.",
            status: "later",
          },
          {
            title: "Search that understands the arcade",
            description:
              "Twenty-six games is past the point where scrolling is browsing. Search across titles, tags and how a game plays, plus a shelf of \"like this one\" on every game page - the cheapest way to make the back half of the library visible at all.",
            status: "idea",
          },
        ],
      },
      {
        heading: "Playing against someone",
        icon: "Users",
        blurb:
          "Every game carrying the multiplayer tag should offer all three, so the tag means one predictable thing rather than whichever mode that game happened to get.",
        items: [
          {
            title: "Versus a bot",
            description:
              "An opponent that is always there, at difficulties that mean something - easy makes real mistakes rather than moving at random, hard plays the best line it can find. Also the honest fallback when nobody is online, and the way to practise before facing a person.",
            status: "later",
          },
          {
            title: "Versus someone next to you",
            description:
              "Two players, one screen, sharing a keyboard or passing a phone. The simplest multiplayer to build, often the most fun, and it needs no network code at all.",
            status: "later",
          },
          {
            title: "Versus someone online, by join code",
            description:
              "A short code you send a friend, built on the party system that already carries real-time state. Reconnect if a tab closes, a clear forfeit rather than a match that hangs when someone leaves, and a rematch button that does not make you swap codes again.",
            status: "later",
          },
          {
            title: "Quick play and rivalries",
            description:
              "A join code needs someone to send it to. Quick play pairs you with whoever else pressed it, roughly matched on that game's rating, and remembers who you keep meeting - a running head-to-head record with the people you play most, which is the part that makes anyone come back for one more.",
            status: "idea",
          },
          {
            title: "Watch a match",
            description:
              "Anyone else in the party can spectate rather than sit through it, on a short delay so a spectator cannot feed information back. The same view a tournament final would be shown through.",
            status: "idea",
          },
        ],
      },
      {
        heading: "Tournaments",
        icon: "Repeat",
        items: [
          {
            title: "Five games, one winner",
            description:
              "A party mode that runs several games in sequence and crowns an overall champion. By default the five most played at regular difficulty; the host can swap any of them, change the difficulty and set the length. Points per round rather than sudden death, so one bad game does not end it, a running scoreboard between rounds, and a final standing worth screenshotting.",
            status: "later",
          },
          {
            title: "Brackets, for when five games is not enough",
            description:
              "Single elimination with seeding for anything bigger than a party - sign-ups, byes for odd numbers, and a bracket that fills in live as rounds resolve. The five-game run is the casual mode; this is the one an actual event would use.",
            status: "idea",
          },
          {
            title: "Results that leave the site",
            description:
              "Winners recorded on the profile, announced to Discord as they happen, and the champion given a role that passes to the next winner rather than accumulating forever. A tournament nobody outside the party hears about is a private game with extra steps.",
            status: "idea",
          },
        ],
      },
      {
        heading: "Telling people things",
        icon: "Megaphone",
        blurb:
          "Held back from v1.5.1 deliberately: both need infrastructure that does not exist yet, and half a notification system is worse than none.",
        items: [
          {
            title: "Web push",
            description:
              "For the things worth interrupting someone about - a friend request, a party invite, your record being beaten, a tournament starting - built on the notifications table that already exists, so there is no second source of truth. Granular enough to take the tournament alerts and refuse everything else.",
            status: "later",
          },
          {
            title: "An email list worth being on",
            description:
              "Genuine double opt-in, categories rather than one list (product news, a weekly recap of your scores, tournament reminders), one-click unsubscribe in the header, and a hard rule that transactional and marketing email never share a list. Needs an email provider chosen and a sending domain verified before any of it can even be tested.",
            status: "later",
          },
        ],
      },
      {
        heading: "Keeping scores honest",
        icon: "Gauge",
        items: [
          {
            title: "A board per difficulty",
            description:
              "Easy and hard runs are already recorded in full, so the history is accumulating - what is missing is the leaderboard key. Widening it to (game, player, difficulty) means re-emitting the three functions that upsert scores and every read that assumes one row per player, correctly, in one migration. Worth doing carefully rather than quickly.",
            status: "later",
          },
          {
            title: "Replays, ghosts and validation",
            description:
              "Record the input trace rather than video - a few kilobytes - and a run can be replayed from a leaderboard entry, raced against as a ghost, or re-simulated on the server to check the score it claims is one those inputs could actually produce. Splitting the boards by difficulty makes leaderboards more valuable, which makes this worth doing sooner rather than later.",
            status: "idea",
          },
        ],
      },
    ],
  },
  {
    version: "Unscheduled",
    codename: "Ideas we are kicking around",
    status: "idea",
    timeframe: "No date",
    summary:
      "Written down so they are not lost, and deliberately not scheduled. Nothing here is a commitment - some of it will be built, some will turn out to be a bad idea once it is looked at properly, and some is here to be argued with.",
    groups: [
      {
        heading: "The site",
        icon: "Sparkles",
        items: [
          {
            title: "A daily challenge",
            description:
              "One game, one seed, the same for everyone, resetting at midnight - so scores are directly comparable in a way a free-play leaderboard never is. A streak for playing every day, and a shareable spoiler-free result card.",
            status: "idea",
          },
          {
            title: "An accessibility pass",
            description:
              "Colourblind-safe palettes per game, full keyboard remapping, a reduced-motion mode that goes further than the CSS one, proper focus order and screen-reader labelling in menus, and a difficulty floor that makes every game finishable. Worth doing on its own terms, not as a sub-item of something else.",
            status: "idea",
          },
          {
            title: "Play offline",
            description:
              "The single-player games are self-contained canvas engines with no server dependency mid-run, so a service worker could make the arcade work on a train, syncing scores when the connection returns.",
            status: "idea",
          },
          {
            title: "Seasonal events",
            description:
              "Short themed events with their own cosmetics and a limited-time game variant - the seasons system already built gives these somewhere to live.",
            status: "idea",
          },
        ],
      },
      {
        heading: "The Discord bot",
        icon: "Bot",
        items: [
          {
            title: "Play in Discord",
            description:
              "The turn-based games map cleanly onto message components - Noughts and Crosses, Connect 4 and Hangman are a grid of buttons and a state machine. Same rules and same engine as the site, so a game started in Discord could be finished in the browser.",
            status: "idea",
          },
          {
            title: "Challenge someone from Discord",
            description:
              "`/challenge @user game:` mints a join code for an online match on the site and DMs it to both of you - the shortest path from talking about a game to playing it.",
            status: "idea",
          },
          {
            title: "Daily challenge and tournament feeds",
            description:
              "Post the daily challenge automatically each morning and the standings each evening, and announce tournaments as they start, run and finish.",
            status: "idea",
          },
          {
            title: "Ticket transcripts in the dashboard",
            description:
              "Closed tickets currently end in Discord. Writing the transcript back to the admin panel would put support history in the same place as reports and the audit log.",
            status: "idea",
          },
        ],
      },
      {
        heading: "The Discord server",
        icon: "MessageSquare",
        items: [
          {
            title: "An onboarding path rather than a wall",
            description:
              "Rules, then verify, then a role picker for which games you care about - so a new member leaves the door with the channels they want already visible, instead of every channel at once.",
            status: "idea",
          },
          {
            title: "Self-assign role menus",
            description:
              "Colours, pronouns, and notification opt-ins for tournaments and events, as button menus that need no staff involvement.",
            status: "idea",
          },
          {
            title: "A scoreboard channel worth reading",
            description:
              "The live feed exists; a starboard alongside it would keep the genuinely remarkable runs rather than every high score, and per-game threads would stop one popular title burying the rest.",
            status: "idea",
          },
          {
            title: "Channels that unlock as you level",
            description:
              "A small reward for taking part, and a light barrier that raid accounts have to actually earn their way past.",
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
