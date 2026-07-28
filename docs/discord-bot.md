# Classic Games Bot

The Discord bot for **Classic Games Hub**. The site and community are the Hub;
the bot is **Classic Games Bot**, and that is what it signs its embeds and
audit-log entries with (`BOT_NAME` in `lib/discord/embeds.ts` — one edit to
change it everywhere).

Renaming it there does **not** rename the Discord application. That name is set
in the Developer Portal → your app → General Information, and the bot's
nickname in the member list can be changed by right-clicking it in your server.

One bot instead of four. It replaces **Appy** (join verification), **Sapphire**
(moderation, announcements, tickets), **Arcane** (levelling and level-reward
roles) and **ServerStats** (live counter channels) — and it runs on the
existing free infrastructure (Vercel + Supabase + Discord).

## Architecture

```
Slash commands, buttons, modals ──HTTP POST──▶ Vercel: /api/discord/interactions
                                                 │  (Ed25519 signature verified)
                                                 ▼
                                       Supabase bot_* RPCs (service_role only)
                                                 │
Role/verify/ticket/mod actions ─────────────────▶ Discord REST API (bot token)

Vercel cron (nightly) ──▶ /api/cron/discord-role-sync ──▶ reconcile all roles
Any scheduler ─────────▶ /api/cron/discord-stats ──────▶ refresh counters

bot/ gateway worker ──▶ chat XP, milestone roles on level-up, join handling,
     automod, live feed, counters — and the bot's Online status
     │
     └──every 60s──▶ bot_heartbeat() ──▶ /status shows the worker as Online
```

| Piece | Where it runs | Cost |
| --- | --- | --- |
| Slash commands, verification button/captcha, ticket panel | Vercel serverless | free |
| Moderation (`/warn` `/timeout` `/kick` `/ban` `/unban` `/purge` `/lock` …) | Vercel serverless | free |
| Announcements (`/announce`) | Vercel serverless | free |
| Account linking | Website (Supabase auth + `claim_discord_link`) | free |
| Role sync + milestone roles | On change, `/sync`, nightly cron, level-up | free |
| Level/XP storage & rules, cases, tickets | Supabase | free |
| Chat XP, automod, join handling, live feed, **Online status** | `bot/` worker — any always-on Node host | free-ish (see `bot/README.md`) |

## What replaced what

### Appy → join verification

- `/setup verification channel:#verify` creates the **Verified** and
  **Unverified** roles (reusing any that already exist), posts the verify panel
  and stores every ID in Supabase.
- Members press one button — or, with `captcha: true`, answer a maths question
  in a modal. The expected answer never leaves the server: the modal carries an
  HMAC of it, keyed with the bot token.
- Optional `min_account_age_hours` blocks throwaway accounts. Verifications are
  recorded in `discord_verifications` and logged to a channel.
- On join, the worker applies the Unverified role (and an optional DM); on
  success the bot swaps it for Verified, posts the welcome message and syncs
  the member's Hub roles.
- Members can also type `/verify`.

### Sapphire → moderation, announcements, tickets

- **Moderation:** `/warn` `/timeout` `/untimeout` `/kick` `/ban` `/unban`
  `/purge` `/slowmode` `/lock` `/unlock` `/warnings`. Every action creates a
  numbered case in `discord_mod_cases`, DMs the member (configurable), posts an
  embed to the mod-log channel and lands in the website's audit trail.
  Permissions are checked twice: `default_member_permissions` *and* in the
  handler.
- **Automod** (opt-in, worker-side): Discord invites, links, mass mentions and
  message floods, with exempt roles/channels and delete-or-timeout actions.
- **Announcements:** `/announce channel:#news message: … title: … ping:@role
  image: …` posts a branded embed (or plain text) with mention-scoping, so a
  ping can never escape the role you chose.
- **Tickets:** a panel button or `/ticket [subject]` opens a private channel
  (`ticket-0001`) visible to the member and the staff role; `/close` or the
  Close button posts a transcript to the log channel and deletes the channel.
  `max_open_per_user` stops ticket spam.

### Arcane → levelling and level rewards

- XP per counted message is random in a configurable range (default 15–25) with
  a configurable cooldown (default 60 s) — enforced **in Postgres**, so it
  can't be gamed by restarts. Bots, system messages and no-XP channels never
  count.
- Level curve is configurable (`quad·n² + linear·n + base`; defaults 5/50/100 —
  the familiar MEE6/Arcane curve).
- **Milestone roles:** `/setup levels` creates a role per milestone level
  (defaults **1, 5, 10, 20, 30, 40, 50, 75, 100** — editable) and stores the
  IDs. Reaching a milestone grants the role immediately; `remove_previous`
  switches between stacking roles and keeping only the highest. The nightly
  role sync repairs anything missed while the worker was down.
- **Members check their level with `/level`** (progress bar, rank, current and
  next milestone role), `/rewards` lists the whole ladder, `/levels` is the
  leaderboard and `/rank` stays as the terse card.
- Linked players optionally trickle a share (default 20 %) of Discord XP into
  their website XP and get a website notification on level-ups.

### ServerStats → live counter channels

