# Changelog

All notable changes to Classic Games Hub. Dates are release targets; see the
live roadmap at `/roadmap`.

## Unreleased

### ♻️ Reset all settings

- New control in Admin → Discord bot → Sync, on `admin_reset_bot_config`
  (migration `0061`): clears every section back to its defaults.
- The point is the **ids**, not the toggles. A dashboard pointed at one server
  accumulates role, channel, category and panel-message ids, and those are what
  you cannot fix by editing one field - a stale id is worse than an empty one,
  because setup reads it as "use that exact channel" and reports it missing
  rather than creating a replacement. This is the way to start again on a new
  server, or after one was rebuilt.
- It **deletes** the config rows rather than writing defaults into them.
  `bot_get_config` returns null for an absent key and every caller already
  merges over its own defaults, so no row *is* the default; writing them out
  would duplicate the defaults in a second place and let the two drift.
- Nothing is deleted inside Discord. Roles and channels the bot created stay,
  and so does any panel it posted - but the link to that panel is cleared, so
  the next setup posts a fresh one rather than editing it. The card says so
  plainly rather than leaving admins to discover a second panel.
- Confirmation is a second press, not a dialog - the page has no dialog pattern
  and the destructive wording only appears once you have reached for the button.
  Audit-logged as `bot_config_reset`.

### 🪄 Full setup now finishes the job

- **Run full setup** used to stop two steps short. It created the verification
  and level roles and the counter channels, then reported the verification and
  ticket panels as *skipped* with "pick a channel below, then save" - so a fresh
  server came out of setup holding roles with nothing handing them out.
- It now provisions what those panels need and posts them: a `✅-verify`
  channel, a `🎫-support` channel, a `🎫 Tickets` category and a `Staff` role.
  Which channel members should see is a human decision, but "somewhere
  newcomers can press verify" has one obvious answer, and asking for it was
  costing every fresh server the one step that makes the rest do anything.
- **Nothing is duplicated.** Every role and channel is matched by name first, so
  a server that already runs a `#verify` or a `Staff` role keeps using it. A
  configured id still wins over a name, and a configured id that has since been
  deleted is reported as missing rather than silently replaced with a new
  default-named one the admin then has to hunt down.
- Both panel channels are readable by everyone and writable by nobody - a panel
  is one button, and letting members chat there buries it. The verify channel
  allows View Channel explicitly rather than inheriting it, because the gate
  works by denying `@everyone` elsewhere and a gate members cannot see is just a
  locked server.
- The ticket category hides itself from `@everyone`, closing the window where a
  freshly created ticket was visible server-wide until its own overwrites
  landed. The staff role is resolved before the category that grants it access,
  so tickets are never filed somewhere staff cannot read.
- Each panel posts into the channel the step before it **just resolved**, rather
  than into a re-read of the config. The id is written back either way, but
  depending on that write having landed turns one failed round trip into a panel
  that silently never appears - the exact failure the step exists to remove. The
  report now names the channel it posted into, so "posted" can be checked rather
  than taken on trust.

## "Collector's Edition" (v1.5.0)

### 🌀 Labyrinth - the first true-3D title

- A first-person maze, and the last item on the v1.5.0 roadmap (`0060`). Three
  mazes to a run, rising in size, with a map that fills in only where you have
  actually been.
- The interesting part is underneath it: **`lib/games/engine3d.ts`**, a shared
  software renderer. Cube got away with hand-rolled maths because flat stickers
  never cross the camera plane and never need lighting. A camera *inside* a
  scene needs both, so this one has a real pipeline - free camera, perspective,
  **near-plane clipping**, backface culling, depth sorting, Lambert shading and
  distance fog.
- Near-plane clipping is the whole game. Without it, a wall you are standing
  next to divides by a depth at or behind the eye and flings its corners across
  the screen; it is the single thing separating a first-person camera from a
  diorama.
- **Still no WebGL.** v1.4.1 spent a release taking an animation runtime and a
  query cache out of the bundle, and a 3D library would put back more than every
  engine here weighs combined. A few hundred polygons is nothing to transform in
  JavaScript, and `fill()` on a convex polygon is hardware accelerated anyway.
  Making the renderer shared rather than part of the game is what makes "titles"
  plural affordable.
- Lighting is computed from **world-space normals, before the view transform**,
  so it stays fixed to the world as you turn. A light that swings with your head
  is the classic tell of a fake 3D scene.
- Two things came out of actually looking at it rather than trusting the maths:
  the player spawned nose-first into a wall, which showed a flat rectangle and
  told them nothing; and a flat-shaded wall up close is a screen of uniform
  colour with no cue at all. Fixed by facing the open direction on spawn, and by
  panelling walls into a 2x2 grid with per-panel shading and edge outlines.
- Depth sorting is per-face painter's algorithm rather than a z-buffer. A
  z-buffer in JavaScript means per-pixel work and giving up `fill()`, which is
  where all the speed is; the tradeoff is that large interpenetrating faces can
  sort wrongly, which axis-aligned level geometry never does.

### 🧊 Cube - a playable Rubik's cube

- The roadmap's "more 3D titles" item, and the arcade's 25th game (`0058`).
  Drag a sticker in the direction you want it to go and that layer turns; drag
  the background to orbit. Keyboard players get the standard notation - U, D,
  L, R, F, B, with Shift for anticlockwise.
- **Canvas 2D with hand-rolled 3D maths, not three.js.** Every other engine
  here is canvas 2D, and 54 stickers is a trivial amount of geometry to
  transform by hand. Adding a WebGL runtime would have cost more bytes than the
  entire rest of the games bundle, and undone the work v1.4.1 did to shed the
  animation runtime and the query cache.
- **No permutation tables.** Each sticker carries a cubie coordinate, a face
  normal and a colour; a face turn rotates those two integer vectors 90 degrees
  and the colour travels with the sticker. That means there is no lookup table
  to get subtly wrong, and no floating-point drift accumulating over a long
  solve - the model is still exact on the thousandth move. "Solved" falls out of
  it for free: every sticker sharing a normal shares a colour.
- Turn direction is derived from the gesture rather than hard-coded per face:
  the layer that moves is perpendicular to both the face normal and the
  direction you dragged, so a drag does what it looks like it should from any
  orientation.
- Scored on **moves and time**, like Lights Out, so a tidy solve beats a lucky
  one. The scramble avoids undoing its own previous move, which would otherwise
  leave a cube far easier than its move count suggests.

### ✨ The last three expressive extras

- Profile **entrances**, **cursor trails** and **profile music** (`0059`) - the
  remainder of the stretch-cosmetic backlog that has been carried since v1.2.0.
  All three were previously blocked on "the animation work", which v1.4.1
  shipped, so the blocker is gone.
