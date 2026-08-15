# Classic Games Bot

The Discord bot for **Classic Games Hub**. The site and community are the Hub;
the bot is **Classic Games Bot**, and that is what it signs its embeds and
audit-log entries with (`BOT_NAME` in `lib/discord/embeds.ts` - one edit to
change it everywhere).

Renaming it there does **not** rename the Discord application. That name is set
in the Developer Portal → your app → General Information, and the bot's
nickname in the member list can be changed by right-clicking it in your server.

One bot instead of four. It replaces **Appy** (join verification), **Sapphire**
(moderation, announcements, tickets), **Arcane** (levelling and level-reward
roles) and **ServerStats** (live counter channels) - and it runs on the
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
     automod, live feed, counters, server logs - and the bot's Online status
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
| Chat XP, automod, join handling, live feed, **server logs**, **Online status** | `bot/` worker - any always-on Node host | free-ish (see `bot/README.md`) |

## What replaced what

### Appy → join verification

- `/setup verification channel:#verify` creates the **Verified** and
  **Unverified** roles (reusing any that already exist), posts the verify panel
  and stores every ID in Supabase.
- Members press one button - or, with `captcha: true`, answer a maths question
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

### Sapphire → server logs

The half of Sapphire that took longest to replace, because it is the half that
needs a gateway connection: none of these events are ever sent to an HTTP
interactions endpoint, which only hears about things aimed at the bot.

`/setup logging channel:#server-log` switches it on. What gets written:

| Category | Events |
| --- | --- |
| **Messages** | deleted, edited (before/after), bulk-purged |
| **Members** | joined, left, kicked, nickname changed, roles added/removed |
| **Moderation** | timed out, timeout lifted, banned, unbanned |
| **Server** | channels created/renamed/moved/deleted, permission overwrites changed, threads, roles created/recoloured/re-permissioned/deleted, emoji, stickers, invites, webhooks, server settings |
| **Voice** | joined, left, moved between channels |

Three things it does that a plain event dump doesn't:

- **It names who did it.** Gateway events carry no actor, so each one is
  matched against Discord's own audit log - live via
  `GuildAuditLogEntryCreate`, falling back to `fetchAuditLogs`. This needs
  **View Audit Log**; without it every entry still appears but says "Unknown
  actor", and the bot says so once at startup rather than leaving you to
  notice.
- **It diffs down to the property.** A role change reads
  `Colour #5865f2 → #ff0000`, and a permission change lists the permissions
  that moved rather than two bitfields. A channel update names the overwrite
  that changed and for whom.
- **It doesn't drown you.** Five categories, each routable to its own channel
  (everything falls back to one catch-all), every one of the 27 events
  individually switchable, and ignore lists for channels, roles and users.
  Entries are batched ten to a message on a 1.5-second tick, so a raid or a
  100-message purge costs a handful of API calls instead of hundreds.

Two limits worth knowing before you go looking for something that isn't there:

- **Deleted and edited message text is only available for messages the worker
  had cached** - which means messages sent since it last started. Older ones
  log as "not cached". Discord does not send the old message with the event;
  no bot can show you one it never saw.
- **Message content needs the Message Content intent.** Without it the delete
  log records that a message went, not what it said. `include_content` turns
  quoting off deliberately if you'd rather it didn't.

Everything is configured at **Admin → Discord bot → Server**, and the worker
picks changes up within a minute without a restart. A channel *deletion* is
logged even when that channel is on the ignore list - hiding that is the one
thing an ignore list should never do.

### Arcane → levelling and level rewards

- XP per counted message is random in a configurable range (default 15–25) with
  a configurable cooldown (default 60 s) - enforced **in Postgres**, so it
  can't be gamed by restarts. Bots, system messages and no-XP channels never
  count.
- Level curve is configurable (`quad·n² + linear·n + base`; defaults 5/50/100 -
  the familiar MEE6/Arcane curve).
- **Milestone roles:** `/setup levels` creates a role per milestone level
  (defaults **1, 5, 10, 20, 30, 40, 50, 75, 100** - editable) and stores the
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
  optionally the Discord member count). Nobody can join them - the name *is*
  the display.