- `/setup stats` creates voice channels under a **📊 Hub stats** category:
  online players on the website, registered players, plays today (and
  optionally the Discord member count). Nobody can join them — the name *is*
  the display.
- "Online" comes from the website: profiles seen in the last 5 minutes
  (`bot_stats_extended`).
- Refreshed every 10 minutes by the worker, and on demand from
  `/setup refresh-stats` or the admin dashboard. Discord rate-limits channel
  renames to ~2 per 10 minutes per channel, so that's the practical ceiling.
- Serverless fallback: `GET /api/cron/discord-stats` with
  `Authorization: Bearer $CRON_SECRET`. Vercel Hobby crons only run daily, so
  for a 10-minute cadence use Supabase `pg_cron` + `pg_net`, cron-job.org, or
  just run the worker.

## Is there any way for the bot to always be online?

Yes — run the gateway worker. Discord's green dot means "this application holds
a gateway (WebSocket) connection", nothing else. An HTTP-interactions bot has
none, so it shows grey no matter how well it works, and Vercel/Supabase
functions are request-scoped and cannot hold that connection open.

`bot/` does hold it: it logs in with an explicit presence (`online` + activity
text), re-asserts it every 10 minutes (Discord drops presence on some
reconnects), auto-reconnects, exits non-zero on an invalidated session so the
host restarts it, and serves `/health` so free hosts keep it alive.
`bot/fly.toml` (always-on) and `bot/render.yaml` (free tier + keep-alive
pinger) are both included — see `bot/README.md`.

## Account linking

Two secure paths, both verifying the user actually controls the Discord
account:

1. **OAuth (primary).** Settings → Connections → *Link with Discord* sends the
   signed-in user through Discord OAuth (Supabase `linkIdentity`). Users who
   already sign in with Discord are linked automatically.
2. **One-time code (fallback).** `/link` mints an 8-character, 10-minute,
   single-use code, shown only to that Discord user (ephemeral). Claiming it
   requires an authenticated Hub session.

Both sources resolve through one function (`bot_uid`), and
`profiles.discord_linked` stays in sync via triggers. Unlink from Settings →
Connections, or `/unlink` for code links.

## Role synchronisation

- The **website is the source of truth**. The map from Hub facts to Discord
  role IDs is edited at **Admin → Discord bot**
  (`discord_bot_config.role_sync`).
- Supported keys: `__linked__`, `__staff__`, `__admin__`, `__moderator__`, any
  badge/achievement slug, `nameplate-<slug>`, `hub-level-<N>`,
  `discord-level-<N>` — plus the milestone level roles, which the bot manages
  itself.
- Sync happens: on admin role change and ban/unban, when a link is claimed, on
  `/sync`, on verification, on level-up, when a member joins, and nightly for
  everyone.
- Only mapped role IDs are ever added or removed; missing permissions are
  reported rather than silently swallowed; banned Hub accounts lose every
  managed role.

## Linking your own roles and channels

Every role/channel ID field in **Admin → Discord bot** means *use this one*.

- **ID set, and it exists** → the bot adopts it and brings it in line with your
  settings: a milestone role is renamed to the name template and recoloured, a
  counter channel is renamed to show the number. Nothing new is created.
- **ID set, but no longer in the server** → reported as *not found* and **left
  alone**. It is never silently replaced with a fresh default-named one; a
  surprise duplicate you then have to hunt down is worse than a clear warning.
  Clear the field if you want a new one created.
- **ID empty** → the bot looks for a role whose name already matches, and only
  creates one if there isn't a match.

The "📊 Hub stats" category is created only when a counter channel actually
needs creating, so linking your own channels no longer leaves an empty category
behind.

## Running the bot from the dashboard

**Admin → Discord bot** is not just a settings form. Every command that does
something to the server can be run from there, through the *same functions* the
slash commands call (`lib/discord/ops.ts`) — so a case opened on the website is
numbered, DM'd and mod-logged identically to one opened in Discord. There is no
second implementation to drift.

- **Announce** — `/announce`, with the same role-scoped pings.
- **Moderation** — warn, timeout, remove timeout, kick, ban, unban. Recorded
  against the staff member's *linked* Discord account; an unlinked admin is
  refused, because an unattributable case is worse than none.
- **Channel tools** — purge, slowmode, lock, unlock.
- **Push settings to Discord** — re-applies a section (or all of them) to the
  server: creates missing roles, re-posts panels, renames counters.

Saving a section now **also pushes it**. It used to write to Postgres and stop,
so the dashboard and the server disagreed until someone ran the matching
`/setup`. The push is best-effort by design — the settings are saved either
way, so a Discord outage costs you a retry of the push, never your edit.

Pushing is idempotent: existing roles and channels with the expected names are
reused rather than duplicated, so it is safe to press repeatedly.

## Environment variables

On **Vercel** (the website — all server-only, none reach the browser):

