# Phase 1 — Production and operations baseline

**Audit date:** 2026-10-17  
**Repository:** `blobbyofficial/classic-games-hub`  
**Baseline source:** `main` at `d271b47d3101226e26bf2f2bafaf303fc2ada7f6` when the audit branch was created  
**Scope:** Deployment identity, scheduled jobs, Discord gateway worker, CI, and evidence tracking.  
**Disposition:** Source review performed; **production verification remains open**.

## Evidence grades

- **Confirmed (source):** observable directly in a specific repository file. Does not prove deployment or execution.
- **Confirmed (runtime):** supported by fresh authenticated production evidence and timestamp/commit identity.
- **Risk / discrepancy:** evidenced configuration inconsistency, without demonstrated user-facing failure.
- **Unknown:** no reliable recent runtime proof. Never classify as outage without such proof.

## Deployment baseline

| Check | Current evidence | Classification |
| --- | --- | --- |
| Source identity | `main` base SHA above at audit branch creation | Confirmed (source) |
| Site origin | `https://classic-games-hub.blobbyofficial.com` in `docs/cron-jobs.md`, `bot/src/config.ts`, and CI | Confirmed (configured); production alias ownership unknown |
| Vercel deployment ID, deployment SHA and environment | No authenticated Vercel deployment record available in this audit | Unknown |
| Public routes `/`, `/games`, `/status`, `/roadmap` | Public search/indexed roadmap returned HTML; not a fresh browser session with a deployment SHA. Status API retrieval was inaccessible from the retrieval tool. | Unknown runtime health |
| Version metadata | `package.json` reports `2.0.0`, while public product roadmap uses 1.x release labels; README also has stale playable-game descriptions | Confirmed (source discrepancy), not proof of a deployment bug |
| Roadmap override | `app/(main)/roadmap/page.tsx` reads optional admin `roadmap_override`; repository content may not match displayed content | Confirmed (source), runtime value unknown |

**Release gate:** In Vercel, capture deployment ID, production SHA, environment and deployment timestamp. Compare against GitHub `main`; request all four routes with a cache-busting query, capture HTTP status, response headers, time and browser screenshot. Never infer an outage from a cached search page or an inaccessible third-party retrieval.

## Scheduled job baseline

Six intended jobs:

| Job | Owner | Intended schedule (UTC) | Evidence |
| --- | --- | --- | --- |
| status-probe | Supabase `pg_cron` | `*/5 * * * *` | `database/migrations/0075_scheduled_jobs.sql` |
| discord-role-sync | Supabase `pg_cron` | `*/2 * * * *` | same |
| discord-stats | Supabase `pg_cron` | `*/10 * * * *` | same |
| discord-audit-log | Supabase `pg_cron` | `*/5 * * * *` | same |
| discord-publish | Vercel | `0 5 * * *` | `vercel.json` |
| booster-drops | Vercel | `0 6 * * *` | `vercel.json` |

**What source inspection establishes:** `vercel.json` declares exactly two daily jobs. Migration `0075` declares the other four jobs; it is **not proof that the migration was applied**. `cron_call` reads `vault.decrypted_secrets` using the name `cron_secret` and reads `status_meta.cron_base_url`. It queues requests through `net.http_get`.

**Important interpretation:** A `cron.job_run_details` success may mean the request was **queued**, not that the HTTP target returned 2xx or performed its work. Inspect `net._http_response` records (subject to platform retention), application logs and domain-specific effect counters for the corresponding requests. A missing or rotated Vault secret should be treated as configuration until proven otherwise; compare presence of secret, never its plaintext.

### Safe, read-only production checks

Run in Supabase SQL editor as an authorized administrator:

```sql
select public.admin_cron_status();
select j.jobname, j.schedule, j.active, d.start_time, d.end_time, d.status, d.return_message
from cron.job j
left join lateral (
  select start_time, end_time, status, return_message
  from cron.job_run_details d
  where d.jobid = j.jobid
  order by start_time desc
  limit 1
) d on true
where j.jobname in ('status-probe', 'discord-role-sync', 'discord-stats', 'discord-audit-log')
order by j.jobname;
select key, value from public.status_meta where key = 'cron_base_url';
```

For each job capture: expected cadence, observed execution timestamp, success/failure detail, latest HTTP status in network/application logs, and actual effect (recent `status_checks` samples, synced roles, updated counters, audit cursor movement, published messages, or booster grants). Redact secrets, bearer tokens, personal data and sensitive headers before attaching evidence.

**Runtime verdict:** Unknown for all six until timestamped records are inspected.

## Discord gateway worker baseline