- "Online" comes from the website: profiles seen in the last 5 minutes
  (`bot_stats_extended`).
- Refreshed every 10 minutes by the worker, and on demand from
  `/setup refresh-stats` or the admin dashboard. Discord rate-limits channel
  renames to ~2 per 10 minutes per channel, so that's the practical ceiling.
- Serverless fallback: `GET /api/cron/discord-stats` with
  `Authorization: Bearer $CRON_SECRET`. Vercel Hobby crons only run daily and
  this route is not in `vercel.json` at all, so for a 10-minute cadence use
  Supabase `pg_cron` + `pg_net`, cron-job.org, or just run the worker. All five
  scheduled jobs and where each one runs are in `docs/cron-jobs.md`.

## Is there any way for the bot to always be online?

Yes - run the gateway worker. Discord's green dot means "this application holds
a gateway (WebSocket) connection", nothing else. An HTTP-interactions bot has
none, so it shows grey no matter how well it works, and Vercel/Supabase
functions are request-scoped and cannot hold that connection open.

`bot/` does hold it: it logs in with an explicit presence (`online` + activity
text), re-asserts it every 10 minutes (Discord drops presence on some
reconnects), auto-reconnects, exits non-zero on an invalidated session so the
host restarts it, and serves `/health` so free hosts keep it alive.
`bot/fly.toml` (always-on) and `bot/render.yaml` (free tier + keep-alive
pinger) are both included - see `bot/README.md`.

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
  `discord-level-<N>` - plus the milestone level roles, which the bot manages
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
slash commands call (`lib/discord/ops.ts`) - so a case opened on the website is
numbered, DM'd and mod-logged identically to one opened in Discord. There is no
second implementation to drift.

- **Announce** - `/announce`, with the same role-scoped pings.
- **Moderation** - warn, timeout, remove timeout, kick, ban, unban. Recorded
  against the staff member's *linked* Discord account; an unlinked admin is
  refused, because an unattributable case is worse than none.
- **Channel tools** - purge, slowmode, lock, unlock.
- **Push settings to Discord** - re-applies a section (or all of them) to the
  server: creates missing roles, re-posts panels, renames counters.

Saving a section now **also pushes it**. It used to write to Postgres and stop,
so the dashboard and the server disagreed until someone ran the matching
`/setup`. The push is best-effort by design - the settings are saved either
way, so a Discord outage costs you a retry of the push, never your edit.

Pushing is idempotent: existing roles and channels with the expected names are
reused rather than duplicated, so it is safe to press repeatedly.

## Environment variables

On **Vercel** (the website - all server-only, none reach the browser):

| Variable | Where it comes from | Without it |
| --- | --- | --- |
| `DISCORD_CLIENT_ID` | Developer Portal → General Information → Application ID | Commands can't be registered |
| `DISCORD_PUBLIC_KEY` | Developer Portal → General Information → Public Key | **Discord refuses to save the interactions endpoint URL** - the endpoint correctly rejects the unsigned test ping with a 401 |
| `DISCORD_BOT_TOKEN` | Developer Portal → Bot → Token | Commands can't be registered; no REST calls |
| `DISCORD_GUILD_ID` | Right-click your server → Copy Server ID (needs Developer Mode) | Commands register globally instead, taking up to an hour to appear |
| `CRON_SECRET` | Any long random string you choose | The cron routes and `/api/discord/register` reject every call |

Admin → Discord bot shows which of these are present on the current
deployment, so a missing one is visible before you press anything.

On the **worker** (`bot/`, if you deploy it): `DISCORD_TOKEN` (or
`DISCORD_BOT_TOKEN` - both are accepted, since the website uses the second
name), `DISCORD_GUILD_ID`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. The secret
key is service-role and belongs only here.

Changing a variable on Vercel does **not** affect the running deployment -
redeploy afterwards, or the old build keeps its old (empty) values.

That sentence did real damage between 3 and 13 August 2026, when `vercel.json`
was making Vercel refuse every deployment (`docs/cron-jobs.md`). Any variable
set in that window was accepted by the dashboard and never reached a running
build, because the redeploy it needed could not happen. **If the bot was
configured while deployments were broken, set the variables again - or just
redeploy - and check Admin → Discord bot before assuming a credential is
wrong.**