- **Entrances** are how a profile card arrives: Rise, Unfold, Sweep, Glitch, and
  Warp at level 25 - which fills the gap between the L20 loadout presets and the
  L30 vanity URL. Pure CSS keyframes, so there is no JavaScript on the page for
  them at all, and every variant is gated behind `motion-safe:` - reduced motion
  gets the card already in place rather than one that opens at zero opacity and
  never resolves.
- **Cursor trails** (Sparkle, Comet, Bubbles, Ribbon) follow the pointer while
  someone is looking at your profile. Drawn on **one canvas** rather than a
  swarm of DOM nodes: a trail spawns particles on every pointer move, and
  creating and destroying absolutely-positioned spans at that rate is exactly
  what the v1.4.1 performance pass was undoing. The loop stops itself when the
  last particle dies and restarts on the next move, so an idle profile costs
  nothing.
- **Profile music** needed **no new shop rows and no new audio**. The v1.3 track
  library already existed, was already bought and owned, and is already rendered
  procedurally in the browser; it was simply only playable from the shell
  player. Equipping a track gives it a second place to be heard.
- It is deliberately **click-to-play**. Browsers block autoplay with sound
  outright, so an auto-starting version would mostly be silent and occasionally
  ambush someone - and a profile that starts making noise on its own is the
  reason people remember profile music badly. The chip names the track before
  anything plays.
- Shop item cards were also missing kind labels for decorations and profile
  frames, which have been there since `0049`; both now show one.

### 👀 Profile views and "now playing"

- Two of the expressive extras from the roadmap (`0057`).
- **"Now playing"** on a profile shows what someone is playing, or last played,
  as a small chip under their name. Entirely derived from `play_sessions`, so
  there is nothing to record, nothing to keep in sync, and no way for it to
  claim someone is playing a game they stopped playing last week. It respects
  the **existing** "show online status" switch rather than adding a second one -
  "playing Snake right now" is presence arriving through a different door.
- **Profile views** are opt-in and off by default, under Settings → Privacy. A
  view counter is fun for some people and quietly stressful for others, which is
  why the roadmap called it optional.
- It counts **unique visitors per day, not raw hits**: a raw counter measures
  how often someone refreshed, which is not interesting and is trivially
  inflated. Self-views never count. Views are recorded even while the setting is
  off, so turning it on shows a real history rather than starting from zero and
  implying nobody ever visited - only the display is optional, not the
  recording.
- Nobody can read the rows directly; the count comes back through the RPC, so a
  visitor can never enumerate who looked at whom.

### 🔓 Booster early access

- A game can now go out to boosters ahead of everyone else (`0056`). Set it from
  Admin → Games: 3 days, 1 week, 2 weeks, or open it to everyone early.
- **The game stays visible to everyone**, shown with a lock badge on its card
  and, on its page, a countdown and a prompt to boost. A perk nobody can see is
  a perk nobody wants, and half the point of early access is that other people
  know it is running.
- The gate is a **trigger on `play_sessions`**, not a check inside
  `submit_score()`. That function is a hundred lines and has already been
  re-declared across five migrations; a sixth copy to insert one `if` would be
  another chance for the rest of it to drift from what is live. A trigger states
  the rule once and keeps holding however `submit_score` is rewritten later.
- It gates **earning, not the page**. A determined non-booster could still load
  the engine; what they cannot do is record a score, XP or credits for it. The
  UI hides the player, the database refuses the result.

### 🎟️ Monthly gift token

- Boosters get one token a month to give a friend any cosmetic for **30 days,
  free** (`0055`). It appears as a second button on the gift dialog of any shop
  item, and on `/collections` alongside the other booster perks.
- **30 days** matches the token's own cadence: a friend gifted every month keeps
  the cosmetic continuously, and one gifted once gets a proper trial rather than
  a glimpse. Tokens do **not** stack - left to accumulate, a long-time booster
  could hand out a dozen at once, turning a steady trickle into a windfall.
- The temporary grant rides `inventory_items.expires_at`, which already existed
  for boosts and is already respected by `equip_item`, `apply_loadout_preset`
  and every ownership check, so nothing new had to learn about expiry.
- Spending is guarded by the update itself: it only matches an unused row, so
  two concurrent requests cannot both spend the same token. Every rule a paid
  gift respects - blocks, staff-only items, no boosts, no gifting yourself - a
  free one respects too.
- Granted by the existing daily booster cron rather than a new job, since it
  keys off the same `booster_since` the role sync refreshes an hour earlier.

### 🗓️ Seasons

- **Neon Summer**, the first season, runs on `/collections`: a five-tier track
  unlocked by season XP, each tier claimed once for credits and, at three of
  them, a cosmetic that is never sold.
- **Season XP is derived, never stored** (`0054`) - it is the XP you earned from
  play sessions inside the season's window. Because it is a sum over
  `play_sessions`, it can never drift from what actually happened, and seasons
  needed **no hook into `add_xp` or `submit_score`**: nothing on the hot path
  changed to add this feature.
- Three open product questions are answered as **data rather than schema**, so
  changing any of them later costs an `UPDATE` and not a migration:
  season length is `starts_at`/`ends_at` per season; there is no paid track (the
  free track only, and no payment integration exists to build one on); and a
  past season's cosmetics return only if someone deliberately adds them to a new
  season's tiers.
- Claiming re-derives progress server-side before paying out, so a stale page
  cannot claim a tier that has not been reached, and the claim row's primary key
  refuses a second attempt - the same guard collections use.

### 🎨 New icons and thumbnails

- **The favicon now matches the logo.** The app icon was an unrelated
  arrangement of dots and a cross while the site header uses a joystick, so a
  browser tab and the product did not look like the same thing. `public/icon.svg`
  is redrawn as that same joystick on the brand violet-to-pink gradient, and
  every PWA and Apple size regenerates from it.
- Drawn for 16px first: three solid shapes with generous gaps and nothing finer
  than a few pixels once scaled down, checked at 16, 32, 64, 128 and 256 on both
  light and dark backgrounds. The glyph sits inside the middle 60% so the
  maskable icon can crop to a circle without clipping it.
- **All twenty-four game thumbnails are now one visual system.** Each game
  previously had its own arbitrary dark gradient - teal, amber, slate, green -
  so the library read as a pile of unrelated art. They now share a near-black
  base, grid, vignette and glyph treatment, and a game's identity comes from a
  single accent hue drawn from a six-colour ramp.
- Two glyphs were redrawn because they did not read: the runner was a head and
  one rectangle that looked like a barbell, and Simon's wedges were hand-placed
  arcs that rendered lopsided.
