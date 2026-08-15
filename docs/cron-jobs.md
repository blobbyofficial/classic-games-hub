# Scheduled jobs

Five routes under `app/api/cron/` need calling on a schedule. Only two of them
are called by Vercel; the rest need an external scheduler, and this file is why.

## The rule that bites

**Vercel's Hobby plan allows two cron jobs, each running at most once a day.**

A `vercel.json` containing a sub-daily expression - `*/5 * * * *`, `0 * * * *`,
anything that fires more than daily - does not build and fail. It is rejected
when the deployment is *created*, so **no deployment record appears at all**:
no build, no error, nothing in the dashboard. Every push looks like it was
ignored, and reconnecting the repository does not help because the git
integration was never the problem.

This cost ten days of deployments between 3 and 13 August 2026. `de6cfc9`
changed role sync from `30 4 * * *` to `*/2 * * * *`, and that was the last
commit the project deployed until `vercel.json` was trimmed back.

So: **if a push produces no deployment whatsoever, check `vercel.json` first.**
Two entries, both daily. Anything else is a silent outage.

## What runs where

| Job | Wants | Runs on | If it never runs |
| --- | --- | --- | --- |
| `/api/cron/status-probe` | 5 min | **external** | `/status` shows no probe data and uptime stops accruing |
| `/api/cron/discord-role-sync` | 2 min | **external** | roles drift from the site until the next on-change sync |
| `/api/cron/discord-stats` | 10 min | **external** | counter channels freeze at their last numbers |
| `/api/cron/discord-audit-log` | 5 min | **external** | server logs stop, unless the gateway worker is running instead |
| `/api/cron/discord-publish` | 15 min | Vercel, `0 5 * * *` | new releases reach Discord within a day instead of minutes |
| `/api/cron/booster-drops` | daily | Vercel, `0 6 * * *` | the monthly cosmetic drop never lands |

The two on Vercel are the two where a daily run is defensible. `booster-drops`
is daily by design. `discord-publish` is a recovery sweep rather than the
timely path - publishing an announcement mirrors it immediately - but it is the
only job where *no* schedule at all breaks something silently, because a deploy
adds releases to the update log with nobody pressing anything.

`status-probe` is deliberately **not** one of them. `status_record_checks`
counts a failed check as five minutes of downtime, so a probe running daily
would not merely be coarse, it would make the uptime percentages wrong.

## Pointing a scheduler at them

Every route takes `GET` and checks one header:

```
Authorization: Bearer $CRON_SECRET
```

`CRON_SECRET` is the same value Vercel injects into its own cron calls, set in
Project → Settings → Environment Variables. Anything that can send a header on
a schedule will do.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://classic-games-hub.blobbyofficial.com/api/cron/status-probe
```

**cron-job.org** (free, one-minute resolution, custom headers) is the
straightforward option. Per job: create a cron job, set the URL, set the
interval from the table above, and add the `Authorization` header under
*Advanced → Headers*. Three jobs, three headers.

Alternatives, all of which work:

- **`bot/`**, the gateway worker, if you are already running it. It refreshes
  the counter channels on its own ten-minute schedule while it is up, so
  `discord-stats` needs no external call in that case.
- **Supabase `pg_cron` + `pg_net`**, which keeps the schedule next to the data
  and needs no third party.
- **GitHub Actions** `on: schedule` with the secret in the repository. Fine for
  the ten-minute job; its minimum is five minutes and firing is often late, so
  it is a poor fit for role sync.

Do not put the secret in the query string. These URLs end up in scheduler logs.

## If the plan changes

On Pro the limit is lifted and the jobs can go back into `vercel.json` at their
intended cadences, which is one file and no code:

```json
{ "path": "/api/cron/status-probe",      "schedule": "*/5 * * * *"  },
{ "path": "/api/cron/discord-role-sync", "schedule": "*/2 * * * *"  },
{ "path": "/api/cron/discord-stats",     "schedule": "*/10 * * * *" },
{ "path": "/api/cron/discord-publish",   "schedule": "*/15 * * * *" },
{ "path": "/api/cron/booster-drops",     "schedule": "0 6 * * *"    }
```

Turn the external schedulers off in the same sitting. Both firing is harmless -
every one of these routes is idempotent - but a job with two owners is a job
nobody checks.
