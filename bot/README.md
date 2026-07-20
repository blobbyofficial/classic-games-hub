# classic-games-bot

The Discord bot for **Classic Games Hub** — wired straight into the Hub's
Supabase database. Because players sign in to the Hub with Discord, the bot
already knows who they are (it resolves each Discord user to their Hub profile
via their linked identity).

## Features

- **Economy** — `/balance`, `/daily`, `/pay @user amount` (real Hub credits)
- **Profiles** — `/profile [@user]`, `/leaderboard`
- **Leveling** — chat activity earns XP on the same level as gameplay
  (rate-limited to once/minute; announces level-ups)
- **Moderation** — `/warn`, `/timeout`, `/ban` — each also logged to the Hub's
  shared `audit_logs`
- **Live feed** — new high scores and achievement unlocks posted to a channel
- **Role sync** — `/sync` maps Hub badges, achievements, staff status and your
  equipped nameplate (a color role) to Discord roles
- **Server stats** — optional voice-channel counters for members / online /
  plays today

All Hub access goes through `service_role`-only `bot_*` RPCs (migrations
`0018`/`0019`) — the bot never touches tables directly.

## Prerequisites

1. A **Discord application + bot** — <https://discord.com/developers/applications>
2. The **Supabase secret key** (Dashboard → Settings → API keys → *secret*) —
   never the publishable/anon key
3. An **always-on host** (Railway, Fly.io, a VPS, …)

## Setup

### 1. Create the Discord bot

- New Application → note the **Application ID** (`DISCORD_CLIENT_ID`).
- **Bot** tab → **Reset Token** → copy it (`DISCORD_TOKEN`).
- Under **Privileged Gateway Intents**, enable **Server Members Intent**
  (needed for moderation and role sync). Message Content is *not* required.
- **OAuth2 → URL Generator**: scopes `bot` + `applications.commands`;
  bot permissions: *Send Messages, Embed Links, Moderate Members, Ban Members,
  Manage Roles, Manage Channels* (Manage Channels only if you use stat
  counters). Open the generated URL to invite the bot to your server.
- Copy your server's ID (enable Developer Mode → right-click server → Copy
  Server ID) → `DISCORD_GUILD_ID`.

### 2. Configure environment

```bash
cp .env.example .env
# fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, SUPABASE_SECRET_KEY
```

### 3. Install, register commands, run

```bash
npm install
npm run deploy-commands   # registers the slash commands to your guild (instant)
npm run dev               # local dev (tsx watch)
```

For production:

```bash
npm run build && npm start
```

### 4. Role sync (optional)

Set `ROLE_MAP` to a JSON object mapping a Hub award slug → Discord role id.
Get role ids with Developer Mode (right-click a role → Copy ID). Special keys:

- `__staff__` → role for admins & moderators
- `nameplate-<slug>` → a color role for that equipped nameplate
  (e.g. `nameplate-galaxy`)

```json
{
  "badge-og": "1111111111",
  "leaderboard-top3": "2222222222",
  "badge-admin-friend": "3333333333",
  "__staff__": "4444444444",
  "nameplate-galaxy": "5555555555"
}
```

Only role ids listed in `ROLE_MAP` are ever added or removed. The bot's own
role must be **above** every managed role in the server's role list, or Discord
won't let it assign them.

### 5. Stat counters (optional)

Create voice channels and put their ids in `STATS_MEMBERS_CHANNEL_ID`,
`STATS_ONLINE_CHANNEL_ID`, `STATS_PLAYS_CHANNEL_ID`. The bot renames them every
10 minutes. Set `LIVE_SCORES_CHANNEL_ID` to enable the live feed.

## Deploying

### Railway
1. New Project → Deploy from this repo, set **Root Directory** to `bot`.
2. Add all env vars from `.env.example`.
3. Start command: `npm run build && npm start` (or use the Dockerfile).
4. Run `npm run deploy-commands` once (Railway shell or locally) to register
   commands.

### Fly.io
1. `cd bot && fly launch --no-deploy` (a `Dockerfile` is included).
2. `fly secrets set DISCORD_TOKEN=… DISCORD_CLIENT_ID=… DISCORD_GUILD_ID=… SUPABASE_SECRET_KEY=… SITE_URL=…` (plus optional channel/role vars).
3. `fly deploy`, then run `npm run deploy-commands` once.

The bot is a long-running worker (no inbound HTTP port needed).

## Security

The `SUPABASE_SECRET_KEY` grants `service_role` access — keep it only on the
bot host as a private variable, never in the web repo or client. The bot can
only call the `bot_*` RPCs, which are the sole functions granted to
`service_role`.
