# Changelog

All notable changes to Classic Games Hub. Dates are release targets; see the
live roadmap at `/roadmap`.

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
