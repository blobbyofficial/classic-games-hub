# The status page

`/status` answers one question - **is Classic Games Hub working?** - and it
answers it four ways at once, because no single one of them is trustworthy on
its own.

| Source | What it is | What it misses |
| --- | --- | --- |
| **Probes** | A scheduled job checks each service every 5 minutes | A game that renders a blank canvas still returns HTTP 200 |
| **Incidents** | What a human has said, with a timeline | Only exists once someone notices |
| **Player reports** | Downdetector-style "this is broken for me" taps | Noisy, unverified, and easy to skew |
| **Pins** | A staff override on a single service | Only as current as the last person to clear it |

The page combines them; the API exposes all of it; the Discord bot reads the
same endpoints. Schema is `database/migrations/0071_status.sql`.

## The vocabulary is Statuspage's, deliberately

Component statuses are `operational`, `degraded_performance`, `partial_outage`,
`major_outage` and `under_maintenance`. The overall indicator is `none`,
`minor`, `major`, `critical` or `maintenance`. Incidents run `investigating` →
`identified` → `monitoring` → `resolved`; maintenance runs `scheduled` →
`in_progress` → `verifying` → `completed`.

Those are the exact strings status.claude.com and every other Statuspage
instance emits. Borrowing them costs nothing and means anything already written
against a status page understands ours - which is why `/api/status?format=statuspage`
is a re-shaping of the envelope rather than a translation.

Defined once in `lib/status.ts` (for TypeScript) and in the check constraints of
0071 (for the database).

## How a service's status is decided

```
effective status = pin, if one is set
                   otherwise the worst of:
                     - what the probes last concluded
                     - what every open incident claims about it
```

`status_effective()` in 0071 is the whole rule. Severity ordering lives in
`status_rank()`: operational < under_maintenance < degraded_performance <
partial_outage < major_outage.

The pin is the only one that can make a service look **better** than the
evidence, which is why it records who set it and why, and why the reason is
published on the page beside the service.

## The probe

`/api/cron/status-probe`, every 5 minutes, authorised with
`Authorization: Bearer $CRON_SECRET`.

The schedule lives in an external scheduler rather than `vercel.json`, because
Vercel's Hobby plan runs crons at most once a day and a daily probe would make
the uptime percentages wrong - `status_record_checks` counts a failed check as
five minutes of downtime. See `docs/cron-jobs.md`; if the probe is not
scheduled, the page has no data to draw and says so rather than claiming green.

Four round trips cover ten components:

- one HTTP fetch of the site's own front page → `website`
- one fetch of Supabase's `/auth/v1/health` → `accounts`
- one fetch of Discord's `/api/v10/gateway` → `discord-api`
- one `status_selfcheck()` call, which times a representative read per
  DB-backed area and reads the bot's heartbeat freshness → the other seven

Everything is then written in a single `status_record_checks()` call, so adding
a component to the page does not add a network round trip to the probe.

**Two consecutive failures, not one.** A single failed check is a network blip
far more often than it is an outage, and an incident opened for every blip
trains everyone to ignore the page. Two in a row at a five-minute cadence means
the fault has survived five minutes. The same threshold closes it again.

Automatic incidents carry `auto = true` and an `auto_key` of the component slug;
a partial unique index guarantees at most one open automatic incident per
component, so a flapping probe cannot fill the page.

