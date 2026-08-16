# Scheduled jobs

Six routes under `app/api/cron/` need calling on a schedule. Two are called by
Vercel and four are driven by `pg_cron` inside Supabase. None of them depend on
a third-party scheduler any more; this file is why it is split that way.

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
| `/api/cron/status-probe` | 5 min | **`pg_cron`**, `*/5 * * * *` | `/status` shows no probe data and uptime stops accruing |
| `/api/cron/discord-role-sync` | 2 min | **`pg_cron`**, `*/2 * * * *` | roles drift from the site until the next on-change sync |
| `/api/cron/discord-stats` | 10 min | **`pg_cron`**, `*/10 * * * *` | counter channels freeze at their last numbers |
| `/api/cron/discord-audit-log` | 5 min | **`pg_cron`**, `*/5 * * * *` | server logs stop, unless the gateway worker is running instead |
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

## How the four are driven

Every route takes `GET` and checks one header:

```
Authorization: Bearer $CRON_SECRET
```

`CRON_SECRET` is the same value Vercel injects into its own cron calls, set in
Project → Settings → Environment Variables. Anything that can send a header on
a schedule will do — which is what made an external scheduler possible, and
what makes replacing it a change of caller rather than a change of route:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://classic-games-hub.blobbyofficial.com/api/cron/status-probe
```

Migration `0075_scheduled_jobs.sql` installs `pg_cron` and `pg_net` and
schedules the four at their real cadences. Each job calls one function,
`cron_call('/api/cron/…')`, which reads the token, attaches the header and
queues the request asynchronously — so a slow route delays nothing and a job
cannot overrun its own interval.

### Setting it up

The token is deliberately not in the migration. Once, in the SQL editor:

```sql
select vault.create_secret('<the-real-CRON_SECRET>', 'cron_secret',
                           'Bearer token for /api/cron/* routes');
```

Until that exists, every tick is skipped with a warning in the Postgres logs
rather than firing unauthenticated at a route that would return 401 four times
a minute forever. Rotating the token is an update to the secret — the jobs pick
it up on the next tick, with no redeploy and no reschedule.

If the site ever moves domain, the base URL is a row rather than a literal:

```sql
update status_meta
   set value = jsonb_build_object('url', 'https://new-domain.example')
 where key = 'cron_base_url';
```

### Checking it is alive

```sql
select public.admin_cron_status();
```

Admin-only, and returns each job's schedule, whether it is active, when it last
ran and how that run ended — plus `secret_set`, which is the first thing to
look at when every job is firing and nothing is happening. It reports whether
the token exists, never what it is.

`select * from cron.job_run_details order by start_time desc limit 20;` is the
raw version when you want the failure text.

### Why not the alternatives

- **cron-job.org** and friends work fine, and this is what the site used until
  v1.6.x. The objection is not reliability, it is that the schedule for the
  most timing-sensitive job lived in a free third-party account with no
  alerting and nothing in this repository could tell you whether it still ran.
- **`bot/`**, the gateway worker, still refreshes the counter channels on its
  own ten-minute timer while it is up. Both firing is harmless — every one of
  these routes is idempotent, and the audit poller's cursor is what stops it
  logging anything twice.
- **GitHub Actions** `on: schedule` has a five-minute floor and fires late
  often enough to be a poor fit for role sync.

Do not put the secret in the query string. These URLs end up in logs.

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

Unschedule the `pg_cron` jobs in the same sitting. Both firing is harmless -
every one of these routes is idempotent - but a job with two owners is a job
nobody checks.

```sql
select cron.unschedule('status-probe');
select cron.unschedule('discord-role-sync');
select cron.unschedule('discord-stats');
select cron.unschedule('discord-audit-log');
```

Worth saying that Pro is not obviously the upgrade here. `vercel.json` would
put the schedule next to the deploy, which is nice; `pg_cron` puts it next to
the data, survives a Vercel outage, and can be inspected with a query. The
`vercel.json` two-daily-entries rule stays either way — it is the thing that
silently kills deploys.