- Still generated SVG, so the whole set is a few kB, stays sharp at any card
  size, and changing the system is one edit rather than twenty-four.

### 🖼️ Profile frames

- Six decorative frames around your **entire profile card** - Gilded, Obsidian,
  Sakura, Tide, Ember, and Prism at level 40. The third and outermost cosmetic
  layer, and all three can be worn together:

  | Kind | Where it sits |
  | --- | --- |
  | `avatar_frame` | rings the profile picture |
  | `decoration` | sits on top of the picture |
  | `profile_frame` | wraps the whole card |

  That is exactly why each is its own shop kind - `profiles.equipped` holds one
  slug per kind, so separate kinds are what let them stack instead of
  overwriting each other (`0053`).
- Drawn as CSS gradients rather than border images, so they stay sharp at any
  card width and add no requests. The ring sits *behind* the card rather than
  the card sitting inside a padded parent: rotating a padding box would carry
  the card around with it, whereas rotating a layer behind leaves the card
  still - the same approach the animated avatar frames already use.
- Reduced motion leaves a static frame rather than removing it, matching the
  call made for decorations.

### 👥 Friends activity feed

- `/friends` now shows a quiet feed of what your friends have been up to - high
  scores, achievements, purchases and new friendships - so the hub feels
  inhabited even when nobody is talking.
- Nothing new is recorded. `activity_events` has been filling up since `0002`
  and every profile already showed a player's own; `0052` just adds the other
  direction. It exposes nothing that was not already public either - those rows
  carry an "activity is public" policy, so the feed narrows what is readable
  rather than widening it.
- Blocks are enforced in both directions regardless. A feed that kept surfacing
  someone you blocked would be a conspicuous hole in that promise even though
  the underlying row is public.
- Keyset pagination on `(created_at, id)` rather than `OFFSET`, because the feed
  is append-heavy and an offset page two silently repeats or skips rows whenever
  something new lands between requests.
- Rendered on the server: it is read-only and nothing on it is interactive, so
  none of it needs to reach the browser as JavaScript. Unrecognised event types
  are skipped rather than rendered broken, since more will be added over time.

### 🪄 One-click Discord setup

- Admin → Discord bot → Sync → **Run full setup** registers the slash commands,
  creates the verification and level roles and the live counter channels, and
  posts both panels, in dependency order.
- It reports on **each step separately** rather than returning one success or
  failure. Discord setup fails in partial, unrelated ways - the bot can often
  create roles but not post in a channel it cannot see - so aborting at the
  first error would hide the four steps that would have worked, and "setup
  failed" sends an admin looking in the wrong place. Each row quotes what
  Discord itself said.
- Every step is idempotent, so the button doubles as a "fix whatever is still
  missing" control after granting the bot a permission it was lacking.
- Missing credentials are caught up front, so an unset token gives one clear
  message instead of six copies of "could not reach Discord".

### 💗 Monthly booster drop

- One exclusive cosmetic per calendar month for everyone boosting the Discord
  server, shown on `/collections` (`0051`). July is Booster Wings, August is the
  Bloom nameplate, September is the Comet effect. Holding one is proof you were
  boosting that month, and there is no way to get it afterwards.
- **Boost at any point in the month and it is yours.** Requiring a full month
  would mean nobody could earn the drop for the month they started boosting,
  which is exactly the month worth rewarding.
- The grant runs **daily**, not monthly. A once-a-month job gets one chance to
  fire, and a failure would silently cost a whole month of boosters their drop;
  a daily idempotent run has thirty chances and the repeats are free. It is
  scheduled after the Discord role sync, since that is what refreshes who is
  actually boosting.
- The drop is visible to non-boosters too. The point of a monthly exclusive is
  being able to see what you are missing while there is still time to get it.

### 🏆 Collections

- Five collectable sets at `/collections` - Aurora, Neon Nights, Deep Space,
  Head to Toe and Full Soundtrack. Own everything in a set and claim it for
  credits plus an exclusive badge that **cannot be bought at any price**. That
  badge is the point: it is proof you finished something, which is a different
  kind of prize from anything on the shelf.
- Progress is derived, never stored (`0050`). "Do you own these six things" is a
  join away at any moment, and a stored counter would just be a second copy of
  the truth that drifts when an item expires or a purchase is refunded.
- The claim row is the guard against double payouts: `claim_collection()`
  inserts it first and lets the primary key refuse a second attempt, rather than
  checking and then writing with a window in between. If the set turns out to be
  incomplete the claim is rolled back, so it can still be earned properly.

### 🎩 Layered avatar decorations

- Seven decorations that sit **on top of** your avatar rather than around it -
  cat ears, a halo, a crown, sparkles, flames, headphones and a personal
  thundercloud. They layer with frames, so you can wear one of each.
- A new `decoration` kind rather than more frame slugs, because
  `profiles.equipped` holds one slug per kind and that is exactly what lets the
  two stack (`0049`). No new mechanism: ownership, equipping and the staff-only
  gate all go through the existing `equip_item()` path.
- Drawn as inline SVG on a viewBox mapped to the avatar's own box, so they scale
  to any avatar size with no hard-coded pixels, no extra requests and no blurry
  upscaling - the same approach frames and profile effects already take.
- Reduced motion drops their animation but keeps the decoration. It is a
  cosmetic the player bought, not an effect; the setting exists to stop things
  moving, not to confiscate their crown.

### 🎚️ The last two level milestones

- **L20: saved looks.** A preset snapshots everything you have equipped, so
  switching your whole appearance is one tap instead of five. One slot to start
  with, five from level 20, and staff are uncapped. The limit lives in
  `preset_slot_limit()` and the UI reads it rather than hard-coding a number.
- Applying a preset re-derives the equipped map from what you **currently** own
  (`0047`). A saved slug is not proof of ownership - boosts expire, items get
  refunded, staff-only items must stay staff-only - so anything you no longer
  own is dropped rather than equipped, and the rest of the preset still applies.
  Writes go only through the RPCs; `loadout_presets` grants select and nothing
  else, so a direct insert cannot bypass the slot limit.
- **L50: Singularity.** The mythic effect was already being granted by `add_xp`
  on the way past level 50, but no renderer existed, so the reward was
  invisible. It now draws: a collapsing violet core with an accretion disc and
  matter spiralling inward. Players who passed level 50 before the grant existed
  are backfilled.

### ♿ Reduced motion

- The setting was stored, validated and switchable, but **nothing read it** - it
  had no effect at all. It now applies on the server-rendered `<html>` tag, so
  animations never play once before being switched off.
- It also drops `backdrop-filter`, stops the animated theme hues drifting, and
  skips rendering profile effects and backdrops entirely rather than hiding
  them, making it a genuine performance setting on a weaker device.

