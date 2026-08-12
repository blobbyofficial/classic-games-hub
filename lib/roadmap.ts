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
 * The whole arcade is being rebuilt, and the roadmap is shaped to match.
 *
 * v1.6.0 builds the platform every rebuild needs - a stage that fills the
 * screen, a real effects library, skins, sound, input - and reopens no games.
 * The three waves after it each rebuild and reopen one category, and inside
 * them **every game is its own group carrying the same four items**: the look,
 * the animation, the feel, and what it does with the whole screen. The
 * repetition is deliberate. It is what stops a game quietly receiving less than
 * the others, and it is visible at a glance to anyone reading the page.
 *
 * Head to Head sits behind the relaunch rather than beside it: multiplayer
 * written against engines that are still being replaced would only have to be
 * written twice.
 */
export const ROADMAP: RoadmapRelease[] = [
  {
    version: "v1.6.0",
    codename: "Ground Up",
    status: "in-progress",
    timeframe: "Now - the arcade is mid-rebuild",
    summary:
      "Every game on the site is being rebuilt, so every game is locked to staff while it waits its turn. This first release reopens none of them: it builds the machinery all twenty-six rebuilds run on. A stage that fills your whole screen instead of a small square in the middle of a page, an effects library so animation stops being something eight games happen to have, skins and arenas, sound that the volume slider actually controls, and input that does not throw your presses away.",
    groups: [
      {
        heading: "The stage",
        icon: "Maximize2",
        blurb:
          "The complaint underneath all the others: games play in a small box in the middle of a page, and even fullscreen letterboxes them.",
        items: [
          {
            title: "Games fill the screen, properly",
            description:
              "Pressing play hands the game your entire display. Not a 528-pixel-wide box on a page, and not today's fullscreen either - that deliberately letterboxes the canvas, so Snake uses about 56% of a laptop screen and Tetris about 35%. The frame around the game goes away and the game itself grows to fill what is left.",
            status: "in-progress",
          },
          {
            title: "Engines that can be any shape",
            description:
              "Right now an engine is told how big it is exactly once, when it starts, and eighteen of the twenty-six bake their board size and position into constants at that moment - so making the window wider leaves the board glued to the old top-left with dead space beside it. Engines gain the ability to be resized while running, and re-lay themselves out when they are. Every game then has to answer a question it has never been asked: what do you do with a screen that is a different shape?",
            status: "in-progress",
          },
          {
            title: "A HUD that scales",
            description:
              "Twenty-one of the twenty-six games hardcode their text sizes in pixels, which is fine in a 480-pixel box and unreadable across a 4K display. One scale factor, derived from the stage, applied to every score, timer, label and button the games draw.",
            status: "in-progress",
          },
          {
            title: "It has to work on a phone, not just survive one",
            description:
              "Real handling for the things phones actually do: a URL bar that collapses mid-run and changes the height, notches and gesture bars on all four edges rather than only the bottom, rotating the device, and the fixed tab bar that currently sits over the bottom of the screen. Where a browser will not give a page true fullscreen - which includes every iPhone - the game takes over the screen anyway, and you should not be able to tell which one you got.",
            status: "in-progress",
          },
          {
            title: "One game shell instead of two",
            description:
              "Party matches currently build their games through a separate, older copy of the player with no pause, no fullscreen, no difficulty and no on-screen controls at all - so playing in a party on a phone means playing with no controls. Both become one shell, or every improvement here has to be made twice and one of them will be forgotten.",
            status: "next",
          },
        ],
      },
      {
        heading: "Animation and effects",
        icon: "Sparkles",
        blurb:
          "Eight games have genuinely good feedback and eight have essentially none, because every effect in the arcade is hand-rolled inside one game and cannot be used by any other.",
        items: [
          {
            title: "A real effects library",
            description:
              "The shared helper file is 139 lines and contains no easing, no tweening, no particles, no screen shake and no colour blending - so a game either invents its own or does without. The best existing work gets promoted into something every game can use: Target Rush's particle bursts and expanding rings, Simon's screen shake and bloom, 15 Puzzle's frame-rate-correct easing, Reversi's staggered flip cascade.",
            status: "in-progress",
          },
          {
            title: "Separating what is true from what is shown",
            description:
              "Reversi is the only game that keeps its animation in a layer of its own, separate from the board state - which is exactly why it can flip a disc by swapping colour at the midpoint while it pinches through zero, and why 2048 and Gem Cascade cannot animate at all. Giving every engine that separation is the single change that makes animating everything possible rather than aspirational.",
            status: "in-progress",
          },
          {
            title: "Glow that can survive a big screen",
            description:
              "Every glow in the arcade is drawn with shadow blur, which is the slowest thing a canvas can do. It is fine in a small box and it is the first thing that will collapse at full screen with heavy effects. A proper additive glow pass replaces it, which both looks better and costs less.",
            status: "next",
          },
          {
            title: "Motion you can turn off, and that turns itself off",
            description:
              "Three of the twenty-six games currently honour reduced motion, despite it being a setting people have deliberately switched on. Every effect answers to it. And a frame-time budget quietly steps effects down on a weaker device rather than letting the game stutter.",
            status: "next",
          },
        ],
      },
      {
        heading: "Skins, arenas and how you get them",
        icon: "Palette",
        blurb:
          "Every game gets a set of looks. Some free, some earned, some bought, some booster-only, some handed out for events.",
        items: [
          {
            title: "Skins and arenas for every game",
            description:
              "A skin changes the thing you control and the pieces you move; an arena changes the world they sit in. Every game gets several of each, and because they are described in code rather than downloaded as pictures they cost almost nothing, recolour instantly and stay perfectly sharp on any screen. Three to six of each are free on day one, so the overhaul is visible to everyone without spending anything.",
            status: "next",
          },
          {
            title: "Earned, bought, boosted or given",
            description:
              "The rest come from playing: per-game mastery goals, achievements, the credits you already earn, booster exclusives, seasonal sets, and one-off grants for events and prizes. Kept deliberately separate from profile cosmetics - these belong to a game, and you should be able to have a different look set on all twenty-six at once.",
            status: "next",
          },
          {
            title: "An icon and effect set the whole arcade shares",
            description:
              "Lives, combos, multipliers, power-ups, medals, timers and every piece of on-screen furniture drawn as one family rather than twenty-six dialects. It is what will make a rebuilt arcade look like one place.",
            status: "later",
          },
        ],
      },
      {
        heading: "Sound",
        icon: "Volume2",
        items: [
          {
            title: "The volume slider does something",
            description:
              "Settings has a sound slider. It saves what you set. Nothing reads it. Every game makes noise through one shared square-wave beep at a fixed volume, which is why everything in the arcade sounds like the same two pips. A proper mixer fixes the slider, adds a mute, and lets each game have a real set of sounds.",
            status: "next",
          },
          {
            title: "Music, if you want it",
            description:
              "The site already composes its own background music in code. Games get the same treatment - optional per-game tracks that react to what is happening, duck under sound effects, and stay off until you ask for them.",
            status: "later",
          },
        ],
      },
      {
        heading: "How the games feel",
        icon: "SlidersHorizontal",
        items: [
          {
            title: "Presses that are not thrown away",
            description:
              "Most engines remember exactly one input. Take a corner in Snake quickly - up then left inside a single step - and the first press is simply discarded. Buffered input with forgiveness windows across every game, so what you meant is what happens.",
            status: "in-progress",
          },
          {
            title: "Difficulty on all twenty-six",
            description:
              "Four games respond to the difficulty picker. The other twenty-two are hidden from it, because showing a control that does nothing is worse than showing none. Finishing the job deletes that exception - and corrects the note underneath which still claims easy and hard are unranked, when each has had its own leaderboard since v1.5.1.",
            status: "next",
          },
          {
            title: "A pause that pauses",
            description:
              "Six games return a pause that does nothing at all. Gem Cascade keeps draining its ninety-second clock behind the overlay; Simon and Memory Match keep running queued events and can move on without you. Since the site pauses automatically when you switch tabs, those six have been quietly losing people their runs.",
            status: "next",
          },
          {
            title: "Touch controls rebuilt from scratch",
            description:
              "The on-screen buttons currently work by pretending to be a keyboard, which is why Neon Runner can only ever jump - there is no second fake key for ducking, so its overhead obstacles are impossible on a phone. Real held and analogue input, gestures, vibration, and controls for the three games that have none at all.",
            status: "next",
          },
          {
            title: "Playable without a mouse",
            description:
              "Seven games accept no keyboard input whatsoever. Controls painted onto the canvas - Hangman's alphabet, Mastermind's colour palette, the two-player toggle in Noughts and Crosses - cannot be reached by a keyboard or announced by a screen reader, because as far as the browser is concerned they are just paint.",
            status: "next",
          },
        ],
      },
      {
        heading: "How games come back",
        icon: "Rocket",
        items: [
          {
            title: "One at a time, in waves",
            description:
              "A game reopens when it meets the standard above and the definition of done below - not when its rewrite compiles. They come back grouped by category, so the library refills steadily instead of everything landing at the end.",
            status: "in-progress",
          },
          {
            title: "Played on the real site before you get it",
            description:
              "This is what the staff-only lock is for. Each rebuild is played on production, on a real phone and a real desktop, before it is opened up - because the faults being fixed here are exactly the kind that only show up on a real device.",
            status: "in-progress",
          },
          {
            title: "Nothing you have earned is reset",
            description:
              "No leaderboard is cleared, no favourite dropped, no rating lost. A rebuilt game keeps its whole history - which is also the honest test of whether a rebuild moved its difficulty more than intended.",
            status: "in-progress",
          },
        ],
      },
    ],
  },
  {
    version: "v1.6.1",
    codename: "Arcade Reborn",
    status: "next",
    timeframe: "After v1.6.0",
    summary:
      "The first eight games come back, rebuilt on the new platform. Every one of them gets the same four things: a new look with skins and arenas, animation on essentially everything that moves or changes, a pass over how it feels and how it handles on a phone, and a real answer to what it does with your whole screen.",
    groups: [
      {
        heading: "Snake",
        icon: "Gamepad2",
        blurb: "The oldest engine on the site and the most played. It gets the most work.",
        items: [
          {
            title: "The look",
            description:
              "Six arenas instead of one flat grid: a circuit board that lights along the traces you have already covered, a garden that grows behind you, a deep trench with drifting motes, a frozen lake that cracks, a night city seen from above, and a clean minimal board for people who want none of it. Six snakes with actual bodies - segments that bank into corners, a head that turns to face where it is going with eyes that track the food, a tail that tapers. Food becomes a handful of things worth telling apart, each with its own shape, glow and sound.",
          },
          {
            title: "Everything moves",
            description:
              "Nothing in Snake animates today except position, one cell at a time. Now: the snake glides between cells and leans through turns; the head squashes on impact; food breathes and bobs and bursts into segment-coloured particles when eaten; a ripple travels the length of the body each time you grow; the tail leaves a fading trail; arena lights react as you pass them; near-misses with your own body flash a warning; a combo for eating without turning stacks a visible multiplier; speeding up pulls a subtle motion streak across the board; and death is a slow-motion pinch, a screen shake, the colour draining out, and the last few seconds played back.",
          },
          {
            title: "Feel and mobile",
            description:
              "A real input queue, so a fast corner keeps both presses instead of throwing the first away. Walls as a choice rather than always wrapping. Swipes read from the whole gesture rather than the first 24 pixels, and a phone layout that puts the board above your thumb rather than under it. Three difficulties that change the board as well as the speed. It also fixes a quiet old bug: every Snake run ever recorded reported the length of the snake where the number of seconds played belongs.",
          },
          {
            title: "The whole screen",
            description:
              "Snake currently works out its grid shape from the shape of the canvas, so a wide screen would hand it about eight rows and a snake in a letterbox slit. Instead the play field is designed and centred, and the arena art fills the room around it - so a widescreen game looks composed rather than stretched.",
          },
        ],
      },
      {
        heading: "Breakout",
        icon: "Gamepad2",
        items: [
          {
            title: "The look",
            description:
              "Five arenas with their own physics personality and backdrop - a neon workshop, a sunken temple, an orbital station with the planet turning below, a storm, and a clean classic board. Bricks stop being flat rectangles: they have material, damage states you can read at a glance, and light that spills from the ones about to break. Paddle and ball get skins, and the ball leaves a trail coloured by how fast it is travelling.",
          },
          {
            title: "Everything moves",
            description:
              "Bricks crack in stages, shed chips, and burst into debris that bounces before fading. The paddle squashes on impact and tilts with your movement. The ball trails, streaks at speed, and leaves a brief scorch where it hits. Power-ups tumble down with a glow and a promise of what they are, and the paddle flashes as it collects them. Clearing a row runs a chain reaction along it. Multi-ball splits with a burst; losing a life cracks the screen; clearing a level pulls the whole board apart and assembles the next one in front of you.",
          },
          {
            title: "Feel and mobile",
            description:
              "The physics are rebuilt around elapsed time rather than frames, so the ball is not faster on a faster screen. Collisions resolve against the face actually struck - at the moment the ball only ever flips vertically on first contact, which is why a hit on the side or corner of a brick sends it somewhere obviously wrong. Ball angle responds to where on the paddle you hit and how you were moving. Power-ups, multi-ball, and a paddle that follows your thumb precisely on a phone.",
          },
          {
            title: "The whole screen",
            description:
              "A wider screen means a wider brick field and more room to recover, not a stretched one - the layout is generated to fit the space it is given, with the arena art carrying the edges. Vertical phone play keeps a taller, narrower field with the same rules.",
          },
        ],
      },
      {
        heading: "Pong",
        icon: "Gamepad2",
        items: [
          {
            title: "The look",
            description:
              "The simplest game here gets the most dramatic transformation, because there is so little on screen that everything counts. Arenas from a CRT cabinet with scanlines and phosphor bleed through to a neon court, a zero-gravity chamber and a rain-soaked rooftop. Paddle and ball skins, a centre line that reacts to play, and a scoreboard that feels like part of the world rather than text laid on top.",
          },
          {
            title: "Everything moves",
            description:
              "The ball trails and stretches with speed. Paddles squash on contact and recoil from a hard hit. Each bounce throws a ring of sparks and briefly lights the wall it struck. Rallies build heat: the longer one runs, the more the arena reacts, until a long rally has the whole court pulsing. Scoring shatters the ball, shakes the screen and animates the number over. Serves have a wind-up, match point changes the lighting, and the winning point ends in slow motion.",
          },
          {
            title: "Feel and mobile",
            description:
              "The opponent is rebuilt completely. Today it tracks the ball perfectly at one fixed speed, so it can only be out-reached, never outplayed. Now it has reaction time, misreads, recovery, and a preferred position it drifts back to - and three difficulties that change those rather than its raw speed. Spin off a moving paddle. Two players on one keyboard, and two thumbs on one phone. It also fixes the score shown during play disagreeing with the score submitted at the end.",
          },
          {
            title: "The whole screen",
            description:
              "Pong is the game that benefits most from a full screen and the one most obviously wasted in a small box. A wide court with real distance between paddles, so the ball genuinely travels and there is time to read it.",
          },
        ],
      },
      {
        heading: "Frogger",
        icon: "Gamepad2",
        blurb: "Named as one of the three worst to play, and currently missing the point of the game entirely.",
        items: [
          {
            title: "The look",
            description:
              "Five worlds, each with its own hazards and rhythm: a rain-slicked city street, a rushing river, a motorway at night, a lava field, and a snowbound crossing. Traffic becomes actual vehicles with lights, wheels and personality rather than coloured blocks. Six characters to cross with, each animated in their own way, and homes at the top that visibly fill up as you reach them.",
          },
          {
            title: "Everything moves",
            description:
              "Hops arc rather than snap between squares, with a squash on landing and a turn to face the way you are going. Water ripples around logs and turtles; turtles submerge with a warning; logs bob under your weight. Vehicles have headlights that sweep, brake lights, spray in the rain and a horn when they nearly get you. Reaching a home plants a flag with a burst of confetti and the row lights up. Near-misses slow time for a fraction of a second. Losing a life is a proper animation rather than a beep, and completing a level floods the board with celebration before the next one slides in.",
          },
          {
            title: "Feel and mobile",
            description:
              "The actual game arrives: five homes to fill before the level ends, a timer creating real pressure, turtles that dive, and logs that will carry you off the edge if you let them. Hit boxes that forgive the pixel you were not looking at. Input buffered so a queued hop lands the moment the last one finishes. Swipe and D-pad both properly supported, and difficulty that changes traffic patterns rather than only speed.",
          },
          {
            title: "The whole screen",
            description:
              "A wider road means more lanes visible and more to plan around, with the world extending past the play field rather than a stretched grid. On a phone it stays tall and readable, with the homes always in view so you can see what is left.",
          },
        ],
      },
      {
        heading: "Neon Runner",
        icon: "Gamepad2",
        blurb: "Currently impossible to play properly on a phone: the touch button only ever jumps.",
        items: [
          {
            title: "The look",
            description:
              "A runner should be about the world going past, and this one has almost none. Five routes with deep parallax - a neon skyline, a rain-soaked underpass, a sunrise desert, a data tunnel and a storm - each with foreground, midground and far layers moving at their own speeds. Six runners with real silhouettes and running animations, trails that intensify with speed, and obstacles you can read at a glance.",
          },
          {
            title: "Everything moves",
            description:
              "The runner has a full animation set: run cycle, wind-up, jump, peak, fall, land with a squash, roll, slide, stumble and wipeout. Speed pulls the background faster, stretches the trail, tightens the field of view and shifts the colour. Obstacles telegraph before they arrive. Coins arc toward you as they are collected and click up a counter. A near miss triggers a brief slow-motion and a flash. Milestones flash across the screen; the ground reacts to each landing; and a crash is a tumbling, shaking, slow-motion end with the score counting up over it.",
          },
          {
            title: "Feel and mobile",
            description:
              "The fix that matters most: a second touch control, so ducking exists at all on a phone - right now the button only ever sends a jump while the game still spawns obstacles you must duck under. Coyote time so a jump at the edge still counts, a jump buffer so an early press is not eaten, variable jump height, and hit boxes that match what feels fair rather than what is drawn. A speed curve that ramps rather than steps, and three difficulties.",
          },
          {
            title: "The whole screen",
            description:
              "A wide screen gives more warning of what is coming, which changes the game from reaction to planning - so the difficulty curve is tuned against how much road you can actually see. The parallax layers extend to fill whatever shape the screen is.",
          },
        ],
      },
      {
        heading: "Simon",
        icon: "Gamepad2",
        items: [
          {
            title: "The look",
            description:
              "Already one of the better-looking games, so this builds on it rather than replacing it. Five instrument sets, each with its own colours, tones and pad shapes - the classic four, a synth board, a drum machine, a set of chimes and a neon ring. The core in the middle becomes a living thing that reacts to the sequence, and the arena behind reacts to the round you are on.",
          },
          {
            title: "Everything moves",
            description:
              "Pads bloom, ripple outward and press inward when touched, all of which exist today and all of which get more. Added: the core pulses in time with the sequence and spins faster as rounds climb; each correct entry sends a wave through the ring; a completed sequence runs a full lap of light; the round number counts up with a flourish; the tempo rising is visible as well as audible; a mistake shakes, desaturates and replays the step you got wrong; and a new best score breaks the ring apart and reassembles it.",
          },
          {
            title: "Feel and mobile",
            description:
              "A strict mode where one mistake ends it, an input timeout so you cannot stall indefinitely, and difficulties that change sequence growth and speed together. A best score that survives pressing restart, rather than being wiped by it. Vibration on each pad, and a layout sized for thumbs rather than a mouse.",
          },
          {
            title: "The whole screen",
            description:
              "The ring scales to the shortest edge and centres, with the arena filling the rest - so on a wide screen it becomes a stage with the ring at its centre rather than a small circle floating in a big empty box.",
          },
        ],
      },
      {
        heading: "Whack-a-Mole",
        icon: "Gamepad2",
        items: [
          {
            title: "The look",
            description:
              "Five settings with their own inhabitants: a garden, a workshop, a haunted graveyard, an arcade cabinet and a laboratory. The things you hit stop being circles - each has a face, a body, an expression and a reaction. Gold targets, bombs and decoys are instantly distinguishable by shape rather than only colour, and the mallet is a real object that swings.",
          },
          {
            title: "Everything moves",
            description:
              "The single biggest change: things rise and duck rather than appearing and vanishing, so there is something to read and time. Added on top: a wind-up look before one emerges, a flinch on a near miss, a squash and a puff of dirt on a hit, a stunned wobble, a taunt for one that escapes, and a bomb that visibly arms before it blows. The mallet swings and recoils. Combos stack a visible multiplier with rising pitch; the score counter rolls rather than jumping; the last ten seconds change the lighting; and time running out ends in a freeze frame.",
          },
          {
            title: "Feel and mobile",
            description:
              "Waves with patterns worth learning rather than uniform randomness, a combo for consecutive hits, and a real penalty for hitting the wrong thing. Three difficulties changing spawn rate, how long targets stay up, and the mix of decoys. Keyboard support, which it has never had, and vibration on a hit.",
          },
          {
            title: "The whole screen",
            description:
              "The grid grows with the space - more holes on a bigger screen at higher difficulties, rather than the same nine stretched out - and the scene around it fills the rest.",
          },
        ],
      },
      {
        heading: "Turbo Horizon",
        icon: "Gamepad2",
        blurb: "A genuine pseudo-3D racer, currently rendered into a tall narrow box because it was never given a screen size.",
        items: [
          {
            title: "The look",
            description:
              "Five routes with distinct times of day and weather - a sunset coast, a neon night city, a desert dawn, a mountain pass in rain, and a storm. Roadside detail that actually passes: signs, pylons, barriers, crowds and scenery with real depth. Six cars with their own silhouettes, lights and paint, and traffic that looks like vehicles rather than obstacles.",
          },
          {
            title: "Everything moves",
            description:
              "The car leans into corners, squats under braking, lifts under acceleration and bounces over crests. Wheels turn. Brake lights and indicators work. Speed brings motion blur at the edges, a tightening field of view, wind noise and a shaking frame. The sky moves through its own cycle and weather rolls in. Overtaking throws a wash of air and sound. Drifting leaves marks. Checkpoints explode into light with time added counting up. A crash is a full spin-out with debris, slow motion and a recovery.",
          },
          {
            title: "Feel and mobile",
            description:
              "A throttle and a brake, so there is something to drive rather than only steering. Checkpoints and a clock to beat, laps, and traffic you can read far enough ahead to plan around. Three difficulties changing traffic density, speed and how forgiving the road is. Touch controls, which it has never had at all, including analogue steering and vibration under braking.",
          },
          {
            title: "The whole screen",
            description:
              "The one with the most to gain. Its projection currently divides by a hardcoded reference width, so widening the canvas both widens the road and squashes it vertically. A proper field-of-view and aspect model replaces it, and a widescreen display finally shows a widescreen road - which is the entire point of this kind of game.",
          },
        ],
      },
    ],
  },
  {
    version: "v1.6.2",
    codename: "Puzzle Reborn",
    status: "later",
    timeframe: "After v1.6.1",
    summary:
      "The eleven puzzle games, which between them contain both the best-built engine on the site and the thinnest. Four of them currently do not animate their core state change at all - tiles and cards simply teleport - so this wave is where the new animation layer earns its keep.",
    groups: [
      {
        heading: "Tetris",
        icon: "Box",
        items: [
          {
            title: "The look",
            description:
              "Five arenas that react to how you are doing - a calm studio, a neon shaft, a machine room with working parts, a storm and a clean competitive board. Piece skins from flat classic colours through to glass, metal and light. The well gets real framing, the next and hold queues become part of the furniture rather than absent, and danger is shown by the arena itself darkening as the stack climbs.",
          },
          {
            title: "Everything moves",
            description:
              "Pieces drop with weight and settle with a bounce. Hard drops leave a streak and thump the well. Rotations sweep rather than snap; a kick off a wall shows the nudge. Lines flash, compress and collapse with the stack falling to meet them, and a tetris runs a bigger effect than a single. Combos and back-to-back stack visible multipliers. The ghost piece breathes. Levelling up washes the arena in a new colour. A near-topout pulses red at the edges, and a game over freezes the board and drains it downward.",
          },
          {
            title: "Feel and mobile",
            description:
              "Everything modern that is currently missing: a next-piece preview, a hold slot, lock delay so a piece can be slid home, delayed auto-shift and repeat rates so moving across the board is not hammering a key at whatever rate the operating system happens to repeat, and a proper rotation system with wall kicks rather than the naive coordinate flip it uses now. A seven-bag randomiser. Its own touch controls rather than a swipe approximation, and three difficulties.",
          },
          {
            title: "The whole screen",
            description:
              "The well stays a fixed, fair shape - this is a competitive game and the field cannot grow - so the extra space becomes what a real Tetris screen has: hold and next queues, statistics, level and combo readouts, and arena art, arranged to fit whatever shape the display is.",
          },
        ],
      },
      {
        heading: "2048",
        icon: "Box",
        blurb: "Named as one of the three worst, and the reason is a single unused value.",
        items: [
          {
            title: "The look",
            description:
              "Five tile sets - the classic warm numbers, neon, glass, wooden blocks and a set that swaps numbers for symbols entirely - and five boards behind them. Higher tiles stop being darker rectangles and become genuinely special: light, texture and presence, so reaching one is visibly an event.",
          },
          {
            title: "Everything moves",
            description:
              "The whole reason it feels bad: the game works out exactly how far each tile should slide, then throws that away and redraws them in their new places. So nothing slides and nothing merges. Now tiles slide with easing, merges collide and pop with a burst, new tiles scale in, and the board shifts slightly in the direction you swiped. Big merges shake the screen and ripple outward. The score counts up rather than jumping, with the gain floating off the merge that earned it. A new best tile takes over the screen briefly. Running out of moves closes the board down deliberately rather than just stopping.",
          },
          {
            title: "Feel and mobile",
            description:
              "Undo. A running best tile. The option to keep playing past 2048 instead of the game ending at its own title. Board sizes as difficulty, from an easy five-by-five to a punishing three-by-three. A pause that pauses, which it currently does not. Swipes read from the whole gesture, with a nudge animation when a swipe cannot move anything.",
          },
          {
            title: "The whole screen",
            description:
              "The board stays square and centred - stretching it would be wrong - and the space around it holds the score, the best tile, the history of what you have made, and board art that reacts as the numbers climb.",
          },
        ],
      },
      {
        heading: "Gem Cascade",
        icon: "Box",
        items: [
          {
            title: "The look",
            description:
              "Five gem sets and five settings - a mine, a temple, a reef, a vault and a clean board. Gems get facets, internal light and weight rather than being flat coloured shapes, and special gems are unmistakable at a glance by shape, not just colour.",
          },
          {
            title: "Everything moves",
            description:
              "Currently the grid is rewritten behind a timer, so gems become different gems with nothing in between. Now: gems fall with gravity and bounce as they land, matches flare and shatter into shards, and cascades chain visibly with each step louder and brighter than the last. Swapping tilts both gems; an invalid swap bounces back. Special gems charge up as they form and detonate with their own effects. The combo counter climbs with rising pitch. The last ten seconds tint the board and quicken everything. Running out of moves shuffles the board in front of you rather than silently.",
          },
          {
            title: "Feel and mobile",
            description:
              "The timer moves out of the drawing code, so pausing actually pauses it - at the moment the clock keeps draining behind the pause overlay. Swipe to swap, which the controls have always promised and the game has never implemented. Cascade scoring that genuinely rewards chains, special gems for larger matches, an automatic shuffle when no move exists, a hint when you are stuck, and three difficulties.",
          },
          {
            title: "The whole screen",
            description:
              "A larger board on a larger screen at higher difficulties, rather than the same grid blown up, with the setting art framing it and the score and combo readouts given room of their own.",
          },
        ],
      },
      {
        heading: "Bubble Pop",
        icon: "Box",
        blurb: "Already one of the better engines. What it lacks is pressure.",
        items: [
          {
            title: "The look",
            description:
              "Five worlds with their own bubble materials - soap, glass, plasma, ice and a clean classic set. The glossy shading is already good and gets better: real refraction, light that passes through clusters, and a launcher that looks like a machine rather than a triangle.",
          },
          {
            title: "Everything moves",
            description:
              "The aim guide already reflects off walls; now it pulses and brightens as it nears a valid landing. Bubbles squash on impact and settle into the grid. Clusters pop in sequence rather than at once, shedding shards. Detached clusters fall with real weight and splash at the bottom. The launcher recoils and reloads visibly with the next bubble shown. The ceiling descending is a physical, threatening movement with the whole grid shifting. Danger pulses at the line. Clearing the board runs a full cascade, and a lost game has the grid press down over you.",
          },
          {
            title: "Feel and mobile",
            description:
              "The missing half of the game: a ceiling that descends over time, a shot counter, and levels with objectives, so a careful player can no longer sit there indefinitely. Swap to the next bubble. Fine aiming on a phone with a drag-to-aim control that does not put your thumb over the target. Three difficulties changing descent rate, colour count and starting layout.",
          },
          {
            title: "The whole screen",
            description:
              "Bubble size currently scales with the width of the canvas, so a wider screen makes the bubbles bigger rather than showing more of the field. That is inverted: bubbles keep a sensible size and a bigger screen shows a wider field with more room to aim.",
          },
        ],
      },
      {
        heading: "Minesweeper",
        icon: "Box",
        items: [
          {
            title: "The look",
            description:
              "Five board styles - the classic grey, a circuit board, an archaeological dig, a frozen field and a clean modern set. The emoji currently used for mines and flags go, replaced by drawn icons that look the same on every device rather than depending on the phone's font. Numbers get real typography and colour coding that survives colour blindness.",
          },
          {
            title: "Everything moves",
            description:
              "Tiles lift and fall rather than switching state. A cascade of empty squares opens outward as a wave from where you clicked, which is the most satisfying thing this game does and is currently instant. Flags plant with a small flourish. The cursor highlights its square and, when chording, the neighbours it would open. A wrong flag is corrected visibly at the end. Hitting a mine detonates it, then reveals the rest in a chain with the board shaking. Winning flags every remaining mine in sequence and lights the board.",
          },
          {
            title: "Feel and mobile",
            description:
              "The furniture the game is actually played with: a timer, a counter of mines remaining, and chording - clicking a satisfied number to open its neighbours - which is how the game is played at speed and is entirely absent. First-click safety and long-press flagging already work and stay. A clearer flag mode toggle for phones, and more difficulty steps including a custom board.",
          },
          {
            title: "The whole screen",
            description:
              "A bigger screen means a bigger board at higher difficulties rather than bigger squares, with the timer, counter and controls arranged around it. On a phone the board stays thumb-sized and scrollable if the difficulty is high.",
          },
        ],
      },
      {
        heading: "Memory Match",
        icon: "Box",
        blurb: "The thinnest engine in the library at 121 lines. Effectively a new game.",
        items: [
          {
            title: "The look",
            description:
              "Card backs and faces as real sets rather than emoji on a rectangle - animals, constellations, machine parts, playing cards and symbols - across five table settings. Cards get thickness, edges and a back design worth looking at, since you spend most of the game looking at the backs.",
          },
          {
            title: "Everything moves",
            description:
              "Cards currently flip instantly, which removes the one moment the game has. Now they rotate in 3D with a highlight sweeping across the face as it turns. A match pulses, lifts, glows and settles together; a miss shakes both and flips them back with a slower, more deliberate turn so you have time to commit them to memory. Dealing the board is an animation. The timer and move counter tick visibly. A streak of matches stacks a multiplier. The last pair is a slow reveal, and clearing the board sweeps every card up in a cascade.",
          },
          {
            title: "Feel and mobile",
            description:
              "Board sizes as difficulty rather than one fixed four-by-four, a timer, and scoring that rewards remembering rather than surviving. A pause that pauses - currently it is a no-op whose queued flip-backs keep firing behind the overlay. Keyboard play, which it has never had. Themed sets tied to unlocks.",
          },
          {
            title: "The whole screen",
            description:
              "Bigger boards on bigger screens, with the grid laid out to suit the shape of the display rather than a fixed number of columns, and the table setting filling the surround.",
          },
        ],
      },
      {
        heading: "15 Puzzle",
        icon: "Box",
        blurb: "Quietly one of the best-built games here. It is simply too small.",
        items: [
          {
            title: "The look",
            description:
              "Five tile materials - numbered classic, brushed metal, wood, glass and neon - plus an image mode that slices a picture instead of numbering tiles. The solved-state rainbow cascade it already runs is kept and extended.",
          },
          {
            title: "Everything moves",
            description:
              "Tiles already ease into their slots, which is the right foundation. Added: tiles that cannot move nudge and spring back; a whole row or column pushed at once slides together; correctly placed tiles settle with a click and a glow; the empty slot has a subtle presence of its own; the move counter rolls; a hint traces the path a tile should take; and solving runs the existing cascade with the board lifting and reassembling into the finished picture.",
          },
          {
            title: "Feel and mobile",
            description:
              "Board sizes from three-by-three to six-by-six as difficulty, undo, a hint, and an optional solver that shows the way rather than doing it for you. It already guarantees the shuffle is solvable, which many versions do not, and that stays. Push a whole row with one swipe rather than one tile at a time.",
          },
          {
            title: "The whole screen",
            description:
              "The board stays square and centred with the material and setting art filling the room, and the move counter, timer and best time given proper space rather than being squeezed above the grid.",
          },
        ],
      },
      {
        heading: "Hangman",
        icon: "Box",
        items: [
          {
            title: "The look",
            description:
              "Five themes that change the whole framing - the classic gallows, a lock being picked, a ship sinking, ice cracking underfoot and a rocket losing parts - so the losing state is drawn rather than only counted. Letters get real typography, and the keyboard becomes proper on-screen keys rather than paint on a canvas.",
          },
          {
            title: "Everything moves",
            description:
              "Correct letters fly from the keyboard into their slots and land with a flourish; wrong ones shatter and grey out the key. The theme advances a stage per mistake, with each stage animated rather than appearing. Slots pulse when a letter would fit them. The last life changes the lighting and adds a heartbeat. Winning reveals the remaining letters in sequence and celebrates; losing completes the theme animation, then shows the word letter by letter.",
          },
          {
            title: "Feel and mobile",
            description:
              "Real word lists across categories rather than twenty arcade words hardcoded in the file, so a session stops repeating almost immediately. A hint worth spending something on, and the definition shown once the word is out. Difficulty by word length and rarity as well as the number of guesses. The alphabet becomes real, focusable, screen-reader-announceable buttons - at the moment it is drawn onto the canvas and clicked by coordinate, so no keyboard can reach it and no assistive technology can see it, even though typing already works.",
          },
          {
            title: "The whole screen",
            description:
              "The theme art gets the room to be a scene rather than a small line drawing, with the word and keyboard laid out to suit the shape of the screen - side by side when wide, stacked when tall.",
          },
        ],
      },
      {
        heading: "Lights Out",
        icon: "Box",
        items: [
          {
            title: "The look",
            description:
              "Five fixtures - filament bulbs, neon tubes, a circuit board, candles and a clean modern panel - each with their own warmth, falloff and off-state. The existing eased brightness and warm bloom are the best grid lighting on the site and are the starting point rather than being replaced.",
          },
          {
            title: "Everything moves",
            description:
              "Toggling sends a cross-shaped ripple through the affected cells, which exists and gets stronger. Added: bulbs flicker as they warm; the whole board reacts subtly to each press; a wrong move dims briefly; the move counter and par indicator animate; getting close to a solution brightens the surround; and solving runs the diagonal wave it already has, then lifts the panel and assembles the next puzzle in front of you.",
          },
          {
            title: "Feel and mobile",
            description:
              "Keyboard play, which it accepts none of today. Board sizes as difficulty rather than one fixed five-by-five. Generated puzzles with a known minimum solution and a par to beat, instead of a random scramble that makes one board trivial and the next brutal. A hint, an undo, and a solver you can ask.",
          },
          {
            title: "The whole screen",
            description:
              "The grid scales to the shortest edge and centres, with the light spilling out into the surround - which on a large screen is the whole point, since the glow is the game's identity.",
          },
        ],
      },
      {
        heading: "Cube",
        icon: "Box",
        blurb: "The strongest engine in the library: exact integer turns that cannot drift, and queued moves so fast input is never dropped.",
        items: [
          {
            title: "The look",
            description:
              "Five cube finishes - classic stickers, glossy tiles, brushed metal, glass with light passing through, and neon edges - in five settings, from a competition table to a void with drifting light. Real materials, edge bevels and reflections, rather than flat coloured quads.",
          },
          {
            title: "Everything moves",
            description:
              "Layer turns already animate and queue properly. Added: the cube settles with a slight overshoot at the end of each turn; grabbing a face highlights the layer that would rotate; the whole cube breathes while idle and tilts toward the pointer; the scramble is a rapid, dramatic sequence rather than an instant reshuffle; solved faces glow as they complete; the timer and move counter animate; and solving runs a full celebration with the cube spinning, coming apart and reassembling.",
          },
          {
            title: "Feel and mobile",
            description:
              "A proper speedcubing clock with an inspection period, undo, standard notation shown as you turn, scramble depth by difficulty, and two-by-two and four-by-four cubes. Touch controls, which it currently has none of, with drag-to-turn and drag-to-orbit properly separated.",
          },
          {
            title: "The whole screen",
            description:
              "It currently has no screen size registered at all, so it renders into a default portrait box. Given a real stage, the cube fills it, with the timer and move list arranged around and the setting providing depth behind - the game that most obviously benefits from being big.",
          },
        ],
      },
      {
        heading: "Labyrinth",
        icon: "Box",
        blurb: "The only true 3D game on the site, and the closest to already being full-screen ready.",
        items: [
          {
            title: "The look",
            description:
              "Five mazes with genuinely different architecture and light - catacombs, an overgrown ruin, a facility with emergency lighting, an ice cavern and a shifting digital space. Real texture on the walls, lighting that falls off with distance, and a map that looks like a drawn map rather than a debug overlay.",
          },
          {
            title: "Everything moves",
            description:
              "Head bob and sway while walking, already present and extended, plus lean into turns. Torchlight flickers and casts moving shadows. The map fills in with a sweep as you explore. Doors open, walls shift, dust drifts in the light. Finding something plays a full pickup animation. Getting close to the exit changes the lighting and the sound. Dead ends are marked with a subtle animation as you turn away, and reaching the exit pulls the camera up and out to show the maze you just solved.",
          },
          {
            title: "Feel and mobile",
            description:
              "Generated mazes at chosen sizes instead of three hand-carved ones you learn once and never need to solve again. Something to find rather than only somewhere to reach - collectables, keys and locked routes - and a reason to hurry. Mouse look with pointer lock on desktop, which it lacks entirely. The dual-thumb touch controls are already the best on the site and get analogue refinement rather than replacement.",
          },
          {
            title: "The whole screen",
            description:
              "Its renderer is already fully resolution-independent and derives its focal length correctly, so a wider screen genuinely shows more to the sides rather than stretching - the correct behaviour, and rare here. It needs the screen-size entry it never got, plus a map and heads-up display that scale properly.",
          },
        ],
      },
    ],
  },
  {
    version: "v1.6.3",
    codename: "Sharp Shooters",
    status: "later",
    timeframe: "After v1.6.2",
    summary:
      "The last seven - three shooters and four strategy games - and the arcade is whole again. The strategy games are the ones hiding the most: three of them have opponents far better than anything the interface admits to, and none of them exposes a difficulty setting at all.",
    groups: [
      {
        heading: "Asteroids",
        icon: "Crosshair",
        items: [
          {
            title: "The look",
            description:
              "Five regions of space with their own hazards and backdrops - a debris field, a nebula, a ring system, a derelict fleet and clean vector black. Six ships with distinct silhouettes, engine glows and weapon looks. Rocks get real surfaces and break along believable lines rather than into smaller circles.",
          },
          {
            title: "Everything moves",
            description:
              "The engine flares under thrust and the ship banks as it turns. Rocks tumble on their own axes and split with a burst of debris and dust. Every shot has muzzle flash, travel and impact. Destroying a rock shakes the screen in proportion to its size. The shield flickers and cracks. Hyperspace tears in and out. The saucer arrives with a warning and a sound that circles. Waves announce themselves; the ship exploding is a slow-motion break-up; and clearing a wave pulls the remaining debris into the void.",
          },
          {
            title: "Feel and mobile",
            description:
              "Waves that genuinely escalate rather than rocks respawning at the same difficulty forever. A saucer, hyperspace and weapon pickups. Three difficulties. Its own touch input - at the moment the on-screen buttons are pretending to be a keyboard, which makes fine rotation impossible - with analogue turning and thrust. Collision that scales, rather than checking everything against everything.",
          },
          {
            title: "The whole screen",
            description:
              "A wraparound field that genuinely fills the display, so a wide screen gives more room to run and changes how the game plays, with the region art providing depth behind the action.",
          },
        ],
      },
      {
        heading: "Space Invaders",
        icon: "Crosshair",
        blurb: "Its own description on this site promises playing from behind your barricades. There are no barricades.",
        items: [
          {
            title: "The look",
            description:
              "Five invasions with their own aliens, colours and skies - the classic silhouettes, an organic swarm, a machine fleet, a spectral wave and a neon set. Aliens get tiers you can tell apart at a glance and worth different points. Barriers, finally, that erode visibly as they take fire. Six player cannons with their own looks.",
          },
          {
            title: "Everything moves",
            description:
              "The formation gets its famous two-frame shuffle, and it is currently static rounded rectangles. Aliens lurch as the formation steps, and the step quickens as their numbers thin. Hits pop them in a burst of their own colour. Barriers chip away shot by shot, leaving real holes. The cannon recoils and flashes. The saucer crosses the top with its own sound and a payout that flies to the score. The last alien moves visibly faster and more erratically. Losing a life shakes the screen and rebuilds the cannon; the formation reaching the bottom takes the whole screen.",
          },
          {
            title: "Feel and mobile",
            description:
              "The barricades it already claims to have, alien tiers, a saucer, and a formation that tightens rather than only speeding up. Three difficulties changing fire rate, descent speed and barrier strength. Its own touch input with analogue movement, rather than fake key presses, and a fire control you can hold.",
          },
          {
            title: "The whole screen",
            description:
              "A wider formation and a wider battlefield on a wide screen rather than a stretched one, with the sky art extending behind and the score and lives given proper space at the edges.",
          },
        ],
      },
      {
        heading: "Target Rush",
        icon: "Crosshair",
        blurb: "The best-feeling game on the site already. It counts your accuracy and never tells you.",
        items: [
          {
            title: "The look",
            description:
              "Five ranges - a shooting gallery, a neon grid, deep space, a forest and a clean test range - with targets that have real construction: rings, materials, and gold and hazard variants that read instantly. A crosshair, which it does not currently have.",
          },
          {
            title: "Everything moves",
            description:
              "The particle bursts, expanding rings and spawn pops it already has are the model the rest of the arcade is being built from, and they stay. Added: targets drift, rotate and shrink with visible urgency as they age; the crosshair reacts to proximity; a hit sends a shockwave and a floating score; a miss cracks the screen where you clicked; combos stack a growing visual and audible ladder; a perfect streak sets the range alight; the time bar pulses in the last seconds; and the run ends on a freeze frame with accuracy counting up.",
          },
          {
            title: "Feel and mobile",
            description:
              "Accuracy shown during play and recorded on the leaderboard - it already counts every hit and every shot and simply never surfaces either, which for this kind of game is the number that matters most. Three difficulties changing target size, lifetime and spawn rate. A real miss penalty. Keyboard aiming as an alternative, and vibration on hits.",
          },
          {
            title: "The whole screen",
            description:
              "A larger range means targets can be further apart and genuinely test aim rather than sitting within a small box, with spawn logic tuned to the actual size of the stage rather than assuming a fixed one.",
          },
        ],
      },
      {
        heading: "Noughts and Crosses",
        icon: "Brain",
        items: [
          {
            title: "The look",
            description:
              "Five boards - chalk on slate, neon, carved wood, a sci-fi grid and paper - with marks drawn in the material of the board rather than as generic shapes. Six mark sets beyond X and O. The two-player toggle becomes a real control rather than a pill painted onto the canvas.",
          },
          {
            title: "Everything moves",
            description:
              "Marks already stroke themselves on, which is the right idea and gets extended to every set. Added: the board draws itself at the start; hovering previews your mark faintly; the opponent visibly considers before moving; a winning line is struck through with a sweep and the three marks lift; a draw settles the board with a shrug; the streak counter rolls; and the board wipes and redraws between games rather than resetting instantly.",
          },
          {
            title: "Feel and mobile",
            description:
              "Three real opponents. Today there is exactly one - perfect play with a deliberate twelve per cent random slip, which is not a difficulty, it is a coin flip that occasionally hands you a game you did not earn. Easy makes plausible human mistakes, medium plays well but misses deeper traps, hard is unbeatable and says so. Keyboard play, which it accepts none of, and a proper accessible two-player toggle.",
          },
          {
            title: "The whole screen",
            description:
              "A small board on a big screen needs a room around it, not a stretched grid: the board stays square and centred with the setting art, the score, the streak and the move history filling the space deliberately.",
          },
        ],
      },
      {
        heading: "Connect Four",
        icon: "Brain",
        items: [
          {
            title: "The look",
            description:
              "Five sets - the classic plastic frame, glass, wood, neon and an industrial machine - with discs that have real material and a frame you can see through. Column hover indicators that read clearly, and a drop that looks like something falling into a slot rather than appearing in it.",
          },
          {
            title: "Everything moves",
            description:
              "Discs already drop with gravity; now they bounce, settle and rock. The ghost disc above the column follows your pointer and tilts. Columns highlight as you consider them. A winning line pulses through its four discs in sequence and the frame lights up. A threat you are about to walk into flashes a warning. A full column shakes and refuses. The board empties by opening the bottom and letting everything fall out, which is how the real toy resets.",
          },
          {
            title: "Feel and mobile",
            description:
              "Difficulty, by search depth - the opponent currently thinks to one hardcoded depth, so there is exactly one strength forever. Keyboard play: its own controls row on this site advertises the number keys one to seven, and the engine has never had a keyboard handler at all. Undo, threat highlighting, and a move list.",
          },
          {
            title: "The whole screen",
            description:
              "The grid stays a fixed seven by six and centres, with the frame becoming a real object in a real setting and the space around it holding the move list, the score and the opponent's thinking.",
          },
        ],
      },
      {
        heading: "Reversi",
        icon: "Brain",
        blurb: "A far better opponent than anything the interface admits to - and no way to make it easier.",
        items: [
          {
            title: "The look",
            description:
              "Five boards - green felt, marble, neon, wood and a clean tournament set - with discs that have thickness and edges so a flip is a real object turning over. Valid-move dots become part of the board's design rather than plain circles.",
          },
          {
            title: "Everything moves",
            description:
              "The staggered flip cascade is the best animation on the site and is the model the whole arcade's animation layer is being built from. It stays and grows: discs land with a press, the cascade ripples out from the placed disc in order, and each flip pinches through its edge. Added: the score bar slides continuously as the balance shifts, corners flash when taken, the opponent's considered moves are hinted, a pass is announced rather than silently skipped, and the endgame fills the remaining squares in sequence.",
          },
          {
            title: "Feel and mobile",
            description:
              "Its strength exposed as three difficulties. Underneath it already weights corners, penalises the squares beside them, counts mobility and searches deeper once the endgame can be solved outright - all of which is invisible and unadjustable. Keyboard play, undo, a move list, and a clearer read on why a square is worth taking.",
          },
          {
            title: "The whole screen",
            description:
              "The board stays square and centred with the setting filling the surround, and the score bar, move list and captured counts arranged around it rather than crammed against the edge.",
          },
        ],
      },
      {
        heading: "Mastermind",
        icon: "Brain",
        items: [
          {
            title: "The look",
            description:
              "Five sets - classic pegs, gemstones, a code panel, runes and a clean modern board - with pegs that have material and light. Feedback markers become clear at a glance and carry shapes as well as colours, so the game is playable without relying on colour vision.",
          },
          {
            title: "Everything moves",
            description:
              "Pegs drop into their slots and settle. Picking a colour lifts it from the palette. Submitting a row locks it with a press and the feedback markers resolve one at a time rather than appearing at once, which is the tense moment the game is built around. Deduced information highlights the earlier rows it came from. The remaining-guesses indicator visibly shortens. Cracking the code opens the hidden row with a flourish; running out reveals it slowly.",
          },
          {
            title: "Feel and mobile",
            description:
              "An explicit submit. It currently commits your guess the instant a fourth peg lands, so a row cannot be reconsidered, and the only way to take a peg back is tapping empty space above the palette - which nothing anywhere tells you. Difficulty by slot count, colour count and whether repeats are allowed. Colour-blind-safe marking, a pause that pauses, and notes you can keep on earlier rows.",
          },
          {
            title: "The whole screen",
            description:
              "The history of your guesses is the game, so a taller screen shows more of it at once and a wider one puts the palette and your notes alongside rather than squeezed underneath.",
          },
        ],
      },
    ],
  },
  {
    version: "v2.0.0",
    codename: "Relaunch",
    status: "later",
    timeframe: "Once all twenty-six are back",
    summary:
      "The arcade whole again, and the things that only become possible once every game runs on the same platform. This is the version number the rebuild has been heading for: not a patch on what was here, a different arcade.",
    groups: [
      {
        heading: "What the rebuild unlocks",
        icon: "Rocket",
        items: [
          {
            title: "A skin and arena picker on every game",
            description:
              "One place per game to see everything it can look like, what you have, what you are close to, and what it takes to get the rest - previewed live rather than described.",
          },
          {
            title: "Mastery worth chasing",
            description:
              "Per-game goals that teach the game - survive a minute, clear without losing a life, finish on hard, hit a combo you have to plan for - rather than one global number that treats every game as interchangeable. The main source of the skins and arenas that are not for sale.",
          },
          {
            title: "Replays and ghosts",
            description:
              "Record the inputs rather than video - a few kilobytes - and a run can be replayed from a leaderboard entry, raced against as a ghost, or re-simulated on the server to check the score it claims is one those inputs could actually produce.",
          },
          {
            title: "A daily challenge",
            description:
              "One game, one seed, the same for everyone, resetting at midnight - so scores are directly comparable in a way a free-play leaderboard never is. A streak for playing every day, and a shareable spoiler-free result card.",
          },
          {
            title: "One arcade, not twenty-six",
            description:
              "The point of doing the platform first: a shared look, a shared sound, shared controls and shared expectations, so moving between games stops feeling like moving between websites.",
          },
        ],
      },
    ],
  },
  {
    version: "v2.1.0",
    codename: "Head to Head",
    status: "later",
    timeframe: "After the relaunch",
    summary:
      "The arcade has twenty-six games and no good way to play one against another person. This is what happens once the rebuild has finished: give people something to do with each other, and finally tell them when it is happening. Deliberately behind the rebuild rather than beside it - multiplayer written against engines that are still being replaced would only have to be written twice.",
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
              "An opponent that is always there, at difficulties that mean something - easy makes real mistakes rather than moving at random, hard plays the best line it can find. Also the honest fallback when nobody is online, and the way to practise before facing a person. The per-game difficulty work in the rebuild is most of this already.",
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
            title: "An accessibility pass",
            description:
              "Colourblind-safe palettes per game, full keyboard remapping, a reduced-motion mode that goes further than the CSS one, proper focus order and screen-reader labelling in menus, and a difficulty floor that makes every game finishable. Much of this is being pulled into the rebuild, but it is worth doing on its own terms afterwards rather than assuming the rebuild caught everything.",
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
              "Short themed events with their own cosmetics and a limited-time game variant - the seasons system already built gives these somewhere to live, and the per-game skins give them something to hand out.",
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
