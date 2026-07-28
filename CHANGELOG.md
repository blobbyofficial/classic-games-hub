# Changelog

All notable changes to Classic Games Hub. Dates are release targets; see the
live roadmap at `/roadmap`.

## Unreleased — "New Dimensions" (parties & online multiplayer)

Roadmap v1.4.0. Playing together stops being a plan and becomes a feature, and
four migrations that were live in the database finally have code to reach them.

### 🎉 Parties

- `/party` creates or joins a party by six-character code, with a live roster,
  presence, leader controls and one-tap invites from your friends list.
- One party per person, size limits, block-list checks and leadership handover
  when the leader leaves are all enforced in the database (`0044`), not in the
  UI — the tables are RLS-locked to "you can only see a party you're in" and
  every write goes through a `SECURITY DEFINER` RPC.
- Party invites arrive as notifications carrying the code, so the recipient
  still chooses whether to join.

### 🎮 Online multiplayer

- **Head-to-head**: Tic-Tac-Toe, Connect 4 and Reversi become real online
  matches on one shared board with alternating turns and a fixed seat order.
  Engines opt in through an optional `net` context — every other engine is
  untouched and behaves exactly as before.
- **Score races**: every other game becomes a race — same game, same countdown,
  live standings.
- Live match state rides a Supabase Realtime broadcast channel keyed by party
  id and is never persisted; scores still go through the ordinary
  `submit_score` path, so party play earns exactly what solo play earns.

### 📊 Status page

- A public `/status` renders `platform_status()` in one round trip: players
  online, plays today, community and economy counts, and Discord worker
  liveness. Moderation counts are staff-only.
- The gateway worker now actually reports in — it calls `bot_heartbeat()` on
  connect and every 60 seconds. Without this the status page showed the bot as
  permanently offline no matter how healthy it was (`0043` shipped the RPC, but
  nothing ever called it).

### 🔗 Vanity URLs & booster dailies

- `/u/<slug>` resolves either a username or a vanity slug, so every profile
  link, share card and metadata route works with both. Claim or clear yours in
  Settings — unlocked by boosting, by reaching level 30, or by being staff
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

### 🔎 Discord setup diagnostics

- **Admin → Discord bot** now lists which Discord environment variables the
  deployment actually has (presence only, never values). An unset variable
  previously surfaced as "could not be verified" from Discord, or a generic
  failure from the register button, with no way to tell which one was missing.
- The worker accepts `DISCORD_BOT_TOKEN` as well as `DISCORD_TOKEN`. It is the
  same secret under two names, and copying the whole set across from Vercel
  otherwise exits with "missing" for a variable that looks present.
- `docs/discord-bot.md` gains a table of every variable, where to get it, and
  what breaks without it — including the one that makes Discord reject the
  interactions endpoint URL.

### 🤖 Register commands without a terminal

- **Admin → Discord bot → "Register slash commands"** does what
  `POST /api/discord/register` does, but from the dashboard — the cron route
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
  production — 51 of them, back to the first commit in March.
- The roadmap now covers **only what's coming**. Shipped releases moved out of
  `lib/roadmap.ts` into `lib/update-log.ts`, so `/roadmap` is a short statement
  of intent instead of an ever-growing archive, and a release is only ever
  moved once: out of the roadmap, into the log.
- `LANDED` is generated from `git log --first-parent main`, so the landing
  history can be regenerated after a release rather than hand-maintained.
- Added `/updates` and `/status` to the sitemap; `/status` had been missing
  since it shipped.

### 🗺️ Roadmap restructure

- Everything still unbuilt across v1.2.0–v1.4.0 — eleven items that had been
  left scattered as loose ends — is gathered into a new **v1.5.0 "Collector's
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

## Unreleased — "One Bot" (Discord consolidation)

The Hub's own Discord bot now covers everything Appy, Sapphire, Arcane and
ServerStats did, so the server can run on one bot instead of five.

### 🛡️ Join verification (replaces Appy)