### ⚡ Performance

- **The Supabase client no longer ships in the first load.** At ~241 kB it was
  the largest dependency in the bundle, and three components pulled it into
  every route while rendering nothing until you interacted with them:
  `SessionSync` (mounted by the layout, no-ops when signed out), the navbar
  `MusicPlayer` (hidden unless you own a track) and `GiftDialog` (only queries
  once opened). All three now load it on demand. Per-route client JS fell about
  35% - the home page from 716 kB to 463 kB, and every route except `/party`
  and `/messages/[id]`, which need the realtime socket to show anything, by a
  similar margin.
- **Server reads run in parallel.** Six routes were awaiting queries in sequence
  that had no dependency on one another. The home page went from five round
  trips to one, `/u/[username]` from six to two, settings from four to two, and
  the `(main)` layout - which gates every single page - from two to one.
- **Loading states are route-shaped and no longer flicker.** Every route already
  had a fallback, but it was the home page's skeleton, so the shop, settings and
  admin all flashed the wrong layout. Nine routes now have skeletons matching
  their real content, with one shared admin skeleton covering twelve pages. New
  `Deferred` and `DeferredSpinner` primitives stay invisible for 300 ms before
  fading in, so quick loads show nothing at all instead of a flash.

## Unreleased - "New Dimensions" (parties & online multiplayer)
## v1.4.1 - "Refined" (UI, UX and performance overhaul)

A ground-up pass over how the site looks, feels and performs. No feature was
removed or replaced with a placeholder; everything below is the same
functionality, rebuilt on a shared foundation.

### 🎨 Design system

- **Elevation, motion and type tokens** in `styles/globals.css`: brand-tinted
  shadow scale that deepens correctly in dark mode, two shared easing curves
  (`--ease-standard`, `--ease-spring`) that every transition now uses, and
  fluid `text-display` / `text-title` sizes that scale continuously instead of
  jumping at breakpoints. `--muted-foreground` was darkened in light mode so
  body copy clears AA contrast rather than only large text.
- **New shared components**: `PageHeader` (one masthead for every top-level
  page), `EmptyState` (one "nothing here yet" surface for the whole app),
  `Spinner`, and `SkeletonRegion` for announcing loading regions.
- **Rebuilt primitives**: `Button` gained a `loading` state that keeps its width
  while working; `Card` gained `default` / `flat` / `glass` / `dashed` variants
  and an `interactive` lift; `Input`, `Textarea` and `SelectTrigger` finally
  share one appearance; `Dialog` insets itself from the viewport and scrolls, so
  a tall dialog stays usable on a short phone.
- New utilities: `hover-lift`, `bg-aurora`, `rail`, `stagger`, `defer-paint`,
  `no-scrollbar`, `tnum`, `skip-link`.

### ✨ Motion

- Micro-interactions throughout - cards lift, grids stagger in, the credit
  balance rolls when it changes, menus scale from the trigger that opened them,
  a game card's play button springs up under the pointer. All transform and
  opacity only, so it composites instead of repainting.
- Every animation is gated behind `motion-safe`, so "reduce motion" yields a
  genuinely still interface rather than a fast one.

### ⚡ Performance

- **`framer-motion` removed.** It was powering six small effects (two active-nav
  pills, a counter transition, a tap scale, an overlay entrance, a filter pill).
  All six are now CSS and behave the same.
- **`@tanstack/react-query` removed** along with `QueryProvider`. Its single
  call site was the command palette's game list, which now caches in module
  scope - the list is identical for every visitor and changes about once a
  release.
- Hero and auth backdrops swapped full-viewport `blur-3xl` elements for
  background gradients; skeleton shimmer became a transform rather than an
  animated `background-position`; below-the-fold sections use
  `content-visibility: auto`.
- Fonts use `display: swap`, the mono face no longer preloads, and
  `deviceSizes` / `imageSizes` were trimmed to the widths the layout requests.

### ♿ Accessibility & usability

- A skip link is the first tab stop on every page, `<main>` is a real focus
  target, focus rings are defined once globally and never fire on pointer
  interaction, and navigation marks the current page with `aria-current`.
- Loading skeletons are announced via `SkeletonRegion`; progress bars report
  their value; the run-complete overlay is a labelled dialog that focuses its
  primary action.
- Error pages surface the Next.js digest for support, and `global-error`
  respects the reader's colour scheme without a stylesheet.

### 📱 Responsiveness

- The favourite button no longer hides behind hover on touch devices; tab bars
  and category filters scroll instead of wrapping; every tap target clears 44px;
  text inputs are 16px on touch so iOS won't zoom the viewport on focus.
- Game grids use `auto-fill` rather than fixed column counts, fixing the
  900–1100px range where four columns were too many and three left a gap.
- Toasts sit above the mobile tab bar; the footer and `<main>` clear it too, with
  `env(safe-area-inset-bottom)` respected throughout.

## Unreleased - "New Dimensions" (parties & online multiplayer)

Roadmap v1.4.0. Playing together stops being a plan and becomes a feature, and
four migrations that were live in the database finally have code to reach them.

### 🎉 Parties

- `/party` creates or joins a party by six-character code, with a live roster,
  presence, leader controls and one-tap invites from your friends list.
- One party per person, size limits, block-list checks and leadership handover
  when the leader leaves are all enforced in the database (`0044`), not in the
  UI - the tables are RLS-locked to "you can only see a party you're in" and
  every write goes through a `SECURITY DEFINER` RPC.
- Party invites arrive as notifications carrying the code, so the recipient
  still chooses whether to join.

### 🎮 Online multiplayer

- **Head-to-head**: Tic-Tac-Toe, Connect 4 and Reversi become real online
  matches on one shared board with alternating turns and a fixed seat order.
  Engines opt in through an optional `net` context - every other engine is
  untouched and behaves exactly as before.
- **Score races**: every other game becomes a race - same game, same countdown,
  live standings.
- Live match state rides a Supabase Realtime broadcast channel keyed by party
  id and is never persisted; scores still go through the ordinary
  `submit_score` path, so party play earns exactly what solo play earns.

### 📊 Status page

- A public `/status` renders `platform_status()` in one round trip: players
  online, plays today, community and economy counts, and Discord worker
  liveness. Moderation counts are staff-only.
- The gateway worker now actually reports in - it calls `bot_heartbeat()` on
  connect and every 60 seconds. Without this the status page showed the bot as
  permanently offline no matter how healthy it was (`0043` shipped the RPC, but
  nothing ever called it).

### 🔗 Vanity URLs & booster dailies