## Where this deployment actually stands

Verified against the live database on 14 August 2026. Recorded so the next
session picks up from here instead of re-diagnosing it.

**Nothing is broken. Nothing has ever been configured.**

- `bot_all_config()` returns `{}` - not a partial setup, an empty one. No
  channels, roles, panels or publishing targets have ever been saved.
- `worker_last_seen` is `null` - the gateway worker in `bot/` has never checked
  in, not once.
- Both packages typecheck and the site builds. There is no code fault to find.
- Slash commands were registered from Admin → Discord bot at least once. Whether
  that call succeeded is **unconfirmed** - if it did, `DISCORD_BOT_TOKEN` and
  `DISCORD_CLIENT_ID` are present on the deployment, which is most of step 2.

### Pick up here

Work down this list. Steps 1-3 are the ones that decide whether the rest is
five minutes or an afternoon.

1. **Check what is already set.** Admin → Discord bot lists every required
   variable as present/absent (booleans - it never renders a secret). That page
   answers steps 2 and 4 without touching the Vercel dashboard.
2. **Redeploy before assuming a credential is wrong.** Anything set between
   3 and 13 August never reached a running build, because no deployment could be
   created at all (`docs/cron-jobs.md`). A variable that looks broken may simply
   never have loaded.
3. **Interactions Endpoint URL** in the Developer Portal →
   `https://<domain>/api/discord/interactions`. Discord refuses to save it
   without `DISCORD_PUBLIC_KEY`, and the endpoint is *correct* to reject the
   unsigned test ping with a 401 - a rejection here means the key is missing,
   not that the endpoint is broken.
4. **The bot's own role must sit above every role it manages**, or role sync
   fails silently on exactly the roles it was installed to manage.
5. **`/setup status` in Discord**, then work through what it lists. This is what
   fills `bot_all_config()`, and until it is run the config stays `{}` and every
   feature that reads it no-ops.
6. **The worker** (`bot/`) for the green dot, chat XP, automod, the live feed,
   counter channels, the server logs and the `/status` heartbeat. `Dockerfile`, `fly.toml` and
   `render.yaml` are already in the repo, so this is a deploy, not a build. It
   needs `DISCORD_TOKEN`, `DISCORD_GUILD_ID`, `SUPABASE_URL` and
   `SUPABASE_SECRET_KEY` - the last is service-role and belongs **only** here.
7. **Publishing channels.** `update_channel_id` and `announce_channel_id` are
   both unset, so the daily `discord-publish` cron currently no-ops rather than
   posting. Setting a channel makes the next run mirror the entire backlog of
   releases at once, oldest first - expect one burst, then steady state.
8. **The external cron jobs last**, not first. Role sync and counter channels
   have nothing to sync or rename until steps 5 and 6 are done, so wiring them
   earlier buys nothing. See `docs/cron-jobs.md`.

## Setup (one-time)

1. **Create the Discord application**
   <https://discord.com/developers/applications> → New Application.
   - *General Information*: **Application ID** → `DISCORD_CLIENT_ID`,
     **Public Key** → `DISCORD_PUBLIC_KEY`.
   - *Bot*: Reset Token → `DISCORD_BOT_TOKEN`. Enable the **Server Members**
     privileged intent, and **Message Content** if you want automod's
     invite/link rules or the server log to quote what a deleted message said.
   - *OAuth2 → URL Generator*: scopes `bot` + `applications.commands`;
     permissions: Manage Roles, Manage Channels, Kick Members, Ban Members,
     Moderate Members, Manage Messages, Send Messages, Embed Links, Read
     Message History, **View Audit Log** (that last one is what lets the server
     log name who did each thing). Invite the bot with the generated URL.
   - Drag the bot's role **above** every role it manages (Server Settings →
     Roles) - Discord refuses to touch roles above its own.
2. **Vercel env vars** (server only): `DISCORD_CLIENT_ID`,
   `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`,
   `CRON_SECRET`, `SUPABASE_SECRET_KEY`. Redeploy.