Run it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/status-probe
```

### Uptime

Every check updates a daily rollup in `status_days`, so the 90-day bars are a
90-row index scan rather than an aggregate over ~26,000 raw samples per
component. Raw `status_checks` rows are pruned after 14 days; the rollup is kept.

A day with **no checks** is excluded from the uptime percentage and drawn as
"no data" rather than counted as 100%. A day before this table existed did not
have perfect uptime, and it did not have an outage either.

## Player reports

The Downdetector half. A report is a single anonymous tap of "this is broken for
me", and it is only ever read in aggregate: 15-minute buckets over 24 hours,
against the site's own recent baseline.

The verdict needs a floor **and** a multiple:

```
threshold = max(min_reports, ceil(baseline × multiplier))
spike     when current ≥ threshold × 2
elevated  when current ≥ threshold
```

A multiple alone makes a quiet site hysterical (two reports against a baseline
of 0.3 is a 6× spike and means nothing); a floor alone makes a busy site deaf.
The baseline excludes the last hour, so an outage in progress cannot raise the
bar it is measured against.

Tunables live in `status_meta` under the `reports` key and can be changed
without a migration:

| Key | Default | What it does |
| --- | --- | --- |
| `window_minutes` | 15 | Bucket width, and the "right now" window |
| `min_reports` | 5 | Floor - fewer is never a signal |
| `multiplier` | 3 | How far above baseline counts as elevated |
| `baseline_hours` | 12 | How far back the baseline averages |
| `cooldown_minutes` | 10 | One report per person per component per this long |
| `hourly_cap` | 6 | Total reports per person per hour |

### Why reports are hard to fake

The whole value of the aggregate is that it is expensive to poison, so:

- `status_report_submit()` is **service_role only**. It is not reachable with
  the anon key that ships in the browser bundle.
- The **caller supplies the fingerprint**, and the caller is always our server -
  `lib/status-report.ts` derives it from the request, so the sender cannot
  choose it.
- The fingerprint is `sha256(address + user agent + server secret + today's
  date)`. The date makes it useless as a long-term identifier: yesterday's
  fingerprint cannot be matched to today's. **No IP address is ever stored.**
- The cooldown and the hourly cap are enforced in the database, so the limit
  holds whether the report arrived from the page or the API.

Notes attached to reports are **staff-only**. The public page shows counts and
percentages, never the text.

## The API

Public, CORS-open to `*`, no key. Cached 30s at the edge with a 60s
stale-while-revalidate window, so a bot polling it does not become load and a
slow database serves the last known answer rather than an error.

| Endpoint | What it returns |
| --- | --- |
| `GET /api/status` | Everything: components, incidents, maintenance, report signal, versions |
| `GET /api/status?format=statuspage` | The same, in Statuspage's `summary.json` shape |
| `GET /api/status/components` | Just the board |
| `GET /api/status/components/{slug}` | One component, 90 days of uptime, its incidents, its reports |
| `GET /api/status/incidents` | History. `?active=1`, `?kind=`, `?limit=`, `?before=` |
| `GET /api/status/uptime` | The compact matrix, or `?component={slug}` for one series |
| `GET /api/status/reports` | Report buckets, baseline and verdict. `?component=`, `?hours=` |
| `POST /api/status/reports` | Submit a report. `{ problem, component?, note? }` |
| `GET /api/status/badge` | An SVG badge. `?component=`, `?label=`, `?style=flat` |

An unreachable database answers **503**, never an empty list. "No incidents"
when nothing can be read is the one lie a status page must not tell.

```bash
# Is anything broken?
curl -s https://<domain>/api/status | jq '.status.indicator'

# One service
curl -s https://<domain>/api/status/components/leaderboards | jq '{status, uptime_90d}'

# Report a problem
curl -X POST https://<domain>/api/status/reports \
  -H 'Content-Type: application/json' \
  -d '{"problem":"scores","component":"leaderboards"}'
```

Badges embed anywhere:

```markdown
![status](https://<domain>/api/status/badge)
![games](https://<domain>/api/status/badge?component=games)
```

## In Discord

`/status [service]` - public, not ephemeral, because "is the site down" is a
question a whole channel is usually asking at once.

- `/status` - the whole board, open incidents, scheduled maintenance
- `/status <service>` - one service: status, uptime, latency, reports, incidents
- `/status incidents` - the last five, resolved or not
- `/status reports` - what players are reporting and the most common problems
- `/status versions` - site version, commit, schema, worker

The `service` option **autocompletes from the live component list**, so a
service added to the status page appears in Discord without touching
`lib/discord/commands.ts` or re-registering. Autocomplete cannot be deferred, so
it answers from one indexed select rather than the full summary.

Registration is a full replace - see `docs/discord-bot.md`.

## Running an incident

From **Admin → Status** (`/admin/status`), which is one screen on purpose:
whoever is using it is using it while something is on fire.

1. **Declare it.** Title, first update, impact, and which services are affected
   and how. The first update is published as-is on a page anyone can read.
2. **Keep it updated.** Post updates as the picture changes; the status on the
   update moves the incident.
3. **Close it** by posting an update with status `resolved` (or `completed` for
   maintenance). There is no separate close button - closing *is* the final
   update, so a resolved incident can never have a timeline that stops
   mid-sentence. Resolving also releases the incident's claim on its components,
   so the board goes back to whatever the probes say.

**Scheduled maintenance** is the same flow with a kind of `maintenance` and a
window; it renders in its own section rather than as a fault.

**Pinning** overrides everything for one service. Use it for a probe that is
wrong, or for work the checks cannot see - and clear it afterwards. Every
incident action and pin is written to `audit_logs`.

## Versions

Four numbers that can disagree, which is why they are shown together:

- **Site** - the newest release in `lib/update-log.ts`
- **Build** - `VERCEL_GIT_COMMIT_SHA`, linked to the commit
- **Schema** - read back from `status_meta.schema` at request time
- **Worker** - reported by the bot's own `bot_heartbeat()`

Migrations are applied to Supabase separately from deploys, so the app and the
schema drift apart routinely and used to do so silently. `EXPECTED_SCHEMA` in
`lib/version.ts` is what the deployed build was written against; when it differs
from what the database reports, the page says so.

**Every migration after 0071 should bump both** - the `status_meta.schema` row
in SQL, and `EXPECTED_SCHEMA` in `lib/version.ts`.

## Adding a service

1. Insert a row into `status_components` (slug, name, description, group,
   position, probe kind, `degraded_ms`).
2. If its probe is `db`, add a timed read to `status_selfcheck()` and add the
   slug to `AREAS` in `app/api/cron/status-probe/route.ts`.
3. Nothing else. The page groups by `group_name`, the API serves it, and Discord
   autocompletes it.
