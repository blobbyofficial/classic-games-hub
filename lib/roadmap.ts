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
 * Three entries, because the work behind them is three different sizes and
 * versioning it the same way would mislead.
 *
 * v1.6.0 is the whole library being rebuilt, one game at a time, and it is
 * happening now - every game on the site is flagged in development while it
 * waits its turn. Head to Head moves to v1.7.0 behind it: multiplayer built on
 * engines that are still being replaced would have to be built twice. Its
 * "Make the popular games good" group is gone from it rather than copied,
 * because that group is what v1.6.0 became. The last entry is unscheduled on
 * purpose: ideas worth writing down are not the same as work anyone has
 * committed to.
 */
export const ROADMAP: RoadmapRelease[] = [
  {
    version: "v1.6.0",
    codename: "Ground Up",
    status: "in-progress",
    timeframe: "Now - the arcade is mid-rebuild",
    summary:
      "Twenty-six games, written across a year while the conventions for writing them were still settling, and it shows in ways that are measurable rather than a matter of taste: four of the twenty-six respond to the difficulty picker, three honour reduced motion, six have a pause button that does not pause, and the sound slider in settings controls nothing at all. So every game is being rebuilt rather than three of them being patched. Each one is staff-only while its turn comes round, and reopens when it is genuinely better - not when it is merely finished.",
    groups: [
      {
        heading: "The standard every game is rebuilt to",
        icon: "Wrench",
        blurb:
          "Written once, and every one of the twenty-six rewrites leans on it. Fixing the same fault twenty-six times is how the library got into this state.",
        items: [
          {
            title: "A house standard for how a game feels",
            description:
              "Write down what every engine owes the player and hold new ones to it: fixed-timestep simulation with interpolated rendering, a buffered input queue, a defined difficulty ramp, a pause that genuinely pauses, and state that survives a tab-out. Twelve engines currently hand-roll their own animation loop instead of using the shared one, and several move in pixels-per-frame rather than per-second - which means they are quietly a different game on a slow phone than on a fast laptop.",
            status: "in-progress",
          },
          {
            title: "One game shell, not two",
            description:
              "Party matches build their engines through a separate, stripped-down copy of the game page - no pause, no fullscreen, no difficulty, and no on-screen controls at all, so playing in a party on a phone means playing with no controls. It also submits every party score to the regular board whatever difficulty was picked. One shell, used by both, fixes all of that at once.",
            status: "in-progress",
          },
          {
            title: "A pause that pauses",
            description:
              "Six engines return a pause function that does nothing. Gem Cascade keeps draining its ninety-second clock behind the pause overlay; Simon and Memory Match keep firing queued callbacks and can advance while you are not looking. The site auto-pauses when you switch tabs, which means it has been promising those six games' players something it could not deliver.",
            status: "in-progress",
          },
          {
            title: "Difficulty that works on all twenty-six",
            description:
              "The tuning helper exists and four games use it, so the picker is hidden everywhere else rather than shown doing nothing. Finish the other twenty-two and the exception can be deleted. Also correct the note under the picker that still says easy and hard are unranked - they have had their own leaderboards since v1.5.1.",
            status: "next",
          },
          {
            title: "Sound the volume slider actually controls",
            description:
              "Every game makes noise through one shared square-wave beep at a hard-coded volume. Settings has a sound slider, it saves what you set, and no game reads it. A small mixer that everything routes through gives the slider something to do, makes mute possible, and lets a game have a set of sounds rather than two pips.",
            status: "next",
          },
          {
            title: "Shared juice",
            description:
              "Particles, screen shake, hit pause and easing available to every engine instead of reinvented per game. Eight games have genuinely good feedback and eight have essentially none - and four of those do not animate their core state change at all, so tiles and cards simply teleport. All of it off under reduced motion, which is a setting and not a hint.",
            status: "next",
          },
          {
            title: "Playable on a phone, and by keyboard",
            description:
              "Seven games accept no keyboard input whatsoever, and controls drawn onto the canvas - Hangman's alphabet, Mastermind's palette, the two-player toggle in Noughts and Crosses - are invisible to keyboards and screen readers alike. The three newest games are also missing their screen-size entries, which is why a widescreen driving game renders in a tall narrow box with no touch controls.",
            status: "next",
          },
          {
            title: "Per-game mastery",
            description:
              "Each game gets its own progression: a handful of goals that teach it - survive a minute, clear without losing a life, finish on hard - rather than one global XP number that treats every game as interchangeable. It gives the rewritten games something to show for the depth they gain.",
            status: "later",
          },
        ],
      },
      {
        heading: "Arcade",
        icon: "Gamepad2",
        items: [
          {
            title: "Snake",
            description:
              "Only one turn is remembered, so taking a corner quickly - up then left inside a single step - throws the first press away and runs you into your own tail. The glow never dims for reduced motion, and it reports the snake's length to the server where the number of seconds played belongs, so every Snake run ever recorded has a made-up duration. Rebuilt with a real input queue, food worth chasing rather than one indistinguishable pellet, walls as an option rather than always wrapping, and a death the screen reacts to.",
            status: "in-progress",
          },
          {
            title: "Neon Runner",
            description:
              "One of the three named as worst to play, and on a phone it is worse than named: the touch button only ever sends a jump, so the ducking its overhead obstacles demand is physically impossible. On a keyboard it is a flat run with no coyote time, no jump buffer, and a hit box that matches the drawing rather than what feels fair. Gets a second touch control, forgiveness at both ends of a jump, a speed curve instead of a step, pickups worth diverting for, and a background that tells you how fast you are actually going.",
            status: "in-progress",
          },
          {
            title: "Frogger",
            description:
              "Named as one of the worst, and missing the point of the game entirely: there are no lily pads to fill, so reaching the top just teleports you back to the start for a hundred points and nothing accumulates. No timer, no turtles that submerge, no log that carries you off the edge, and hops that snap between squares with no movement in between. Rebuilt as the actual game - five homes to fill, a clock, a difficulty ramp per level, and hit boxes that forgive the pixel you were not looking at.",
            status: "in-progress",
          },
          {
            title: "Breakout",
            description:
              "Its physics ignore elapsed time completely, so the ball is faster on a faster screen, and collisions only ever flip the ball vertically on first contact - which is why hitting a brick on its side or corner sends the ball somewhere it clearly should not go. Gets frame-rate independence, collision that resolves against the face it actually struck, brick types worth telling apart, power-ups, and multi-ball.",
            status: "next",
          },
          {
            title: "Pong",
            description:
              "The opponent tracks the ball at one fixed speed with no reaction delay and no error, so it is not beatable so much as out-reachable, and the score shown while playing disagrees with the score submitted at the end. It is also the most obvious two-player game on the site and has neither a local nor an online mode. Gets an opponent that misreads and recovers at three difficulties, spin off the paddle, and two players on one keyboard.",
            status: "next",
          },
          {
            title: "Simon",
            description:
              "Already one of the better-feeling games - a real tone per pad, bloom on press, a sequence that speeds up. What it is missing is the pressure: no strict mode where one slip ends it, no timeout forcing you to answer, and a best score that is wiped by pressing restart rather than kept.",
            status: "next",
          },
          {
            title: "Whack-a-Mole",
            description:
              "Moles appear and vanish instantly, with no rising and no retreat, so there is nothing to read and nothing to anticipate - only reaction to a shape that blinked into existence. Gets moles that emerge and duck at a speed you can learn, waves with patterns rather than uniform randomness, a combo for consecutive hits, and something to lose for hitting the wrong one.",
            status: "next",
          },
          {
            title: "Turbo Horizon",
            description:
              "A genuine pseudo-3D racer - curved hills, traffic that shifts with the road, a sun sitting on the horizon - rendered into a tall narrow box because it never got a screen-size entry, and given no touch controls for the same reason. The throttle is also automatic, so there is nothing to drive but steering. Gets its proper widescreen stage, a throttle and brake, checkpoints and a clock to beat, and traffic you can read far enough ahead to plan around.",
            status: "next",
          },
        ],
      },
      {
        heading: "Puzzle",
        icon: "Box",
        items: [
          {
            title: "2048",
            description:
              "Named as one of the worst, and the reason is one unused variable: the code works out how far each tile should slide and then throws it away, so tiles teleport between states with no movement and no merge. Pausing does nothing. Rebuilt with the animation it already almost has, an undo, a running best tile, the option to keep going past 2048, and larger boards for anyone who has stopped finding it hard.",
            status: "in-progress",
          },
          {
            title: "Tetris",
            description:
              "It has a ghost piece and almost nothing else the modern game is built on: no next-piece preview, no hold, no lock delay to slide a piece home, no delayed auto-shift so moving across the board means hammering a key at whatever rate the operating system repeats it, and a rotation that is a naive coordinate flip rather than the kick table every player's muscle memory expects. Rebuilt to the guideline, with a proper bag randomiser, line-clear feedback, and touch controls that are not a swipe approximation.",
            status: "next",
          },
          {
            title: "Gem Cascade",
            description:
              "Its clock is advanced inside the drawing code, so pausing the game does not pause the ninety seconds. Cascades resolve by rewriting the grid behind a timer - nothing falls, nothing clears, gems simply become different gems. The controls even promise swiping, which was never implemented. Gets real falling and clearing, cascade scoring that rewards the chain, special gems, a shuffle when no move exists, and the swipe it has been advertising.",
            status: "next",
          },
          {
            title: "Bubble Pop",
            description:
              "One of the better engines already - a hex grid, a dotted aim line that reflects off the walls, clusters that shear off and fall under gravity. What it has no version of is pressure: the ceiling never descends, shots are unlimited, and there are no levels, so a careful player can sit there indefinitely. Gets a descending ceiling, a shot counter, a swap for the next bubble, and levels with a reason to hurry.",
            status: "next",
          },
          {
            title: "Minesweeper",
            description:
              "The hard parts are already right - the first click is always safe, long-press flags on touch. It is the furniture that is missing: no timer, no counter for how many mines are left, and no chording, which is how the game is actually played at speed. Its mines and flags are also drawn as emoji, so the board looks different on every device.",
            status: "next",
          },
          {
            title: "Memory Match",
            description:
              "The thinnest game here. Cards flip instantly with no animation at all, so there is nothing to watch and nothing to remember by; pause does nothing and its queued flip-backs keep running behind the overlay; there is one fixed grid, no timer, and no keyboard. Gets a flip worth seeing, board sizes as difficulty, a clock, and a scoring rule that rewards remembering rather than surviving.",
            status: "next",
          },
          {
            title: "15 Puzzle",
            description:
              "Quietly one of the best-built games on the site: it checks the shuffle is solvable, eases every tile into place, and runs a cascade when you finish. It is simply too small - one fixed four-by-four with no larger boards, no undo, no hint when stuck, and no option to solve a picture instead of numbers.",
            status: "next",
          },
          {
            title: "Hangman",
            description:
              "Twenty words, hard-coded in the file, all on one theme - so a couple of games in you are being asked the same words again. The alphabet is painted onto the canvas and clicked by coordinate, which means no screen reader can find it and no keyboard can tab to it, despite typing already working. Gets categories with real word lists, a hint worth spending something on, definitions once the word is out, and a keyboard that exists as an actual keyboard.",
            status: "next",
          },
          {
            title: "Lights Out",
            description:
              "Nicely made - bulbs that ease, warm bloom, ripples along the cross - and completely unplayable without a mouse, since it takes no keyboard input at all. One fixed five-by-five, and a scramble of random toggles with no guarantee about how hard the result is, so one board is trivial and the next is not. Gets board sizes, generated puzzles with a known minimum solution, a par to beat, and keys.",
            status: "next",
          },
          {
            title: "Cube",
            description:
              "The strongest engine in the library and it should be said plainly: exact ninety-degree integer turns that cannot drift however long you play, and queued animation so fast fingers never lose a move. Held back by missing its screen-size entry, no timer or inspection period, no undo, one fixed scramble depth, and only the one cube size. Gets scrambles by difficulty, a proper speedcubing clock, undo, standard notation, and two-by-two and four-by-four.",
            status: "next",
          },
          {
            title: "Labyrinth",
            description:
              "The only true 3D game here, with dual-thumb touch controls and a map that fills in only where you have actually walked - and then three hand-carved mazes, so once you have learnt them there is nothing left. No difficulty, no mouse look on desktop, missing its screen-size entry, and nothing inside the maze except the way out. Gets generated mazes at chosen sizes, something to find rather than only somewhere to reach, and a reason to hurry.",
            status: "next",
          },
        ],
      },
      {
        heading: "Shooter",
        icon: "Crosshair",
        items: [
          {
            title: "Space Invaders",
            description:
              "Its own description on this site promises playing \"from behind your barricades\", and there are no barricades - the single most recognisable thing about the game is absent. There are also no alien types worth different points, no saucer crossing the top, and the aliens are static rounded rectangles rather than the two-frame shuffle the whole game is remembered for. Gets the barriers it already claims, ranked aliens, the saucer, and a formation that tightens rather than only speeding up.",
            status: "later",
          },
          {
            title: "Asteroids",
            description:
              "Rocks respawn without the wave ever getting harder, so it settles into the same difficulty forever, and it accepts no touch input of its own - the on-screen buttons are pretending to be a keyboard. No explosion when a rock breaks, no saucer, no hyperspace escape, and the collision check compares everything against everything. Gets waves that escalate, thrust and destruction you can feel, and the missing pieces of the arcade original.",
            status: "later",
          },
          {
            title: "Target Rush",
            description:
              "The best-feeling game on the site - targets bloom in, burst into particles, rings expand, and a combo climbs to eight. It already counts every hit and every shot and then never shows you either, which is the one number this kind of game lives on. Gets accuracy on screen and on the leaderboard, difficulty, a crosshair, and targets that punish a careless click.",
            status: "later",
          },
        ],
      },
      {
        heading: "Strategy",
        icon: "Brain",
        items: [
          {
            title: "Noughts and Crosses",
            description:
              "There is one opponent: perfect play with a deliberate twelve per cent slip. Twelve per cent is not a difficulty and it is not a personality - it is a coin flip that occasionally hands you a game you did not earn. Local two-player does exist, behind a toggle painted onto the canvas that no keyboard can reach and no screen reader can announce, and the game accepts no keys at all. Gets three real opponents, keyboard play, and a board that shows you why it won.",
            status: "later",
          },
          {
            title: "Connect Four",
            description:
              "A decent opponent searching to a hard-coded depth, which means exactly one difficulty forever. Its controls row on this very site advertises \"Mouse / 1-7\" and the game has no keyboard handler whatsoever, so the number keys have never done anything. Gets difficulty by search depth, the keyboard it already promises, an undo, and a highlight on the threat you are about to walk into.",
            status: "later",
          },
          {
            title: "Reversi",
            description:
              "A better opponent than anyone would guess - corner-aware position weighting, mobility, and a deeper search once the endgame is close enough to solve outright. All of that is hidden behind no difficulty setting at all, so it is take it or leave it. Gets its strength exposed as three levels, keyboard play, an undo, a move list, and a clearer read on why a square is worth taking.",
            status: "later",
          },
          {
            title: "Mastermind",
            description:
              "It submits your guess the instant the fourth peg lands, so a row cannot be reconsidered before committing it, and the only way to take a peg back is tapping empty space above the palette - which nothing anywhere tells you. Fixed at four slots and six colours with no difficulty, no labels for anyone who cannot separate the colours, and a pause that does nothing. Gets an explicit submit, difficulty by slots and colours, colour-blind-safe marking, and feedback that teaches the deduction.",
            status: "later",
          },
        ],
      },
      {
        heading: "Reopening the arcade",
        icon: "Rocket",
        blurb:
          "Every game is staff-only until its rebuild is done. This is how each one comes back.",
        items: [
          {
            title: "One game at a time",
            description:
              "A game leaves development only when it meets the standard above and the definition of done below - not when the rewrite compiles. Its badge disappearing is the announcement. Nothing waits for the other twenty-five, so the library reopens steadily rather than all at once at the end.",
            status: "in-progress",
          },
          {
            title: "Played on the real site before you get it",
            description:
              "This is what the staff-only lock is for. Each rebuild is played on production, on an actual phone and an actual desktop, before it is opened up - because the faults being fixed here are exactly the kind that only appear on a real device.",
            status: "in-progress",
          },
          {
            title: "Your scores survive all of it",
            description:
              "No leaderboard is reset, no favourite is dropped and no rating is cleared by any of this. A rebuilt game keeps its history, which is also the honest test of whether the rebuild changed the game's difficulty more than intended.",
            status: "in-progress",
          },
        ],
      },
    ],
  },
  {
    version: "v1.7.0",
    codename: "Head to Head",
    status: "later",
    timeframe: "After v1.6.0",
    summary:
      "The arcade has twenty-six games and no good way to play one against another person. This release is what happens once v1.6.0 has finished rebuilding them: give people something to do with each other, and finally tell them when it is happening. Deliberately behind the rebuild rather than beside it - multiplayer written against engines that are still being replaced would only have to be written twice.",
    groups: [
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
