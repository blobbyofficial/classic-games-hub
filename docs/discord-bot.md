# Classic Games Hub — Discord bot

The Hub's Discord bot is built to run **entirely on the existing free
infrastructure** (Vercel + Supabase + Discord). There is no hosted bot
process for slash commands at all.

## Architecture

```
Discord slash command ──HTTP POST──▶ Vercel: /api/discord/interactions
                                        │  (Ed25519 signature verified)
                                        ▼
                              Supabase bot_* RPCs (service_role only)
                                        │
Role changes / linking ────────────────▶ Discord REST API (bot token)

Vercel cron (nightly) ──▶ /api/cron/discord-role-sync ──▶ reconcile all roles

Optional: bot/ companion worker (gateway) ──▶ chat XP, live feed, stats,
          join-time role sync — the only parts that need a persistent process
```

| Piece | Where it runs | Cost |
| --- | --- | --- |
| Slash commands (`/link`, `/rank`, `/daily`, `/pay`, `/sync`, moderation, …) | Vercel serverless (`app/api/discord/interactions`) | free |
| Account linking | Website (Supabase auth + `claim_discord_link` RPC) | free |
| Role sync | On change (server actions) + nightly Vercel cron + `/sync` | free |
| Level/XP storage & rules | Supabase (`discord_levels`, `discord_bot_config`) | free |
| Chat-message XP awarding, level-up announcements, live feed, stat counters | `bot/` companion worker — needs any always-on Node host | free if you have any always-on machine |

**The one honest free-tier limitation:** Discord only delivers *message*
events over a persistent gateway connection, which Vercel/Supabase cannot
hold. Everything else about leveling (storage, config, `/rank`, `/levels`,
role rewards, the admin panel) is serverless; only *awarding XP for chat
messages* needs the companion worker in `bot/`. Run it on any machine that's
usually on (an old laptop/Raspberry Pi works); it's crash-safe — cooldowns
are enforced in Postgres, so restarts can't double-award XP.

## Account linking

Two secure paths, both verifying the user actually controls the Discord
account:

1. **OAuth (primary).** Settings → Connections → *Link with Discord* sends
   the signed-in user through Discord OAuth (Supabase `linkIdentity`). Users
   who already sign in with Discord are linked automatically.
2. **One-time code (fallback).** `/link` in Discord mints an 8-character,
   10-minute, single-use code (stored server-side). The user enters it at
   Settings → Connections while signed in. Nobody can link an account they
   don't control: the code is only ever shown to the Discord user themselves
   (ephemeral reply), and claiming requires an authenticated Hub session.

Both sources resolve through one function (`bot_uid`), and
`profiles.discord_linked` stays in sync via triggers. Unlink from Settings →
Connections (OAuth links require another sign-in method first, so accounts
can't lock themselves out) or `/unlink` for code links.

## Role synchronisation

- The **website is the source of truth**. The map from Hub facts to Discord
  role IDs is edited at **Admin → Discord bot** (stored in
  `discord_bot_config.role_sync`).
- Supported keys: `__linked__`, `__staff__`, `__admin__`, `__moderator__`,
  any badge/achievement slug, `nameplate-<slug>`, `hub-level-<N>`,
  `discord-level-<N>`.
- Sync happens: on admin role change and ban/unban (server actions), when a
  link is claimed, on `/sync`, when a member joins (companion worker), and
  nightly for everyone (Vercel cron `/api/cron/discord-role-sync`).
- Only mapped role IDs are ever added/removed; deleted/renamed Discord roles
  and missing permissions are skipped gracefully and reported in `/sync`;
  banned Hub accounts lose all managed roles.

## Leveling (Arcane replacement)

- XP per counted message is random in a configurable range (default 15–25)
  with a configurable cooldown (default 60 s) — enforced **in Postgres**, so
  it can't be gamed by client/bot restarts. Messages from bots and system
  messages never count; per-channel no-XP lists are supported.
- Level curve is configurable (`quad·n² + linear·n + base`; defaults 5/50/100
  — the familiar MEE6/Arcane curve).
- `/rank` shows level, XP, progress bar and server rank; `/levels` shows the
  top 10. Level-ups can be announced in-channel or in a dedicated channel.
- Linked players optionally trickle a share (default 20 %) of Discord XP into
  their website XP, and get a website notification on Discord level-ups.
  Discord levels can gate Discord roles via `discord-level-<N>` map keys.
- Configure everything at **Admin → Discord bot**.

## Setup (one-time)

1. **Create the Discord application**
   <https://discord.com/developers/applications> → New Application.
   - *General Information*: copy **Application ID** → `DISCORD_CLIENT_ID`,
     **Public Key** → `DISCORD_PUBLIC_KEY`.
   - *Bot*: Reset Token → `DISCORD_BOT_TOKEN`. Enable the **Server Members**
     privileged intent (used by the companion worker; harmless otherwise).
   - *OAuth2 → URL Generator*: scopes `bot` + `applications.commands`;
     permissions: Send Messages, Embed Links, Manage Roles, Moderate Members,
     Ban Members (+ Manage Channels if you use stat counters). Invite the bot
     with the generated URL.
   - Server ID (right-click your server with Developer Mode on) →
     `DISCORD_GUILD_ID`.
2. **Vercel env vars** (Project → Settings → Environment Variables, server
   only): `DISCORD_CLIENT_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`,
   `DISCORD_GUILD_ID`, `CRON_SECRET` (any long random string), and
   `SUPABASE_SECRET_KEY` if not already set. Redeploy.
3. **Register the slash commands** (once, and after any command change):
   `curl -X POST https://<your-domain>/api/discord/register -H "Authorization: Bearer <CRON_SECRET>"`
4. **Point Discord at the endpoint**: Developer Portal → General Information
   → *Interactions Endpoint URL* =
   `https://<your-domain>/api/discord/interactions` → Save (Discord sends a
   test ping; it must succeed).
5. **Supabase**: apply migration `0033_discord_bot_v2.sql` (and enable
   *manual account linking* under Auth → Providers so the OAuth "Link with
   Discord" button works for email accounts).
6. **Admin → Discord bot** on the website: paste your role map, tune
   leveling.
7. *(Optional)* run the companion worker — see `bot/README.md`.

## Failure modes

- **Bot env vars unset** → commands answer with a friendly error; site
  unaffected.
- **Discord API down / rate-limited** → role syncs skip and are corrected by
  the nightly reconcile.
- **Bot's role below a managed role** → that role is skipped and `/sync`
  says so.
- **User not in the server** → sync is a no-op until they join (then the
  companion worker or nightly cron catches them).