- `bot/src/config.ts` requires `DISCORD_TOKEN` (or alias), `DISCORD_GUILD_ID`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` at process startup.
- `bot/src/health.ts` serves `/health` with 200 only while Discord's `client.isReady()` returns true; otherwise 503. It reports gateway latency, uptime and guild count.
- `app/api/cron/status-probe/route.ts` treats a never-started worker differently from one with a stale heartbeat; the latter can affect the Discord worker component.
- `bot/README.md` documents a persistent gateway worker and separates it from serverless Discord HTTP interactions.
- **Not verified:** Hosting provider or instance, current uptime, health URL, last successful heartbeat, login/intents, message XP, role/member sync, audit logging and interaction-signature configuration.

**Release gate:** identify the actual worker deployment/host, check its `/health` endpoint and uptime, record a fresh worker heartbeat in database, inspect startup/reconnect logs and test a harmless interaction and controlled role/message synchronization. Avoid exposing the health endpoint's host secrets or user records.

## CI baseline

`.github/workflows/ci.yml` defines a `site` and `bot` job on PRs and pushes to `main`:
- Site: `npm ci`, lint, typecheck, `scripts/test-game-loop.cjs`, build.
- Worker: separate `bot/npm ci`, typecheck and build.
- `.github/workflows/releases.yml` syncs release records on update-log changes.
- Separate seasonal workflows exist; their runtime execution has not been audited.

**Gaps in the defined pipeline:** No comprehensive browser E2E test, accessibility run, real DB integration test, migration-apply verification or production synthetic deployment check appears in the inspected CI workflow. This is a coverage gap, not evidence that CI fails.

**Release gate:** collect actual Actions run URLs, SHA, conclusion, artifacts and dates for `main` and this PR. Do not infer that a configured check passed.

## Tracked findings

| ID | Priority | Finding | Classification | Required evidence/next action |
| --- | --- | --- | --- | --- |
| OPS-001 | P0 | Production Vercel SHA not established | Unknown | Capture current deployment URL, ID, SHA, and screenshots |
| OPS-002 | P0 | Four Supabase cron schedules and completions not established from live DB | Unknown | Query `admin_cron_status`, `cron.job_run_details`, HTTP responses and effects |
| OPS-003 | P0 | Vercel daily cron executions not demonstrated | Unknown | Examine current Vercel cron/function run history and effects |
| OPS-004 | P1 | Discord gateway worker runtime health unknown | Unknown | Host health, worker heartbeat, logs, controlled event |
| OPS-005 | P1 | CI status for current SHA not demonstrated | Unknown | Collect run links/results |
| OPS-006 | P2 | Package `2.0.0` and product-facing 1.x release ledger differ | Confirmed source discrepancy | Decide package/version convention, test release display before editing |
| OPS-007 | P2 | README game counts/availability appear stale relative to rebuild policy | Confirmed documentation discrepancy | Reconcile wording with locked-game policy and live catalogue |
| OPS-008 | P2 | `roadmap_override` may supersede built-in roadmap | Confirmed mechanism, runtime unknown | Record enabled flag/source without exposing sensitive data |
| OPS-009 | P1 | Cron queue success alone is not end-to-end HTTP success | Verified architectural observability limitation | Collect downstream HTTP/effect evidence before green status |
| OPS-010 | P1 | Current CI lacks full integration, accessibility and E2E coverage | Confirmed workflow coverage gap | Schedule test expansion in Phase 2 |

These are tracked **audit findings**, not ten confirmed production defects.

## Reproducible baseline procedure

1. Pin the GitHub `main` SHA, active Vercel deployment SHA, environment, UTC timestamp and production alias.
2. Capture fresh unauthenticated status + screenshots of `/`, `/games`, `/status`, `/roadmap`; add authenticated test cases only with isolated authorized accounts.
3. Capture the six scheduled jobs' last observed run and actual downstream HTTP/application outcome; distinguish scheduled, queued and completed.
4. Capture worker host/deployment identity, gateway-ready health response, database heartbeat and logs; distinguish intentionally unconfigured from unexpectedly offline.
5. Attach Actions run links and conclusions for both site and bot jobs.
6. File separately reproducible defects with severity, route, environment, expected/actual results, timestamp, commit, screenshot/log evidence and owner.
7. Re-run this same baseline after changes; only then resolve findings and mark the roadmap maintenance release verified.

## Phase 1 exit criteria

- [x] Repository source configuration reviewed for deployment, cron, gateway and CI.
- [x] Expected schedules and CI stages documented.
- [x] Source discrepancies and unknown runtime risks kept in separate categories.
- [ ] Fresh production deployment identity confirmed.
- [ ] Four production routes inspected from a current, uncached session with screenshots.
- [ ] All six scheduled jobs verified end to end with timestamped evidence.
- [ ] Discord worker host, gateway readiness and heartbeat verified.
- [ ] Current production-related CI run results captured.
- [ ] Confirmed production defects (if any) logged with reproduction evidence.

**Outcome:** Phase 1 has produced a repeatable source-backed baseline; **it is not complete** until the outstanding runtime gates pass.

## Follow-up evidence — 17 October 2026

### Actual GitHub Actions results on audit commit

Commit `9dd8a66e5c719163bd7f7190435f533d9ac50202` has two completed successful GitHub Actions workflow runs, retrieved from the GitHub Actions API through the linked repository connector.

| Workflow | Run ID | Result | Inspected jobs/steps |
| --- | --- | --- | --- |
| CI | `39038475333` | completed / success | Site: install, lint, typecheck, lifecycle regression, build all succeeded; Discord bot: install, typecheck, build all succeeded |
| CodeQL | `39038475323` | completed / success | Analyse job and init/analyze steps succeeded |

**Limitations:** These are PR-head checks for the documentation audit branch, **not** a verified successful Vercel deployment, and not an assertion about `main` CI history. The connector's commit-run method returns PR-triggered runs only; querying base SHA `d271b47d3101226e26bf2f2bafaf303fc2ada7f6` yielded no runs through that method and therefore cannot establish absence of push checks. These checks also do not exercise the live site, cron execution or the running bot.

### Public site retrieval attempt

- Site root `https://classic-games-hub.blobbyofficial.com/`: direct web-tool retrieval failed with a **fetch timeout**; this does not establish that browsers cannot reach it.
- `/api/status`: direct web-tool retrieval was reported inaccessible to the retrieval tool; no HTTP application status code can be inferred.
- `/updates`: a web search result indexed two days before the audit returned update-log content; it is **not a cache-bypassing production deployment verification**.