3. **Supabase**: apply every migration in `database/migrations/` in order, not
   just the ones named after the bot - `0063` and `0068` add publishing, `0072`
   adds the server logs, and
   `status_meta.schema` on `/status` is what tells you the database and the
   build agree. Enable *manual account linking* under Auth → Providers.
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
   /setup logging channel:#server-log messages_channel:#message-log
   ```
   Verification has one manual step Discord can't automate: deny **View
   Channel** for @everyone (or the Unverified role) on the channels newcomers
   shouldn't see, and allow it for Verified.
7. **Run the worker** (`bot/`) so chat XP, automod, the server logs and the
   Online status work - see `bot/README.md`. `/setup logging` will tell you
   whether it is running when you run it.
8. Fine-tune wording, limits and automod at **Admin → Discord bot**.

## Health & the status page

The public `/status` page has a **Discord bot** panel driven by the worker's
heartbeat. On connect, and every 60 seconds after, the worker calls
`bot_heartbeat()`, which stamps `last_seen` into `discord_bot_config`.
`platform_status()` treats a heartbeat older than **3 minutes** as offline, so
two beats can be lost to a network blip without the panel flipping.

The heartbeat requires the worker to be running - it is not sent by the
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
- **The log channel is empty** → three causes, in the order they're likely.
  The worker isn't running (nothing else can see these events); logging is off
  or has no channel set (`/setup status` says which); or every event in that
  category is switched off. `/setup logging` reports the first of those when
  you run it.
- **Log entries say "Unknown actor"** → the bot lacks **View Audit Log**. The
  events themselves are unaffected, and the worker warns about it once at
  startup.
- **Deleted messages log without their text** → either the message predates
  the worker's current run (it was never cached, and Discord doesn't send the
  old content), the **Message Content** intent is off, or `include_content`
  has been turned off deliberately.

## Monthly booster drops

One exclusive cosmetic per calendar month, granted to everyone boosting the
server that month (migration `0051`). Configured ahead of time in
`booster_drops` - one row per month, keyed to the first of the month. A month
with no row simply grants nothing, so the job is safe to leave running forever
without anyone topping the table up.

`/api/cron/booster-drops` calls `grant_booster_drops()` with the service key.
It is scheduled **daily** in `vercel.json`, at 06:00 UTC. That slot is an hour
after the one role sync used to hold, because role sync is what refreshes
`profiles.booster_since` from Discord and running the grant first would hand
out drops based on a stale boost list. Role sync now runs from an external
scheduler (`docs/cron-jobs.md`), so while that scheduler is down `booster_since`
goes stale and a new booster waits a run for their drop - the grant is
idempotent and daily, so nothing is lost.

Daily rather than monthly is deliberate: a once-a-month job has exactly one
chance to fire, and a failure costs a whole month of boosters their drop. The
grant is idempotent (`on conflict do nothing`, and the notification only goes
to users who were actually granted something), so the repeats cost nothing and
a run that grants zero items is the normal case.

Because the grant runs daily against whoever is boosting at the time, boosting
at any point during the month earns that month's drop.

**Adding next month's drop:** insert the cosmetic into `shop_items` with
`available = false` (so it can never be bought), add a `booster_drops` row for
the first of that month, and - importantly - add a renderer for it, or the
reward will be granted but draw nothing. Decorations live in
`components/profile/avatar-decoration.tsx`, nameplates in
`components/profile/nameplate.tsx`, effects in
`components/profile/profile-effects.tsx`.

## One-click setup

Admin → Discord bot → Sync → **Run full setup** does everything a fresh server
needs, in dependency order:

1. Register the slash commands (first, because every other feature is reached
   through them, and they do not appear in Discord until registered)
2. Create the verification roles
3. Create the level-milestone roles
4. Create the live counter channels
5. Create the verification channel, then post the verification panel
6. Create the ticket staff role, category and support channel, then post the
   ticket panel

It reports on each step separately rather than returning one success or
failure. Discord setup fails in partial, unrelated ways - the bot can often
create roles but not post in a channel it cannot see - so aborting at the first
error would hide the steps that would have worked, and "setup failed" would
send an admin looking in the wrong place. Each row shows what Discord itself
said.

Every step is idempotent: existing roles and channels with the expected names
are reused, and panels are edited in place rather than re-posted. That makes
the button safe to press repeatedly, and it doubles as a "fix whatever is
missing" control after granting the bot a permission it was lacking.

### What it creates, and what it will not duplicate

| Name | What it is | Configured as |
| --- | --- | --- |
| `✅-verify` | Text channel holding the verification panel | `verification.panel_channel_id` |
| `🎫-support` | Text channel holding the ticket panel | `tickets.panel_channel_id` |
| `🎫 Tickets` | Category new tickets open under | `tickets.category_id` |
| `Staff` | Role that can see every ticket | `tickets.staff_role_id` |

Resolution order is the same for all four, and for the verification and
milestone roles: **a configured id wins**, then **a matching name**, then - only
if neither exists - it is created. So a server that already runs a `#verify` or
a `Staff` role keeps using it instead of gaining a near-identical empty one
beside it, and renaming one afterwards is safe because the id is what gets
stored.