- `/u/<slug>` resolves either a username or a vanity slug, so every profile
  link, share card and metadata route works with both. Claim or clear yours in
  Settings - unlocked by boosting, by reaching level 30, or by being staff
  (`0045`).
- The fourth daily challenge is a boosters' perk: visible to everyone, but only
  boosters can claim it (`0046`).

### 🧹 Rewarded ads removed

- The simulated rewarded-ad programme is gone root and branch: the opt-in
  setting, the "watch to double your credits" overlay, the admin ads centre and
  the feature flags that gated them. `0042` rewrites `claim_daily_reward` and
  `submit_score` without their ad branches and drops the columns that stored ad
  state; boost stacking, seasonal multipliers and challenge bumps are unchanged.
- The roadmap now records this as **Dropped** rather than quietly deleting it,
  and gained a status of that name to say so honestly.

### 🧹 Admin dashboard tidy-up

- **Sidebar layout.** The nav sat above the content, so every page opened by
  pushing what you came for below the fold. It now sits beside the content on
  desktop and stays put as you scroll.
- **Every page has a heading.** Pages used to begin however their author felt
  that day - a bare paragraph, a search box, an `h2` at whatever size. The
  heading now comes from the route, so a new page gets a consistent one by
  adding an entry rather than by remembering to match ten other pages.
- **One set of shared pieces** (`features/admin/ui.tsx`): result lines, the
  Discord-ID field, and empty states. The result line existed in five separate
  copies and the ID field in two; they had already started to diverge.
- Results now read as a tinted line rather than loose coloured text, so a
  success and a failure are distinguishable at a glance.
- **Open reports surface as a banner** on the Overview rather than a number to
  notice - with a link straight to them.
- The header is calmer: the shouty red shield is gone, and there's a "View
  site" link back out.

- **Admin → Discord bot** was one page carrying roughly thirteen cards and
  several hundred form fields. It is now four tabs grouped by why you came -
  **Actions** (announce, moderation, channel tools), **Sync** (register
  commands, credential checklist, push settings), **Levelling**, and
  **Server**. Same URL, so bookmarks still work.
- Registering commands and the environment checklist moved out of the settings
  form into Sync, where they belong: they are things you do once after a
  deploy, not settings you tune.
- The admin nav was eleven equal links in one scrolling row. Now three short
  labelled groups - Community, Content, System - with Overview above them.
  Eleven items get re-scanned every visit; three groups are learned once.
- Removed the now-unused `DiscordConsole` wrapper.

### 🏷️ The bot is "Classic Games Bot"

- The site and community are the Hub; the bot that serves them is now named
  separately, on every surface it signs - embed footers, audit-log entries and
  its help card. Kept in one constant (`BOT_NAME`), and `components.ts` no
  longer carries a second copy of the brand colour and footer that would have
  drifted the moment either changed.
- Copy that refers to the *site* or the *community* is untouched: `/link` still
  links your Classic Games Hub account, and a ban DM still says you were banned
  from Classic Games Hub, because that is the server.

### 🐞 Bugs found in a sweep of the bot

- **The live feed silently swallowed the first real event.** The worker primes
  itself on its first poll to skip the backlog, but returned early when that
  poll came back empty - so on a quiet server `primed` stayed false and the
  *next* poll, carrying the first genuine high score, was discarded as backlog.
- **Purging exactly one message failed.** Discord's bulk-delete endpoint takes
  2–100; the dashboard always called it, so a purge of one never worked. The
  slash command already handled this.
- **Locking a channel wiped its other @everyone rules.** Editing a permission
  overwrite replaces it wholesale, and both the command and the dashboard wrote
  a fresh overwrite containing only the send-messages bit. Unlocking was worse:
  it wrote `deny: 0`, clearing every other deny on the channel. Both now read
  the existing overwrite and change only that one bit - and locking clears an
  explicit *allow*, which would otherwise beat the deny and leave the channel
  unlocked.
- **Long name templates were rejected outright.** Discord caps role and channel
  names at 100 characters. The refresh pass clamped; creation didn't.

### 🩹 Three dashboard settings that couldn't take effect

- **Tickets: the panel channel was dropped on every save.** `panel_channel_id`
  was missing from the tickets validation schema, and zod strips unknown keys -
  so the field never persisted and the panel could never be posted or re-posted
  from the dashboard. The Tickets card now has the field, and saving posts the
  panel there.
- **Live counters ignored the Discord-members channel entirely.** Setup looped
  over three of the four counters, so an ID linked for that one was neither
  recognised nor used. All four are handled now.
- **Counter naming is left to the refresh pass.** Setup only knew three
  template variables and hard-coded the Discord member count to zero, so
  renaming there wrote a worse name than the refresh that immediately followed
  - and burned one of Discord's two renames per ten minutes doing it. Setup now
  adopts and creates; refresh names.
- Pushing counters while **Counters enabled** is off now says so, instead of
  quietly doing nothing.
- Panels are **edited in place** rather than re-posted. Now that saving pushes
  automatically, a re-posted panel meant a trail of duplicates down the channel
  after a few edits; the live panel also updates its own wording where people
  already see it.
- The push buttons say they use your **last saved** settings, and the "no panel
  channel" messages name the field to fill in rather than telling you to run a
  slash command.

### 🔗 Linked roles and channels are used, not duplicated

- Pasting a role or channel ID into **Admin → Discord bot** now means *use this
  one*. The bot adopts it and updates it to match your settings - a milestone
  role is renamed and recoloured, a counter channel renamed to show its number.
  Previously a linked ID was adopted but never updated, so your own role kept
  whatever name and colour it already had.
- A configured ID that no longer exists is reported as **not found and left
  alone**, instead of being silently replaced by a brand-new default-named
  role or channel. That silent replacement was the confusing part: one wrong
  digit and you got a duplicate to hunt down, with nothing saying why.
- The "📊 Hub stats" category is only created when a counter channel actually
  needs creating, so linking your own channels stops leaving an empty category
  behind on every push.
- Summaries now separate **created**, **updated**, **already correct** and
  **not found**, in Discord and in the dashboard alike.

### 🎛️ Run the bot from the dashboard

- **Admin → Discord bot** gains a console: **Announce**, **Moderation** (warn,
  timeout, remove timeout, kick, ban, unban), and **Channel tools** (purge,
  slowmode, lock, unlock) - the commands that *do* something, now runnable
  without opening Discord.
- **Saving a section applies it.** It used to write to Postgres and stop, so
  the dashboard and the server disagreed until someone ran the matching
  `/setup`. The push is best-effort on purpose: settings are saved either way,
  so a Discord problem costs a retry of the push, never your edit.
