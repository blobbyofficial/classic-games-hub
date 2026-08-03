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
 * Split across three entries rather than one, because the requests behind them
 * are three different sizes and versioning them the same way would mislead.
 *
 * v1.5.1 is the patch it says it is: renames, a wrong date, a stray banner,
 * settings that needed filling out. v1.6.0 is not - rewriting the engines,
 * adding real multiplayer and building tournaments is a release in its own
 * right, and calling that a point-one would set the wrong expectation for how
 * long it takes. The last entry is unscheduled on purpose: ideas worth writing
 * down are not the same as work anyone has committed to.
 */
export const ROADMAP: RoadmapRelease[] = [
  {
    version: "v1.5.1",
    codename: "Sanded Down",
    status: "next",
    timeframe: "Next up",
    summary:
      "The rough edges. Nothing here is a new headline feature - it is the naming that was wrong, the date that was never right, the settings page that never grew past four toggles, and the consent story a site collecting anything at all is expected to have. Small things, but they are the ones people actually bump into.",
    groups: [
      {
        heading: "Corrections",
        icon: "Gauge",
        blurb: "Three things that are simply wrong, in rising order of how long they have been wrong.",
        items: [
          {
            title: "Noughts and Crosses",
            description:
              "Rename Tic-Tac-Toe throughout - the game title, the party picker, the controls list and the seeded games row. The rest of the site is written in British English, so this one has been the odd one out since it launched. The slug stays `tictactoe` so existing scores, leaderboard rows and shared links keep working.",
            status: "next",
          },
          {
            title: "Retire the \"Rebuilt for 2026\" banner",
            description:
              "It was a launch flag, and a launch flag is only useful while it is news. Removing it from the homepage hero.",
            status: "next",
          },
          {
            title: "Fix \"last seen\"",
            description:
              "It reports the day the account was created, for everyone. `profiles.last_seen_at` defaults to `now()` when the row is made and the only thing that ever writes it again is the `heartbeat()` RPC - which has never landed for a single account. Every profile in the database currently has `last_seen_at` exactly equal to `created_at`, to the microsecond, despite presence being switched on. So the fix is not the display: it is finding why the write never arrives, then making the failure visible instead of silent, since the call is fire-and-forget and a rejection today shows up as nothing at all.",
            status: "next",
          },
        ],
      },
      {
        heading: "Settings, privacy and consent",
        icon: "SlidersHorizontal",
        blurb:
          "The settings page has never been more than a short list of switches, and the consent story needs to exist before any more data is collected.",
        items: [
          {
            title: "A settings panel worth opening",
            description:
              "Reorganise it into sections you can navigate - account, appearance, gameplay, privacy, notifications, connections, data - with search, and per-setting explanations of what each one actually changes. Then fill the gaps: default game difficulty, reduced-motion and high-contrast toggles, sound and music volume separately, keyboard remapping, timezone and date format, and who may message or friend you.",
            status: "next",
          },
          {
            title: "Cookies and analytics, opt-in",
            description:
              "A real consent layer: a banner that sets nothing beyond strictly-necessary cookies until a choice is made, granular categories rather than one all-or-nothing button, refusal as easy as acceptance, a stored record of what was consented to and when, and a way to change your mind afterwards from the settings page. Plus a plain-English cookie and privacy policy naming every cookie and why it exists, self-serve data export and account deletion, and honouring Global Privacy Control. Worth stating plainly: this is a legal area and none of it is legal advice - the build can follow the letter of GDPR/PECR as best we understand it, but the policy wording should be checked by someone qualified before it goes live.",
            status: "next",
          },
          {
            title: "Notifications that reach you",
            description:
              "Web push for the things worth interrupting someone about - a friend request, a party invite, your record being beaten, a tournament starting - built on the existing notifications table so nothing needs a second source of truth. Alongside it, an opt-in email list with a genuine double opt-in, granular categories (product news, weekly recap, tournament reminders), one-click unsubscribe in the header, and a hard rule that transactional email and marketing email never share a list.",
            status: "next",
          },
        ],
      },
      {
        heading: "Playing",
        icon: "Gamepad2",
        blurb: "Two things that affect every game on the site rather than any one of them.",
        items: [
          {
            title: "Choose your difficulty",
            description:
              "A difficulty control on the game page itself rather than buried in a settings menu or fixed by the engine: easy, regular, hard, and per-game extras where they make sense (grid size, starting speed, lives). Scores stay comparable because the leaderboard records which difficulty a run was set to and ranks each separately - otherwise easy mode quietly erases every record on the board.",
            status: "next",
          },
          {
            title: "Fullscreen that actually fits",
            description:
              "Today fullscreen enlarges the page rather than the game, so a fixed-ratio canvas sits in the middle of a lot of empty background. Instead: scale the canvas to the largest whole-pixel multiple the display allows, letterbox with the game's own palette rather than black, keep the aspect ratio honest on ultrawide and on phones in both orientations, hide every piece of surrounding UI, and hold the on-screen controls in reach on touch devices.",
            status: "next",
          },
        ],
      },
      {
        heading: "Social and safety",
        icon: "MessageSquare",
        items: [
          {
            title: "Stories you can manage",
            description:
              "Delete your own stories, and post more than one at a time - currently a new story silently replaces the old one, which is surprising rather than helpful. Several live at once in the order posted, each with its own expiry, a viewer count, and an archive of your expired ones that only you can see.",
            status: "next",
          },
          {
            title: "Report a message, and somewhere for reports to go",
            description:
              "Reporting exists for profiles but not for what people actually say. Add a report action to any direct or group message, capturing the surrounding conversation so a report arrives with the context needed to judge it. In the admin dashboard, a moderation queue showing the reported message in place, the thread around it, the reporter, the accused, and one-press actions - dismiss, warn, timeout, ban - each written to the audit log. Staff read a reported conversation only, never the inbox at large.",
            status: "next",
          },
        ],
      },
    ],
  },
  {
    version: "v1.6.0",
    codename: "Head to Head",
    status: "later",
    timeframe: "After v1.5.1",
    summary:
      "The arcade has twenty-six games and no good way to play one against another person, and several of the best-known titles are the weakest to actually play. This release is about both: bring the flagship games up to the standard of the newest ones, then give people something to do with them together.",
    groups: [
      {
        heading: "Make the popular games good",
        icon: "Gamepad2",
        blurb:
          "The games most people open first are among the oldest on the site, written before the engine conventions settled. Being popular is exactly why they should be the ones that get rewritten.",
        items: [
          {
            title: "Rewrite the flagship engines",
            description:
              "Runner, Frogger and 2048 first, then the rest of the originals. The recurring faults are the same across them: input that drops presses because it is polled per frame instead of buffered, movement tied to frame rate rather than elapsed time, no coyote time or input forgiveness, collision boxes that match the drawing rather than what feels fair, difficulty that jumps instead of ramping, and no feedback on a hit beyond the score changing. Fixing those is a per-engine job, not a shared patch.",
            status: "later",
          },
          {
            title: "A house standard for feel",
            description:
              "Write down what every engine owes the player, and hold new games to it: fixed-timestep simulation with interpolated rendering, a buffered input queue, a defined difficulty ramp, pause that genuinely pauses, resumable state on tab-out, and consistent juice - screen shake, hit pause, particles - available to every engine rather than reinvented per game. Cheaper than fixing the same bug twenty-six times.",
            status: "later",
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
              "Both were asked for as new categories, but a game currently holds exactly one category, so adding them as categories would force Labyrinth and Cube out of Puzzle and Noughts and Crosses out of Strategy to gain the new label. They are properties, not genres - a game can be a 3D puzzle, or a multiplayer strategy game. So: a tags column alongside the category, seeded with `3d` and `multiplayer`, with filter chips on the arcade page that combine. Room to grow later - `quick`, `endless`, `touch-friendly` - without another schema change each time.",
            status: "later",
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
              "An opponent that is always available, at difficulty levels that correspond to something real - easy makes mistakes on purpose, hard plays the best move it can find. Also the honest fallback when nobody else is around, and the way to practise before playing a person.",
            status: "later",
          },
          {
            title: "Versus someone next to you",
            description:
              "Two players, one screen, sharing a keyboard or taking turns on a phone. The simplest multiplayer to build and often the most fun, and it needs no network code at all.",
            status: "later",
          },
          {
            title: "Versus someone online, by join code",
            description:
              "A short code you send to a friend, on top of the party system already carrying real-time state. Reconnect if the tab closes, a clear forfeit rather than a game that hangs when someone leaves, spectators for anyone else in the party, and a rematch button that does not make you swap codes again.",
            status: "later",
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
              "A party mode that runs through several games in sequence and crowns an overall champion. By default the five most played games at regular difficulty; the host can swap any of them, change the difficulty, and set the length. Points per round rather than sudden death, so one bad game does not end it, with a running scoreboard between rounds and a final standing worth screenshotting. Winners recorded on the profile, and the result announced to Discord.",
            status: "later",
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
            title: "Replays and ghosts",
            description:
              "Record the input trace rather than video - a few kilobytes - and a run can be replayed, watched from a leaderboard entry, or raced against as a ghost. Also the most reliable way to spot a score that is not genuine.",
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
              "Post the daily challenge automatically each morning and the standings each evening, and announce tournaments as they start, run and finish - with the winner given a role that expires when the next one is won.",
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