A configured id pointing at something since deleted is reported as **missing**
rather than replaced. An id in the dashboard is an instruction to use *that*
role or channel; handing back a fresh default-named duplicate would leave the
admin to notice and clean it up.

Both panel channels are readable by everyone and writable by nobody - a panel is
one button, and letting members chat there buries the thing they came to press.
The verify channel allows View Channel explicitly rather than inheriting it,
because the gate works by denying `@everyone` elsewhere, and a gate members
cannot see is just a locked server. The ticket category denies `@everyone` so a
new ticket is never briefly visible server-wide before its own overwrites land;
the support channel deliberately sits outside that category, being the one
public part of the system.

A panel step only reports as **skipped** now if the step before it could not
create or find a channel at all - normally a missing **Manage Channels**.

Each panel is posted into the channel the step before it *just resolved*, not
into a re-read of the config. The id is written back either way, but making the
post depend on that write having landed turns one failed round trip into a panel
that silently never appears. The report names the channel it went to, so
"posted" can be checked rather than taken on trust.

`DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` are checked up front, so a missing
credential produces one clear message instead of six copies of "could not reach
Discord".

### Starting again

Sync → **Reset all settings** clears every section back to its defaults
(`admin_reset_bot_config`, migrations `0061` + `0062`). It deletes the
`discord_bot_config` rows rather than writing defaults into them:
`bot_get_config` returns null for an absent key and every caller merges over its
own defaults, so no row *is* the default, and writing them out would put the
defaults in a second place and let the two drift.

The delete is qualified by the same key allowlist `bot_patch_config` and
`admin_set_bot_config` enforce, and it has to be. **An unqualified `DELETE` or
`UPDATE` cannot run through the dashboard at all**: PostgREST connects as
`authenticator`, which carries
`session_preload_libraries = supautils, safeupdate`, and `safeupdate` rejects
either without a `WHERE` - inside a `SECURITY DEFINER` function too, since that
changes the privileges but not the session. Worth knowing before writing the
next one, because a migration applies as `postgres`, which has no such preload:
the DDL succeeds and the failure only appears the first time a user calls it.

The point of it is the ids, not the toggles. A dashboard pointed at one server
accumulates role, channel, category and panel-message ids, and those are the
part you cannot fix by editing one field - a stale id is worse than an empty
one, because setup reads it as "use that exact channel" and reports it missing
rather than creating a replacement. Reach for this when moving the bot to a
different server, or when a half-finished setup left ids pointing at channels
that have since been deleted; then press **Run full setup** to rebuild.

Nothing is deleted inside Discord. Roles and channels the bot created stay, and
so does any panel it posted - but the link to that panel is cleared, so the next
setup posts a fresh one instead of editing the old one. Delete the old panel by
hand if you do not want two. The reset is audit-logged as `bot_config_reset`,
because it throws away ids that cannot be recovered from the dashboard.

## Monthly gift token

Boosters also receive one gift token per calendar month (`0055`), spendable on
any available cosmetic to give a friend a **30-day** copy for free. It is
granted by the same `/api/cron/booster-drops` run as the monthly drop, because
both key off the `profiles.booster_since` that the role sync refreshes an hour
earlier, and both are idempotent.

