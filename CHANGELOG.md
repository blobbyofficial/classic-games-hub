# Changelog

All notable changes to Classic Games Hub. Dates are release targets; see the
live roadmap at `/roadmap`.

## Unreleased - "Collector's Edition" (v1.5.0, in progress)

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
