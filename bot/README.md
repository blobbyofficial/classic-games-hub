# classic-games-bot (companion gateway worker)

> **Most of the bot doesn't live here.** Slash commands, the verification
> button, the captcha modal, the ticket panel and every moderation command are
> served **serverlessly by the website** via Discord HTTP interactions -
> `app/api/discord/interactions` on Vercel. See `docs/discord-bot.md` for the
> full architecture and setup.

This directory is the **gateway worker**: the persistent WebSocket connection
to Discord. It covers the things a webhook can never do:

- **Chat XP / leveling** - watching messages and awarding Discord XP
- **Milestone level roles** - granted the instant someone levels up
- **Level-up announcements**
- **Join handling** - new members get the Unverified role (and an optional DM)
- **Automod** - invites, links, mass mentions, message floods (off by default)
- **Live feed** - new high scores & achievements posted to a channel
- **Stat counters** - voice channels renamed with live Hub numbers
- **Server logs** - every message, channel, role and member change in the
  server, each entry naming who did it (`src/features/logging`)
- **Showing the bot as Online** - see below

## "Why does the bot show as offline?"

Because Discord's online indicator means *"something is holding a gateway
connection for this application"* - nothing else. A bot that only answers HTTP
interactions is fully functional but permanently grey in the member list. There
is no API, setting or trick that makes an interactions-only bot appear online;
Discord simply has no presence to report.

So: **run this worker somewhere that stays up, and the bot goes green.** It
logs in with `status: online` and an activity (configurable via
`PRESENCE_TEXT` / `PRESENCE_TYPE` / `PRESENCE_STATUS`), re-asserts that
presence every 10 minutes (Discord drops it on some reconnects), reconnects on
its own, and exits non-zero on an invalidated session so the host restarts it.

### Where to run it

| Host | Always-on? | Notes |
| --- | --- | --- |
| **Fly.io** (`fly.toml` included) | ✅ yes | Recommended. `auto_stop_machines = false`, 256 MB machine. `fly launch --no-deploy --copy-config`, `fly secrets set …`, `fly deploy`. |
| **Render free** (`render.yaml` included) | ⚠️ idles after 15 min | Works if you keep it awake: point a free uptime pinger (UptimeRobot, cron-job.org, BetterStack) at `/health` every 5 minutes, and set `SELF_URL` so it also pings itself. |
| **Koyeb / Railway** | ✅ / ⚠️ | Same shape as Render; both accept the `Dockerfile`. |
| **A PC or Raspberry Pi at home** | ✅ | Genuinely fine. `npm run build && npm start` under systemd or pm2. |

The worker exposes `GET /health` on `$PORT` returning gateway status, ping and
uptime - hosts use it as a health check and pingers use it to keep the instance
awake.

It is **safe to stop and restart at any time**: XP cooldowns are enforced in
Postgres, not in process memory, so an unstable host can never double-award XP.
Everything else (all slash commands, role sync, verification, tickets) keeps
working while the worker is down - you just lose chat XP, instant milestone
roles, automod, the live feed and the online indicator.

## Setup

```bash
cp .env.example .env   # fill in DISCORD_TOKEN, DISCORD_GUILD_ID, SUPABASE_SECRET_KEY
npm install
npm run dev            # local dev (tsx watch)
# production:
npm run build && npm start
```

Privileged intents (Developer Portal → Bot):

- **Server Members** - required (join handling, role sync, member logs).
- **Message Content** - optional, and the one to enable if you want the logs to
  be worth reading: without it a delete log can say *that* a message was
  deleted but never *what* it said, and the automod invite/link rules match
  nothing at all. Set `MESSAGE_CONTENT_INTENT=true` when you turn it on. XP
  never reads message text either way.

The non-privileged intents (moderation, expressions, invites, voice states,
webhooks) are requested automatically for the log and need no portal switch.

Permissions the worker wants beyond the usual set:

- **View Audit Log** - without it every log entry still appears, but says
  "Unknown actor" instead of naming who did it. It is the single permission
  that decides whether the log is useful.

A `Dockerfile`, `fly.toml` and `render.yaml` are included.

## Configuration

Nothing about behaviour is configured here any more. Leveling, milestone roles,
verification, tickets, moderation/automod, the stat counters and the server
logs all live in Supabase (`discord_bot_config`) and are edited either from the
website (**Admin → Discord bot**) or from inside Discord with `/setup …`. The
worker re-reads all of it once a minute, so a settings change never needs a
restart.

`BOT_VERSION` is the one exception worth setting: it is what `/status` shows as
the worker's version. `npm_package_version` only exists when npm started the
process, and the Docker image runs `node dist/index.js` directly.

## Security

`SUPABASE_SECRET_KEY` grants `service_role` access - keep it only on the worker
host, never in the web repo or client. The worker can only call the `bot_*`
RPCs, which are the sole functions granted to `service_role`.