- **Push settings to Discord** re-applies one section or all of them - for
  after someone edits roles by hand, or to repair the server after the bot was
  offline. Idempotent, so pressing it twice is safe.
- Both surfaces call the same functions (`lib/discord/ops.ts`), so a case
  opened on the website is numbered, DM'd and mod-logged identically to one
  opened in Discord. Moderation from the site is attributed to the staff
  member's linked Discord account, and refused without one.
- The ticket panel's channel is now recorded when it's posted, so it can be
  re-posted from the dashboard - previously that was only possible by running
  `/setup tickets` again.

### 🐛 Audit-log reasons broke every write to Discord

- **`/setup levels`, `/setup verification` and `/setup stats` could never create
  anything**, and moderation commands failed on any reason containing an emoji
  or an accent. The audit-log reason goes in an HTTP header, header values must
  be Latin-1, and the bot's own reasons contain an em dash ("Classic Games Hub
  - …"). `fetch` threw before the request was sent.
- The reason is now URL-encoded, as Discord documents it. Reads were never
  affected - they send no reason header - which is why listing roles worked
  while creating them didn't, and why `/setup modlog` (database only) was the
  one setup command that succeeded.
- `discordFetch` reports the real exception instead of a bare "network". That
  one word hid a `TypeError` thrown by `fetch` itself and turned a five-minute
  fix into a hunt for a permissions problem that never existed.

### 🔎 Discord setup diagnostics

- `/setup` now quotes **Discord's own error** for a failed create, plus the
  thing to actually change. The old summary guessed - "check my permissions and
  that my role is high enough" - for every cause alike, and the hierarchy half
  of that guess is never right for a creation: a new role starts at the bottom
  no matter who made it. Missing permissions, a bot invited without the `bot`
  scope, and a server at the 250-role cap all need different fixes and now read
  differently. The admin panel's role button reports the same detail.

- **Admin → Discord bot** now lists which Discord environment variables the
  deployment actually has (presence only, never values). An unset variable
  previously surfaced as "could not be verified" from Discord, or a generic
  failure from the register button, with no way to tell which one was missing.
- The worker accepts `DISCORD_BOT_TOKEN` as well as `DISCORD_TOKEN`. It is the
  same secret under two names, and copying the whole set across from Vercel
  otherwise exits with "missing" for a variable that looks present.
- `docs/discord-bot.md` gains a table of every variable, where to get it, and
  what breaks without it - including the one that makes Discord reject the
  interactions endpoint URL.

### 🤖 Register commands without a terminal

- **Admin → Discord bot → "Register slash commands"** does what
  `POST /api/discord/register` does, but from the dashboard - the cron route
  needs a bearer token, which suits a scheduler and not a person. Both call the
  same Discord endpoint with the same command set, and registration is a full
  replace, so repeating it is harmless.

### 📗 CLAUDE.md

- Added, so a session starting cold finds the plan (`lib/roadmap.ts`), the
  history (`lib/update-log.ts`), the rule that shipped work *moves* between
  them, where invariants belong, and that `bot/` typechecks separately.

### 📜 Update log

- New public **`/updates`** page: every release and the features it brought,
  every merged pull request, and every individual change that has reached
  production - 51 of them, back to the first commit in March.
- The roadmap now covers **only what's coming**. Shipped releases moved out of
  `lib/roadmap.ts` into `lib/update-log.ts`, so `/roadmap` is a short statement
  of intent instead of an ever-growing archive, and a release is only ever
  moved once: out of the roadmap, into the log.
- `LANDED` is generated from `git log --first-parent main`, so the landing
  history can be regenerated after a release rather than hand-maintained.
- Added `/updates` and `/status` to the sitemap; `/status` had been missing
  since it shipped.

### 🗺️ Roadmap restructure

- Everything still unbuilt across v1.2.0–v1.4.0 - eleven items that had been
  left scattered as loose ends - is gathered into a new **v1.5.0 "Collector's
  Edition"** and removed from the releases that had moved on without them.
- With those carried forward, **v1.3.0 and v1.4.0 are now fully shipped** and
  marked as such. Two partly-done items were split rather than moved wholesale:
  the level milestones that are live (L5/L10/L15/L30) stay in v1.3.0 as shipped
  with only L20 and L50 carried forward, and Turbo Horizon stays in v1.4.0 with
  only the remaining 3D titles carried forward.

### 🗃️ Migrations

- `0042`–`0046` were applied to the database but never reached the repository,
  leaving git two migrations behind the deployed schema. The SQL is recovered
  verbatim from the migration ledger; only the file header comments are new.

## Unreleased - "One Bot" (Discord consolidation)

The Hub's own Discord bot now covers everything Appy, Sapphire, Arcane and
ServerStats did, so the server can run on one bot instead of five.

### 🛡️ Join verification (replaces Appy)

- Verify panel with a one-press button, or a captcha mode that asks a maths
  question in a modal (the answer never leaves the server - the modal carries
  an HMAC of it).
- `/setup verification` creates the Verified/Unverified roles, posts the panel
  and stores every ID; new joiners get the Unverified role automatically.
- Optional minimum account age, verification log channel, welcome message with
  `{user}` / `{server}` / `{count}` placeholders, and `/verify` for members who
  prefer a command.

### ⚖️ Moderation, announcements & tickets (replaces Sapphire)

- New commands: `/kick` `/unban` `/untimeout` `/purge` `/slowmode` `/lock`
  `/unlock` `/warnings`, alongside the existing `/warn` `/timeout` `/ban`.
- Every action creates a numbered case (`discord_mod_cases`), optionally DMs
  the member, posts to a mod-log channel and lands in the website audit trail.
- `/announce` posts branded embeds (or plain text) with scoped role pings.
- Ticket system: panel button or `/ticket [subject]` opens a private channel,
  `/close` posts a transcript to the log channel and deletes it.
- Opt-in automod: Discord invites, links, mass mentions and message floods,
  with exempt roles/channels and delete-or-timeout actions.

### ⭐ Levels & milestone roles (replaces Arcane)

- `/level` - progress bar, rank, current and next milestone role; `/rewards`
  lists the whole ladder.
- Milestone roles at levels 1, 5, 10, 20, 30, 40, 50, 75 and 100 (editable).
  `/setup levels` creates them in Discord, and they're granted the moment
  someone levels up - stacking, or highest-only if you prefer.

### 📊 Live counters (replaces ServerStats)

- `/setup stats` creates voice channels showing live numbers, including
  **online players on the website**, refreshed every 10 minutes.
- Also available serverlessly at `/api/cron/discord-stats`.

### 🟢 Staying online

- The gateway worker now sets an explicit presence, re-asserts it every 10
  minutes, auto-reconnects, and serves `/health` on `$PORT`. Added `fly.toml`
  (always-on) and `render.yaml` (free tier + keep-alive pinger).