| Variable | Where it comes from | Without it |
| --- | --- | --- |
| `DISCORD_CLIENT_ID` | Developer Portal → General Information → Application ID | Commands can't be registered |
| `DISCORD_PUBLIC_KEY` | Developer Portal → General Information → Public Key | **Discord refuses to save the interactions endpoint URL** — the endpoint correctly rejects the unsigned test ping with a 401 |
| `DISCORD_BOT_TOKEN` | Developer Portal → Bot → Token | Commands can't be registered; no REST calls |
| `DISCORD_GUILD_ID` | Right-click your server → Copy Server ID (needs Developer Mode) | Commands register globally instead, taking up to an hour to appear |
| `CRON_SECRET` | Any long random string you choose | The cron routes and `/api/discord/register` reject every call |

Admin → Discord bot shows which of these are present on the current
deployment, so a missing one is visible before you press anything.

On the **worker** (`bot/`, if you deploy it): `DISCORD_TOKEN` (or
`DISCORD_BOT_TOKEN` — both are accepted, since the website uses the second
name), `DISCORD_GUILD_ID`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. The secret
key is service-role and belongs only here.

Changing a variable on Vercel does **not** affect the running deployment —
redeploy afterwards, or the old build keeps its old (empty) values.

## Setup (one-time)

1. **Create the Discord application**
   <https://discord.com/developers/applications> → New Application.
   - *General Information*: **Application ID** → `DISCORD_CLIENT_ID`,
     **Public Key** → `DISCORD_PUBLIC_KEY`.
   - *Bot*: Reset Token → `DISCORD_BOT_TOKEN`. Enable the **Server Members**
     privileged intent (and **Message Content** only if you want automod's
     invite/link rules).
   - *OAuth2 → URL Generator*: scopes `bot` + `applications.commands`;
     permissions: Manage Roles, Manage Channels, Kick Members, Ban Members,
     Moderate Members, Manage Messages, Send Messages, Embed Links, Read
     Message History. Invite the bot with the generated URL.
   - Drag the bot's role **above** every role it manages (Server Settings →
     Roles) — Discord refuses to touch roles above its own.
2. **Vercel env vars** (server only): `DISCORD_CLIENT_ID`,
   `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`,
   `CRON_SECRET`, `SUPABASE_SECRET_KEY`. Redeploy.
3. **Supabase**: apply migrations `0033_discord_bot_v2.sql` and
   `0041_discord_bot_v3.sql` (and enable *manual account linking* under
   Auth → Providers).
4. **Register the slash commands** (once, and after any command change):
   `curl -X POST https://<your-domain>/api/discord/register -H "Authorization: Bearer <CRON_SECRET>"`
5. **Point Discord at the endpoint**: Developer Portal → General Information →
   *Interactions Endpoint URL* =
   `https://<your-domain>/api/discord/interactions`.
6. **Run `/setup status` in Discord**, then work through what it lists:
   ```
   /setup levels
   /setup verification channel:#verify welcome_channel:#welcome log_channel:#logs
   /setup tickets channel:#support category:Tickets staff_role:@Staff log_channel:#ticket-logs
   /setup stats
   /setup modlog channel:#mod-log
   ```
   Verification has one manual step Discord can't automate: deny **View
   Channel** for @everyone (or the Unverified role) on the channels newcomers
   shouldn't see, and allow it for Verified.
7. **Run the worker** (`bot/`) so chat XP, automod and the Online status work —
   see `bot/README.md`.
8. Fine-tune wording, limits and automod at **Admin → Discord bot**.

## Health & the status page

The public `/status` page has a **Discord bot** panel driven by the worker's
heartbeat. On connect, and every 60 seconds after, the worker calls
`bot_heartbeat()`, which stamps `last_seen` into `discord_bot_config`.
`platform_status()` treats a heartbeat older than **3 minutes** as offline, so
two beats can be lost to a network blip without the panel flipping.

The heartbeat requires the worker to be running — it is not sent by the
serverless endpoint. If you don't deploy `bot/`, `/status` will correctly
report the worker as Offline while slash commands carry on working.

For a liveness check that doesn't touch the database, the worker also serves
`GET /health` on `$PORT` with the gateway status, ping and uptime.

## Failure modes

- **Bot env vars unset** → commands answer with a friendly error; the site is
  unaffected.
- **Worker down** → slash commands, verification, tickets and moderation all
  keep working; chat XP, automod, the live feed and the Online dot pause, and
  `/status` shows the worker Offline within 3 minutes. The nightly reconcile
  repairs milestone roles afterwards.
- **Discord API down / rate-limited** → role syncs skip and are corrected by
  the nightly reconcile; counter renames are skipped until the next tick.
- **Bot's role below a managed role** → that role is skipped, and `/sync` and
  `/setup` say so explicitly. Note this affects *assigning* an existing role,
  never *creating* one: a newly created role always starts at the bottom of the
  list, so hierarchy cannot be the reason a `/setup` creation failed.
- **`/setup` reports failures** → the summary now quotes Discord's own error
  and what to change. `Missing Permissions (50013)` means the bot's own role
  lacks Manage Roles/Channels; `Missing Access (50001)` means the app was
  invited with `applications.commands` but not the `bot` scope, so its commands
  appear while it isn't really a member; `Maximum number of guild roles` means
  the server is at Discord's 250-role cap.
- **User not in the server** → sync is a no-op until they join.