- Verify panel with a one-press button, or a captcha mode that asks a maths
  question in a modal (the answer never leaves the server — the modal carries
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

- `/level` — progress bar, rank, current and next milestone role; `/rewards`
  lists the whole ladder.
- Milestone roles at levels 1, 5, 10, 20, 30, 40, 50, 75 and 100 (editable).
  `/setup levels` creates them in Discord, and they're granted the moment
  someone levels up — stacking, or highest-only if you prefer.

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

## v1.4.1 — "Every Pixel" (games & themes overhaul)

### 🎮 Games

- **All eight "coming soon" games are playable again** — Tic-Tac-Toe, Connect
  Four, Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush and Reversi were
  rebuilt to the quality bar in v1.2.2 and are now republished (migration
  `0038`).
- **HiDPI rendering** — every canvas game now renders at device resolution
  (up to 2×), so games are pin-sharp on retina screens and in fullscreen.
- **Fullscreen, done properly** — fullscreen now takes the whole player
  (score, controls and touch pads included) onto an ambient themed backdrop
  with the game letterboxed and glowing — and it works on mobile too.
- **Device-aware controls** — the Controls tab now shows touch controls on
  touch devices and keyboard controls on desktop, with a toggle to peek at
  the other, for every game.
- **Auto-pause** — games pause themselves when the tab loses visibility.

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

## v1.3.0 — "Living Arcade" (first wave) + v1.4.0 first titles

The long-term-engagement update, and the first step into new dimensions.

### 💰 Economy

- **Stacking boosts + effect queue** — boosts now stack their multiplier up to
  **5×** (10× for Discord boosters). Buy past the cap and the extra boost
  joins a queue that takes over automatically the moment the current window
  ends. The inventory shows the live multiplier, countdown and queue depth.
- **Booster perks** — Discord server boosters are detected automatically via
  role sync: +50% daily rewards, a higher boost cap, tenure badges at
  1/3/6/12 months, and a `__booster__` role-map key.

### 🔥 Engagement

- **Message streaks** — keep a DM conversation going every day (both sides)
  to build a streak. A flame chip in the chat header tracks it, and milestone
  days (3 · 7 · 14 · 30 · 50 · 100) pay credits to both of you.
- **Community mega-events** — admins launch server-wide co-op goals ("500
  plays this weekend") from **Admin → Events**; a live progress bar sits on
  the home page and everyone who took part is paid and notified automatically
  the moment the goal lands.
- **Background music** — four original tracks (Neon Drift, Starlight, Arcade
  Heart, Deep Focus), procedurally rendered in the browser with the Web Audio
  API — zero copyright, nothing to download. Buy them in the shop from level
  5 and play them from the new navbar player.
- **Level 50: Singularity** — a mythic, unbuyable profile effect granted
  automatically at level 50. Mythic is a new top rarity tier.

### 🕹️ New dimensions (v1.4 first titles)

- **Turbo Horizon** — an OutRun-style pseudo-3D racer: a winding, hilly neon
  highway, traffic to slip past, overtake bonuses and full touch controls.
- **Pass-and-play** — Tic-Tac-Toe gained a 2P toggle for local two-player
  matches on one device.

### 🛠️ Admin

- **Admin → Site** — the ads centre (master kill-switch + placement toggles,
  ready for a future NitroPay integration), reorder/hide any home-page
  section, and a validated, editable roadmap override that `/roadmap` renders
  live.
- New migrations `0036`–`0037`.

## v1.2.3 — "The Bot Update"

The Discord bot becomes a first-class, free-to-run part of the platform — plus
the Hub's legal foundation.

### 🤖 Discord bot 2.0 (replaces Arcane for levelling)

- **Serverless slash commands** — `/link`, `/unlink`, `/profile`, `/balance`,
  `/daily`, `/pay`, `/rank`, `/levels`, `/leaderboard`, `/sync`, `/help`,
  `/warn`, `/timeout`, `/ban` now run through Discord HTTP interactions served
  by the website on Vercel (Ed25519-verified). No hosted bot process, no
  hosting bill. *(See `docs/discord-bot.md` for setup.)*
- **Secure account linking** — link Discord from **Settings → Connections**
  via Discord OAuth, or with a one-time `/link` code minted in the server.
  Both flows prove you own the Discord account; unlink any time (with
  lock-out protection for Discord-only sign-ins).
- **Discord levels** — chat XP with configurable rates, cooldown and level
  curve (MEE6/Arcane-style defaults), anti-spam enforced in Postgres,
  `/rank` + `/levels`, level-up announcements, website notifications for
  linked players, and an optional XP trickle into your Hub level.
- **Role sync** — Hub badges, achievements, staff status, nameplates and
  levels map to Discord roles via an admin-editable role map. Synced on
  change, on server join, on `/sync`, and nightly; the website is the source
  of truth, and banned accounts lose managed roles.
- **Admin → Discord bot** — tune XP rates, curves, announcements and the role
  map from the dashboard; run a full role sync on demand.
- The old always-on bot is now an optional **companion worker** (`bot/`) that
  only covers what webhooks can't: chat-message XP, the live feed, stat
  counters and join-time sync.

### 🏛️ Platform

- **Terms of Service & Privacy Policy** — readable, UK-GDPR-aware legal pages
  (`/legal/terms`, `/legal/privacy`) that describe exactly what the platform
  actually collects, linked from the footer, sign-up and settings.
- **Level-milestone unlocks** — create groups at level 10 and post stories at
  level 15, or link Discord for instant access as before.
- **Admin analytics** — active players (1/7/30 days), plays per day, sign-ups
  per day and average session length at **Admin → Analytics** — computed from
  existing data, no new tracking.
- **Social share card** — links to the Hub now unfurl with a branded preview
  image.
- **Security hardening** — tightened `EXECUTE` grants flagged by the Supabase
  security advisor (migration `0034`).

## v1.2.2 — "Arcade & Chat Polish"

A quality pass on playing and chatting.

### 💬 Messaging

- **Send GIFs** — a Discord-style GIF picker in the composer, powered by Giphy.
  Search or browse trending GIFs and tap one to send; it renders inline as an
  image. You pick from Giphy only (no uploads or pasted image URLs), and only
  Giphy links are ever embedded. *(Requires a `GIPHY_API_KEY`; without it the
  picker simply shows no results.)*
- **Reliable sending** — messages no longer get stuck on "Sending…" until a
  refresh. A sent message resolves the instant the server confirms it, rather
  than waiting on the realtime echo.
- **Live, lightweight updates** — the thread stays live for sent and received
  messages without reloading the whole page; a cheap background sync fills in
  anything realtime misses.

### 🎮 Games

- **Six games rebuilt** — Simon, 15 Puzzle, Lights Out, Bubble Pop, Target Rush
  and Reversi rebuilt as animated, mobile-first, tactile canvas games to match
  the Tic-Tac-Toe and Connect Four bar.

### 🎨 Cosmetics & shop

- **Cosmetics glow-up** — the kept nameplates, frames, effects, themes, banners,
  badges and boosts had their particles and animations reworked to a
  Discord-tier bar, all reduced-motion friendly.
- **Shop refinement** — a curated cull of overlapping cosmetics with automatic
  credit refunds.
- **Group-creation fix** — creating a group no longer errors on the invite-code
  step; groups create cleanly.

---

## v1.2.1 — "Notifications & Polish"

A small point release on top of v1.2.0.

- **Notification detail overlay** — tap any notification to see the full
  message, the exact date & time it was sent, and an **Open** button when a
  link is attached (opening marks it read).
- **Linkable announcements** — admins can attach a call-to-action link to an
  announcement, and publishing with **Notify everyone** now actually sends a
  notification (with that link) to every player. *(The toggle previously did
  nothing — this also fixes that bug.)*
- **Podium glow-up** — the global leaderboard's top three now sit on a tiered
  gold/silver/bronze podium with rank badges, a crowned #1 and nameplates.
- **Group chat menu** — copy a group's invite link again or leave the group
  from the chat header.

---

## v1.2.0 — "Identity & Connection"

The biggest social and cosmetic update yet. v1.2.0 makes your profile
unmistakably yours and turns the Hub into somewhere to hang out, not just play —
with deep customisation, a real social graph, a modern messenger, group chats,
stories, and a store & inventory that are finally a pleasure to use.

Everything here is non-pay-to-win; cosmetics are earned or bought with credits
you win by playing.

### ✨ Profiles 2.0

- **Display-name styles** — a curated set of name treatments (Gold, Neon glow,
  Fire, Ocean, Rainbow, Elegant, Mono) with a live preview in settings.
- **Nameplates & name styles everywhere** — your equipped nameplate and name
  style now render across the whole site: player search, friends, the home
  leaderboard preview and the full leaderboards, not just your profile.
- **About-me** — add pronouns and a short status line alongside your bio.
- **Featured achievement** — pin one achievement to headline your profile.
- **Trophy case** — pin up to four favourite games to a showcase on your page.
- **Discord-linked badge** — verified Discord accounts get a badge on their
  profile, and follower / following / mutual-friend counts are shown.

### 🎨 Cosmetics engine

- **New cosmetics** — five profile themes, four banners, five avatar frames and
  two new profile effects (Aurora, Fireflies), all purchasable in the shop.
- **Tiered banners** — a free solid-colour banner for everyone (presets or a
  custom colour), shop gradient/premade banners, and custom banner-image uploads
  for Discord-linked members.
- **Rarity tiers** — every cosmetic shows its rarity (common → legendary) in the
  shop and inventory.
- **Staff cosmetics** — unbuyable, staff-only flair (e.g. the Developer Aura).

### 👥 Social

- **Follow** players one-way alongside two-way friendships — and they're
  notified when you do.
- **Mutual friends** and **friends-list visibility** (private / friends /
  followers / public).
- **Private notes & nicknames** — leave a private note or nickname on anyone's
  profile that only you can see.
- **Rich presence** — set your status (online / away / do-not-disturb / sleep /
  invisible / automatic) and choose exactly who can see it.

### 💬 Messaging

- **Message reactions** — react with emoji; reactions show as grouped chips and
  sync live to the other person.
- **Emoji picker** in the composer.
- **Timestamps, date separators and delivered / seen receipts** (from v1.1.1),
  with cleaner grouped bubbles.
- **Group chats** — create a group, share an invite link
  (`/invite/<code>`), and chat with everyone; groups show member counts and
  per-message sender names. *(Creating groups is currently limited to
  Discord-linked members and staff.)*
- **Stories** — post a 24-hour text story your friends can tap through, with a
  stories strip on the Messages page. *(Posting is currently limited to
  Discord-linked members and staff.)*

### 🛍️ Store & inventory

- **Live item previews** — every shop item opens a preview page (in a new tab)
  that renders the cosmetic on a mock profile before you spend.
- **Apply from the shop** — apply items you own straight from the shop.
- **Wishlist & gifting** — wishlist items (viewable and managed from your
  inventory) and gift them to friends at **75%** of the list price.
- **Inventory overhaul** — search, type/rarity filters, sorting, clear "Applied"
  state, and a live boost timer showing the correct time remaining and
  multiplier.

### 🧭 Interface & quality of life

- **Redesigned navigation** — a proper mobile hamburger drawer with the full
  navigation and account controls, plus a roomier desktop nav.
- **Device-appropriate game controls** — on-screen touch controls for touch
  devices and keyboard hints for pointer devices, based on your actual input
  rather than screen width.
- **Flexible sign-in** — email/username + password login and signup alongside
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

## v1.1.0 — feature complete

Discord-only login and usernames, mobile-first games (touch controls,
responsive canvases, per-game tuning, safe-area/overscroll), an admin control
centre, profile customisation (nameplates, staff flair, effects), a living
economy & events system, and a performance pass.