**Disposition:** OPS-005 is partially resolved for **this PR's CI checks**, but remains open as a production deployment/CI association check. OPS-001 remains unknown, not a confirmed outage. No deployment or cron infrastructure has been changed.

### Evidence-driven next action

Obtain the active Vercel production deployment ID and commit SHA via authorized deployment access; compare it with the successful CI SHA. Read timestamped `admin_cron_status`, `cron.job_run_details` and application/HTTP response logs. Collect the gateway worker's actual host URL, readiness status and latest DB heartbeat. Until then, do not mark Phase 1 complete.

## Follow-up — public route retrieval and CI after documentation update

**Public retrieval on 17 October 2026:** The web retrieval service provided parsed HTML for `/`, `/games`, `/status` and `/roadmap`. This improves the prior `fetch timeout`/cache-miss result: the routes served retrievable page content to this tool. However, the results are crawler representations, **not** direct status/header captures, uncached browser screenshots, or an authenticated Vercel deployment-to-SHA link. Do not declare the production deployment verified.

**Incident observation:** The retrieved `/status` page reported **"Degraded performance"** and a currently displayed automatic incident **INC-2: "Discord bot is not responding"**, classified "Major" and "Investigating", with the displayed incident start **17 Oct 08:15** (page-rendered timezone unspecified). The page also showed some services as "Under maintenance" and "Checked just now", but a crawler snapshot cannot establish continuously current worker health. This is **evidence of a public incident report**, not proof that the gateway process is down. Inspect worker heartbeat, host logs, status probe records, and the precise service/incident timestamps before changing worker code or treating it as an infrastructure outage.

**Current public surface:** The retrieved homepage and games page both displayed 26 games in the library; homepage explicitly said some are being rebuilt. This is consistent with a 26-item catalogue but not evidence 26 are playable.

**Latest CI verification:** PR commit `d73b3a01631c33dda649d27ab1bdcdd24c68461b` has successful GitHub Actions run `39039014512` (CI) and run `39039014501` (CodeQL). Both were reported as completed/success. These runs predate this new documentation-only edit; its own checks must be inspected separately.

### Updated findings

- **OPS-001:** Four public routes are retrievable through the public web tool; the deployment SHA, HTTP headers and browser screenshot gate remain open.
- **OPS-004:** Public status page reports an automatic Discord bot incident (INC-2); **root cause remains unverified**. Do not conflate the public alert with confirmed worker downtime.
- **OPS-005:** CI + CodeQL verified successful on the last audited PR SHA `d73b3a0`; the active production SHA remains unconfirmed.
- **OPS-002/003:** No authenticated scheduled-job completion or downstream HTTP response evidence acquired.

**Do not close Phase 1 on these signals alone.**
