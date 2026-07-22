# classic-games-bot (companion worker)

> **Most of the bot doesn't live here any more.** All slash commands
> (`/link`, `/rank`, `/daily`, `/pay`, moderation, …) are served **serverlessly
> by the website** via Discord HTTP interactions —
> `app/api/discord/interactions` on Vercel — which runs entirely on the free
> tier with no hosted process. See `docs/discord-bot.md` in the repo root for
> the full architecture and setup.

This directory contains the **optional companion gateway worker**. It covers
the only things a webhook can never do, because they require a persistent
connection to Discord's gateway:

- **Chat XP / leveling** — watching messages and awarding Discord XP
  (config lives in Supabase; edit it at *Admin → Discord bot* on the website)
- **Level-up announcements** in the server
- **Live feed** — new high scores & achievements posted to a channel
- **Server stat counters** — voice channels renamed with live member/plays counts
- **Join-time role sync** — linked members get their roles the moment they join

Everything else works without this worker. If you can't run it 24/7, the
platform (and every slash command) still functions — you just don't get the
five features above; role sync still happens nightly and via `/sync`.

## Why isn't this serverless too?

Discord only delivers *message* events over a persistent gateway (WebSocket)
connection. Vercel and Supabase functions are request-scoped and cannot hold
one open. There is no free always-on host we can bundle here honestly — so the
worker is designed to run anywhere Node 20+ runs (an old PC or a Raspberry Pi
at home is genuinely fine) and to be **safe to stop and restart at any time**:
XP cooldowns are enforced in Postgres, not in process memory, so an unstable
host can never double-award XP.

## Setup

```bash
cp .env.example .env   # fill in DISCORD_TOKEN, DISCORD_GUILD_ID, SUPABASE_SECRET_KEY
npm install
npm run dev            # local dev (tsx watch)
# production:
npm run build && npm start
```

Privileged intents (Developer Portal → Bot): enable **Server Members**
(join-time role sync). The **Message Content** intent is *not* needed — XP
only uses message metadata, never the text itself.

A `Dockerfile` is included if you prefer a container.

## Security

`SUPABASE_SECRET_KEY` grants `service_role` access — keep it only on the
worker host, never in the web repo or client. The worker can only call the
`bot_*` RPCs, which are the sole functions granted to `service_role`.