### 🔧 Admin

- **Admin → Discord bot** gained sections for verification, milestone roles,
  counters, tickets and moderation/automod, plus one-click "create missing
  milestone roles" and "refresh counters".
- New migration `0041`.

## v1.4.1 - "Every Pixel" (games & themes overhaul)

### 🎮 Games

- **All eight "coming soon" games are playable again** - Tic-Tac-Toe, Connect
  Four, Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush and Reversi were
  rebuilt to the quality bar in v1.2.2 and are now republished (migration
  `0038`).
- **HiDPI rendering** - every canvas game now renders at device resolution
  (up to 2×), so games are pin-sharp on retina screens and in fullscreen.
- **Fullscreen, done properly** - fullscreen now takes the whole player
  (score, controls and touch pads included) onto an ambient themed backdrop
  with the game letterboxed and glowing - and it works on mobile too.
- **Device-aware controls** - the Controls tab now shows touch controls on
  touch devices and keyboard controls on desktop, with a toggle to peek at
  the other, for every game.
- **Auto-pause** - games pause themselves when the tab loses visibility.

### 🎨 Global colour themes

- **Recolour the whole site** from Settings → Preferences: Arcade Violet,
  Midnight (true black), Ocean and Emerald free for everyone; Crimson, Gold
  Rush, Neon Rose and the animated **Synthwave** and **Aurora** (their hue
  slowly drifts) reserved for Discord boosters and staff, with a lock shown on
  the swatches. The gate is enforced in the database, applied before first
  paint, and animated themes respect reduced-motion.

### ⚡ Performance

- Route-shaped loading skeletons for the games library, game pages, shop,
  leaderboards, messages and profiles.
- Preconnect to Supabase from the document head for faster first data fetch.

---

## v1.3.0 - "Living Arcade" (first wave) + v1.4.0 first titles

The long-term-engagement update, and the first step into new dimensions.

### 💰 Economy

- **Stacking boosts + effect queue** - boosts now stack their multiplier up to
  **5×** (10× for Discord boosters). Buy past the cap and the extra boost
  joins a queue that takes over automatically the moment the current window
  ends. The inventory shows the live multiplier, countdown and queue depth.
- **Booster perks** - Discord server boosters are detected automatically via
  role sync: +50% daily rewards, a higher boost cap, tenure badges at
  1/3/6/12 months, and a `__booster__` role-map key.

### 🔥 Engagement

- **Message streaks** - keep a DM conversation going every day (both sides)
  to build a streak. A flame chip in the chat header tracks it, and milestone
  days (3 · 7 · 14 · 30 · 50 · 100) pay credits to both of you.