Tokens do not stack: the primary key is `(user_id, month)`, so a month yields
exactly one whether the job runs once or thirty times.

Spending goes through `gift_with_token()`, which claims the token with an
`update ... where used_at is null` - the update matching zero rows *is* the
"already spent" check, so two concurrent requests cannot both win. The
temporary grant uses `inventory_items.expires_at`, the same column boosts use,
so every existing ownership check already handles it correctly.

## Early access

A game with `games.early_access_until` set in the future is playable only by
boosters and staff until that moment, then opens to everyone (`0056`). Set it
from Admin → Games with the lock dropdown: 3 days, 1 week, 2 weeks, or "open to
everyone" to end it early.

Days rather than a date picker, because "out early for a week" is how the
decision is actually made, and it removes any chance of typing a date in the
past and silently shipping a game that is already open.

**The gate is a trigger on `play_sessions`, not a check inside
`submit_score()`.** That function is a hundred lines and has already been
re-declared across five migrations; adding a sixth copy to insert one `if`
would be another chance for the rest of the body to drift from what is live. A
trigger states the rule once and keeps holding however `submit_score` is
rewritten later. `play_sessions` is the right hook because `submit_score`
inserts it before touching the leaderboard, so raising there aborts the whole
transaction and no score, XP or credits land either.

Note this gates **earning**, not the page. A determined non-booster could still
load the engine in their browser; what they cannot do is record a score. That
is the honest boundary - the UI hides the player, and the database refuses the
result.

The game stays listed for everyone throughout, shown with a lock badge and a
countdown to the open date. A perk nobody can see is a perk nobody wants, and
half the point of early access is that other people know it is happening.

## Publishing: the update log and announcements in Discord

The website's update log (`/updates`) and its announcements are mirrored into
two Discord channels, configured under **Admin → Discord bot → Sync →
Publishing** or provisioned by **Run full setup**.

It is a **mirror**, not a series of posts. Every mirrored thing records the
message that holds it and a fingerprint of what was in it
(`public.discord_posts`, migration `0068`), which is what makes the difference:

| On the website | In Discord |
| --- | --- |
| A release is added to `lib/update-log.ts` and deployed | A new message, at the bottom of the update-log channel |
| A release's notes are edited | That release's message is edited in place |
| An announcement is published | A new message, and a role ping if one is set |
| An announcement is edited | That announcement's message is edited |
| An announcement is unpublished or deleted | Its message is deleted |
| Nothing changed | **No Discord calls at all** - the fingerprints match |

Releases are posted oldest first, so the channel reads in the order things
happened. Discord orders by post time and nothing can reorder it afterwards, so
this is the one part a later sync cannot repair.

### One direction, on purpose

Discord never writes back. The update log is a file in the repository and
announcements are rows an admin publishes, so the website owns both and Discord
is a view of them - the same rule role sync follows. Reading messages back out
of Discord and turning them into announcements would give one fact two owners,
and the first time they disagreed there would be no answer to which was right.

### When it runs

- **On publish.** Publishing, editing or deleting an announcement syncs
  immediately, *after* the response - so a Discord outage can never turn a
  successful publish into an error the admin retries, sending a second
  notification to every player.
- **On save or push.** Saving the Publishing section applies it, and
  **Push everything** includes it.
- **Every 15 minutes.** `/api/cron/discord-publish` re-checks both. This is not
  how the mirror stays timely - it is how it recovers: a deploy adds releases
  with nobody pressing anything, an outage drops a post, and someone eventually
  deletes a message by hand. A run with nothing to do costs two database reads.

A message deleted by hand answers `404` to the edit that follows; the record is
forgotten and the message re-posted, rather than the sync failing forever
against an id that will never exist again.

### Limits

- Only the newest `announce_limit` announcements (25 by default) are kept in
  step. Older ones are left where they are rather than deleted - an
  announcement scrolling out of the window is not the same as one being
  withdrawn, and deleting on that basis would quietly clear the channel.
- A release embed lists **item titles**, not their full text: a release with
  five groups runs past what Discord will render, and a truncated changelog is
  worse than a summarised one with a link to the page.
- Both channels are created readable by everyone and writable by nobody. A
  conversation running through a changelog makes it unreadable as one.
