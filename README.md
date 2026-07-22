# Classic Games Hub

A modern, production-ready arcade platform — 23 playable classics wrapped in a
full community layer: accounts, friends, real-time chat, a virtual credits
economy, achievements, leaderboards, daily challenges, cosmetics, and an admin
dashboard. Rebuilt from the ground up for 2026.

> Founder: [BlobbyOfficial](https://www.blobbyofficial.com) ·
> Community: [Discord](https://discord.gg/A8PThHqedD)

## Tech stack

| Layer         | Choice                                                             |
| ------------- | ----------------------------------------------------------------- |
| Framework     | **Next.js 16** (App Router, RSC, Server Actions) + **React 19**   |
| Language      | **TypeScript** (strict)                                           |
| Styling       | **Tailwind CSS v4** + a shadcn/ui-style component library         |
| Animation     | **Framer Motion**                                                 |
| Data / async  | **TanStack React Query**, **Zustand** for lightweight client state |
| Backend       | **Supabase** — Postgres, Auth, Realtime, Storage, RLS             |
| Analytics     | **Vercel Analytics** + **Speed Insights**                         |
| Hosting       | **Vercel** (app) + **Supabase** (data)                            |
| PWA           | Web manifest, installable, offline-friendly shell                 |

## Architecture

```
app/                 Next.js routes (route groups: (auth), (main))
  (auth)/            login, register, forgot-password
  (main)/            the app shell — home, games, social, economy, admin
  auth/callback/     OAuth / magic-link handler
components/
  ui/                design-system primitives (button, dialog, select, …)
  shell/             navbar, sidebar, mobile nav, command palette, footer
  games/             game cards, grid, rating, favorites
  profile/           xp bar, presence, themes
features/            self-contained feature modules (auth, social, economy, …)
hooks/               shared React hooks
lib/
  supabase/          browser + server clients, auth proxy, cached queries
  games/             canvas engine framework, registry, 23 engines
  stores/            Zustand stores (session, ui)
  utils.ts           formatting, level math, helpers
services/            server-only data fetchers (cached with React cache)
actions/             typed Server Actions (auth, profile, social, economy, …)
types/               hand-authored DB types + domain types
database/migrations/ the full SQL schema (source of truth)
public/              icons, PWA manifest, generated game thumbnails
styles/              Tailwind theme + global CSS
```

### Design principles

- **Server-authoritative economy.** All credit/XP mutations happen inside
  `SECURITY DEFINER` Postgres functions (`submit_score`, `claim_daily_reward`,
  `purchase_shop_item`, …). The client can never mint currency — `EXECUTE` on
  the internal reward helpers is revoked from `anon`/`authenticated`
  (migration `0006`). Scores are clamped and rate-limited server-side.
- **Row Level Security everywhere.** Every table has RLS enabled; players only
  read/write their own private rows, public data is explicitly opened up.
- **Thin client, typed server actions.** UI calls typed Server Actions that
  validate with Zod and delegate to RPCs, then `revalidatePath`.
- **Small files, feature folders.** No giant components; logic is split by
  feature and reused.

## Database

Numbered migrations under `database/migrations/` are the source of truth and
run in order. The foundation:

1. `0001_core_identity` — profiles, settings, credits ledger, XP/levels,
   notifications, storage buckets, new-user bootstrap trigger.
2. `0002_games_platform` — games catalog, ratings, favorites, play sessions,
   leaderboards, activity feed.
3. `0003_social` — friendships, blocks, conversations, messages, realtime.
4. `0004_economy_admin` — shop, inventory, achievements, daily rewards,
   challenges, events, reports, announcements, audit log, feature flags, and
   the `submit_score` game loop.
5. `0005_seed` — games, achievements, shop items, feature flags.
6. `0006_harden_functions` — locks down `EXECUTE` on privileged functions.
7. `0007_read_helpers` — ranked leaderboards, the bidirectional friends graph,
   profile stat rollups.

Later migrations layer on features: `0008`–`0019` add username onboarding,
admin level/XP + banner/event tooling, nameplates & staff flair, player search,
seasonal multipliers, the store expansion and challenge system. **v1.2.0**
adds `0020`–`0028`: `discord_linked` detection + presence/visibility settings,
Profile-2.0 fields, the follows/notes social graph, wishlist + gifting, message
reactions, group chats, stories, and a cosmetics-catalogue expansion. **v1.2.3**
adds `0033`–`0035`: the Discord bot v2 schema (`discord_links`, link codes,
`discord_levels`, `discord_bot_config` + service-role RPCs), security
hardening from the Supabase advisor, and level-milestone unlocks.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your Supabase URL + publishable key (values for the live project
# are already in .env.example). Add SUPABASE_SECRET_KEY only if you need
# service-role scripts — the app itself does not require it.

# 3. Run
npm run dev        # http://localhost:3000
```

### Applying the schema to a fresh Supabase project

Run the migrations in `database/migrations/` in order via the Supabase SQL
editor or the CLI (`supabase db push`). They are idempotent-friendly and ordered.

### Configuring OAuth

Enable the providers you want (Google, Discord, GitHub, Microsoft/Azure) in
**Supabase → Authentication → Providers**, and add
`https://<your-domain>/auth/callback` as a redirect URL. Email/password works
out of the box.

## Scripts

| Script                  | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the dev server                         |
| `npm run build`         | Production build                             |
| `npm run start`         | Serve the production build                   |
| `npm run lint`          | ESLint                                       |
| `npm run typecheck`     | `tsc --noEmit`                               |

Game thumbnails are generated art: `node scripts/generate-thumbnails.mjs`.

## Features

- **23 playable games** — Snake, Tetris, 2048, Breakout, Pong, Asteroids, Space
  Invaders, Frogger, Neon Runner, Target Rush, Gem Cascade, Bubble Pop,
  Minesweeper, Memory, 15 Puzzle, Mastermind, Hangman, Simon, Tic-Tac-Toe,
  Connect Four, Reversi, Whack-a-Mole, Lights Out. Each is a self-contained,
  code-split canvas engine with keyboard + touch controls.
- **Accounts** — email/username + password and OAuth (Discord/Google/GitHub/
  Microsoft); profiles with avatars, tiered banners, bios, pronouns, a status
  line, levels, XP, credits, badges, achievements and inventory.
- **Profiles 2.0** — nameplates and display-name styles that render everywhere,
  a featured achievement, a trophy case of favourite games, a Discord-linked
  badge, and profile effects/themes.
- **Social** — friend requests, one-way follows (with notifications), mutual
  friends, friends-list visibility, private notes/nicknames, rich presence
  (online/away/DND/sleep/invisible) with audience controls, block/report.
- **Messaging** — real-time DMs with timestamps, delivered/seen receipts, emoji
  reactions and an emoji picker; **group chats** with shareable invite links;
  24-hour **stories**.
- **Credits economy** — earn from playing, daily rewards, achievements and
  challenges; spend on cosmetics, boosts and username changes; a wishlist and
  **gifting** at 75% of list price. No pay-to-win.
- **Store & inventory** — live cosmetic previews, apply-from-shop, and an
  inventory with search, filters and live boost timers.
- **Optional rewarded ads** — an opt-in "2× credits" setting, fully removable
  via an admin flag; never intrusive.
- **Discord bot** — serverless slash commands (economy, profiles, `/rank`
  levels, role sync, moderation) served by the site itself, secure account
  linking from Settings → Connections, an Arcane-replacing level system and
  automatic role sync. See `docs/discord-bot.md`.
- **Admin dashboard** — manage users, games, reports, announcements, credits,
  seasonal events, feature flags, the Discord bot (leveling + role map),
  analytics, and read the audit log.
- **Legal** — Terms of Service and a UK-GDPR-aware Privacy Policy at
  `/legal/terms` and `/legal/privacy`.
- **Polish** — dark mode, glassmorphism, command palette (⌘K), loading
  skeletons, optimistic UI, keyboard shortcuts, mobile-first responsive design,
  accessibility, and PWA installability.

## Security

- Row Level Security on every table with least-privilege policies.
- Column-level grants so players can't edit credits/xp/level/role/username.
- `EXECUTE` revoked on internal reward functions.
- Server Actions validate all input with Zod; scoring is server-authoritative
  and rate-limited.
- Security headers (`X-Frame-Options`, `nosniff`, referrer policy, permissions
  policy) set in `next.config.ts`.
- Open-redirect-safe auth callback.

## Roadmap

A live, always-current roadmap lives in the app at **`/roadmap`** (data in
`lib/roadmap.ts`). Current shape:

- **v1.1.x** — shipped: mobile-first games, admin control centre, profile
  customisation, living economy & events, plus v1.1.1 fixes.
- **v1.2.0 "Identity & Connection"** — shipped: flexible sign-in, deep profile
  customisation, the social graph (follows, mutual friends, notes), a modern
  messenger with reactions, group chats and stories, rich presence, wishlist &
  gifting, a store/inventory overhaul, and a redesigned navigation. See
  `CHANGELOG.md`.
- **v1.3.0 "Living Arcade"** — planned: long-term engagement loops, booster
  rewards, background music tracks, stacking boosts, and an analytics + ads
  control centre (ads via NitroPay).
- **v1.4.0 "New Dimensions"** — planned: 3D games, real multiplayer with
  parties, store-decorated avatars, and an admin-customisable home screen.

A free-tier Discord bot (HTTP interactions on Supabase/Vercel) that bridges
badges → Discord roles and adds slash commands is planned for a future release.

## License

Built for the Classic Games Hub community. All rights reserved by the project owner.