- **Community mega-events** - admins launch server-wide co-op goals ("500
  plays this weekend") from **Admin → Events**; a live progress bar sits on
  the home page and everyone who took part is paid and notified automatically
  the moment the goal lands.
- **Background music** - four original tracks (Neon Drift, Starlight, Arcade
  Heart, Deep Focus), procedurally rendered in the browser with the Web Audio
  API - zero copyright, nothing to download. Buy them in the shop from level
  5 and play them from the new navbar player.
- **Level 50: Singularity** - a mythic, unbuyable profile effect granted
  automatically at level 50. Mythic is a new top rarity tier.

### 🕹️ New dimensions (v1.4 first titles)

- **Turbo Horizon** - an OutRun-style pseudo-3D racer: a winding, hilly neon
  highway, traffic to slip past, overtake bonuses and full touch controls.
- **Pass-and-play** - Tic-Tac-Toe gained a 2P toggle for local two-player
  matches on one device.

### 🛠️ Admin

- **Admin → Site** - the ads centre (master kill-switch + placement toggles,
  ready for a future NitroPay integration), reorder/hide any home-page
  section, and a validated, editable roadmap override that `/roadmap` renders
  live.
- New migrations `0036`–`0037`.

## v1.2.3 - "The Bot Update"

The Discord bot becomes a first-class, free-to-run part of the platform - plus
the Hub's legal foundation.

### 🤖 Discord bot 2.0 (replaces Arcane for levelling)

- **Serverless slash commands** - `/link`, `/unlink`, `/profile`, `/balance`,
  `/daily`, `/pay`, `/rank`, `/levels`, `/leaderboard`, `/sync`, `/help`,
  `/warn`, `/timeout`, `/ban` now run through Discord HTTP interactions served
  by the website on Vercel (Ed25519-verified). No hosted bot process, no
  hosting bill. *(See `docs/discord-bot.md` for setup.)*
- **Secure account linking** - link Discord from **Settings → Connections**
  via Discord OAuth, or with a one-time `/link` code minted in the server.
  Both flows prove you own the Discord account; unlink any time (with
  lock-out protection for Discord-only sign-ins).
- **Discord levels** - chat XP with configurable rates, cooldown and level
  curve (MEE6/Arcane-style defaults), anti-spam enforced in Postgres,
  `/rank` + `/levels`, level-up announcements, website notifications for
  linked players, and an optional XP trickle into your Hub level.
- **Role sync** - Hub badges, achievements, staff status, nameplates and
  levels map to Discord roles via an admin-editable role map. Synced on
  change, on server join, on `/sync`, and nightly; the website is the source
  of truth, and banned accounts lose managed roles.
- **Admin → Discord bot** - tune XP rates, curves, announcements and the role
  map from the dashboard; run a full role sync on demand.
- The old always-on bot is now an optional **companion worker** (`bot/`) that
  only covers what webhooks can't: chat-message XP, the live feed, stat
  counters and join-time sync.

### 🏛️ Platform

- **Terms of Service & Privacy Policy** - readable, UK-GDPR-aware legal pages
  (`/legal/terms`, `/legal/privacy`) that describe exactly what the platform
  actually collects, linked from the footer, sign-up and settings.
- **Level-milestone unlocks** - create groups at level 10 and post stories at
  level 15, or link Discord for instant access as before.
- **Admin analytics** - active players (1/7/30 days), plays per day, sign-ups
  per day and average session length at **Admin → Analytics** - computed from
  existing data, no new tracking.
- **Social share card** - links to the Hub now unfurl with a branded preview
  image.
- **Security hardening** - tightened `EXECUTE` grants flagged by the Supabase
  security advisor (migration `0034`).

## v1.2.2 - "Arcade & Chat Polish"

A quality pass on playing and chatting.

### 💬 Messaging

- **Send GIFs** - a Discord-style GIF picker in the composer, powered by Giphy.
  Search or browse trending GIFs and tap one to send; it renders inline as an
  image. You pick from Giphy only (no uploads or pasted image URLs), and only
  Giphy links are ever embedded. *(Requires a `GIPHY_API_KEY`; without it the
  picker simply shows no results.)*
- **Reliable sending** - messages no longer get stuck on "Sending…" until a
  refresh. A sent message resolves the instant the server confirms it, rather
  than waiting on the realtime echo.
- **Live, lightweight updates** - the thread stays live for sent and received
  messages without reloading the whole page; a cheap background sync fills in
  anything realtime misses.

### 🎮 Games

- **Six games rebuilt** - Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush
  and Reversi rebuilt as animated, mobile-first, tactile canvas games to match
  the Tic-Tac-Toe and Connect Four bar.

### 🎨 Cosmetics & shop

- **Cosmetics glow-up** - the kept nameplates, frames, effects, themes, banners,
  badges and boosts had their particles and animations reworked to a
  Discord-tier bar, all reduced-motion friendly.
- **Shop refinement** - a curated cull of overlapping cosmetics with automatic
  credit refunds.
- **Group-creation fix** - creating a group no longer errors on the invite-code
  step; groups create cleanly.

---

## v1.2.1 - "Notifications & Polish"

A small point release on top of v1.2.0.

- **Notification detail overlay** - tap any notification to see the full
  message, the exact date & time it was sent, and an **Open** button when a
  link is attached (opening marks it read).
- **Linkable announcements** - admins can attach a call-to-action link to an
  announcement, and publishing with **Notify everyone** now actually sends a
  notification (with that link) to every player. *(The toggle previously did
  nothing - this also fixes that bug.)*
- **Podium glow-up** - the global leaderboard's top three now sit on a tiered
  gold/silver/bronze podium with rank badges, a crowned #1 and nameplates.
- **Group chat menu** - copy a group's invite link again or leave the group
  from the chat header.

---

## v1.2.0 - "Identity & Connection"

The biggest social and cosmetic update yet. v1.2.0 makes your profile
unmistakably yours and turns the Hub into somewhere to hang out, not just play -
with deep customisation, a real social graph, a modern messenger, group chats,
stories, and a store & inventory that are finally a pleasure to use.

Everything here is non-pay-to-win; cosmetics are earned or bought with credits
you win by playing.

### ✨ Profiles 2.0

- **Display-name styles** - a curated set of name treatments (Gold, Neon glow,
  Fire, Ocean, Rainbow, Elegant, Mono) with a live preview in settings.
- **Nameplates & name styles everywhere** - your equipped nameplate and name
  style now render across the whole site: player search, friends, the home
  leaderboard preview and the full leaderboards, not just your profile.
- **About-me** - add pronouns and a short status line alongside your bio.
- **Featured achievement** - pin one achievement to headline your profile.
- **Trophy case** - pin up to four favourite games to a showcase on your page.
- **Discord-linked badge** - verified Discord accounts get a badge on their
  profile, and follower / following / mutual-friend counts are shown.

### 🎨 Cosmetics engine

- **New cosmetics** - five profile themes, four banners, five avatar frames and
  two new profile effects (Aurora, Fireflies), all purchasable in the shop.
- **Tiered banners** - a free solid-colour banner for everyone (presets or a
  custom colour), shop gradient/premade banners, and custom banner-image uploads
  for Discord-linked members.
- **Rarity tiers** - every cosmetic shows its rarity (common → legendary) in the
  shop and inventory.
- **Staff cosmetics** - unbuyable, staff-only flair (e.g. the Developer Aura).

### 👥 Social

- **Follow** players one-way alongside two-way friendships - and they're
  notified when you do.
- **Mutual friends** and **friends-list visibility** (private / friends /
  followers / public).
- **Private notes & nicknames** - leave a private note or nickname on anyone's
  profile that only you can see.
- **Rich presence** - set your status (online / away / do-not-disturb / sleep /
  invisible / automatic) and choose exactly who can see it.

### 💬 Messaging

- **Message reactions** - react with emoji; reactions show as grouped chips and
  sync live to the other person.
- **Emoji picker** in the composer.
- **Timestamps, date separators and delivered / seen receipts** (from v1.1.1),
  with cleaner grouped bubbles.
- **Group chats** - create a group, share an invite link
  (`/invite/<code>`), and chat with everyone; groups show member counts and
  per-message sender names. *(Creating groups is currently limited to
  Discord-linked members and staff.)*
- **Stories** - post a 24-hour text story your friends can tap through, with a
  stories strip on the Messages page. *(Posting is currently limited to
  Discord-linked members and staff.)*

### 🛍️ Store & inventory

- **Live item previews** - every shop item opens a preview page (in a new tab)
  that renders the cosmetic on a mock profile before you spend.
- **Apply from the shop** - apply items you own straight from the shop.
- **Wishlist & gifting** - wishlist items (viewable and managed from your
  inventory) and gift them to friends at **75%** of the list price.
- **Inventory overhaul** - search, type/rarity filters, sorting, clear "Applied"
  state, and a live boost timer showing the correct time remaining and
  multiplier.

### 🧭 Interface & quality of life

- **Redesigned navigation** - a proper mobile hamburger drawer with the full
  navigation and account controls, plus a roomier desktop nav.
- **Device-appropriate game controls** - on-screen touch controls for touch
  devices and keyboard hints for pointer devices, based on your actual input
  rather than screen width.
- **Flexible sign-in** - email/username + password login and signup alongside
  Discord.

### 🔧 Under the hood

- New migrations `0020`–`0028`: `discord_linked` sync, presence/visibility
  settings, Profile-2.0 fields, the `follows`/`user_notes` social graph,
  `wishlist_items` + `gift_item`, `message_reactions`, group-chat columns +
  RPCs, `stories`, a cosmetics-catalogue seed, and follow notifications.
- All new tables use least-privilege Row Level Security; all currency and
  social mutations go through `SECURITY DEFINER` RPCs.

> **Note on the Discord-linked gate:** group creation, story posting and custom
> banner uploads are gated to Discord-linked members and staff as an interim
> stand-in for "boosters" until the free-tier Discord bot lands in a later
> release. It's a one-line change per RPC to switch to a real booster check.

---

## v1.1.1

Bug-fix release: fixed gradient text rendering as a solid block, added
long-press flagging to Minesweeper on mobile, fixed fullscreen stretching /
resolution on games, made the admin "rewarded ads" flag remove all ads
site-wide, and added `sitemap.xml` + `robots.txt`.

## v1.1.0 - feature complete

Discord-only login and usernames, mobile-first games (touch controls,
responsive canvases, per-game tuning, safe-area/overscroll), an admin control
centre, profile customisation (nameplates, staff flair, effects), a living
economy & events system, and a performance pass.
