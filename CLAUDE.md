# Classic Games Hub

A Next.js 16 + Supabase games platform: an arcade of browser games with
accounts, a credits economy, cosmetics, friends, messaging, parties and a
Discord bot.

## Where the plan lives

- **`lib/roadmap.ts`** - what is *coming*, and nothing else. Currently
  **v1.6.0 "Ground Up"**, the first of a rebuild that runs to v1.9.0. Renders
  at `/roadmap`. Everything planned stays in the 1.x line; 2.0.0 is deliberately
  unclaimed until something earns it.
- **`lib/update-log.ts`** - everything already shipped: releases grouped into
  series, merged pull requests, and every change that has landed on `main`.
  Renders at `/updates`.

When something ships it **moves** from the roadmap into the update log - it is
never marked shipped and left in place, or the roadmap grows into an archive
again. `LANDED` in the update log is generated from
`git log --first-parent main`; regenerate it rather than appending by hand.

**Every landed change belongs to exactly one release.** A release is a unit of
work, not of time or commit count - three small fixes in an afternoon are one
patch, a single pull request that redesigns the site is a patch on its own -
and each one records its `commits`, its `prs`, and a `scope` line saying why it
was drawn there. `UNASSIGNED` is derived, so a change nobody versioned shows up
on `/updates` as a question rather than falling out of the history. Version
numbers run forwards in time inside a series; a release that has to be
renumbered carries `formerly` so its old number still finds it. A planned
number in the roadmap is not a reservation - shipped work takes the next free
one and the plan moves up.

Releases and published announcements are mirrored into Discord
(`lib/discord/publish.ts`); see `docs/discord-bot.md` → *Publishing*.

To pick up new work: read `lib/roadmap.ts`. Each item's description says what
it is; none of them are specs, so expect to make product decisions or ask.

## Architecture

| Layer | Where | Rule |
| --- | --- | --- |
| Schema, RLS, business rules | `database/migrations/NNNN_*.sql` | Rules live **here**, not in the UI |
| Reads | `services/*.ts` | `cache()`-wrapped server reads |
| Writes | `actions/*.ts` | `"use server"`; thin wrappers over RPCs |
| UI | `features/<area>/*.tsx`, `app/(main)/**` | Feature folders, not one giant components dir |
| Shared UI | `components/ui/*` | shadcn-style primitives |

**The database owns the invariants.** Anything that must be true regardless of
which client is talking (one party per person, credit balances, who may claim
what) is a constraint or a `SECURITY DEFINER` RPC, revoked from `public`/`anon`
and granted to `authenticated`. Server actions translate `{ok, error}`
envelopes into readable sentences; they do not enforce rules themselves.

Migrations are append-only and numbered sequentially. They are applied to
Supabase separately - a migration file in the repo may already be live.

## Verifying

```
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run build        # next build
```

All three must pass. The bot is a **separate package** with its own deps and
its own typecheck:

```
cd bot && npm install && npx tsc --noEmit
```

The public Definition of Done is in `lib/roadmap.ts` and shown on `/roadmap`:
docs updated, changelog updated, obsolete code removed, types clean, lint
passes, build succeeds, mobile and desktop both verified.

## The Discord bot

Two halves, and it matters which is which:

- **Slash commands, buttons, modals** → `app/api/discord/interactions` on
  Vercel. Works without the worker.
- **`bot/`** → an optional always-on gateway worker for chat XP, automod, join
  handling, the live feed, counter channels, the bot's Online presence, and the
  `bot_heartbeat()` call that drives the Discord panel on `/status`.

Commands must be **registered** with Discord before they appear - either
Admin → Discord bot → "Register slash commands", or
`POST /api/discord/register` with `Authorization: Bearer $CRON_SECRET`.
Registration is a full replace, so it is safe to repeat.

See `docs/discord-bot.md`, and `docs/parties.md` for the multiplayer design.

## Is it working?

`/status` is the health page: probes every five minutes, incidents with
timelines, 90 days of uptime, and Downdetector-style player reports. It speaks
Statuspage's vocabulary on purpose (`operational`, `degraded_performance`,
`major_outage`, and a `none`/`minor`/`major`/`critical` indicator) so the public
API it exposes is understood by tools already written against a status page.

The same data serves `/api/status/*` (CORS-open, no key), `/status` in Discord,
and Admin → Status. See `docs/status.md`.

**Every migration bumps the schema version in two places**: the
`status_meta.schema` row in SQL, and `EXPECTED_SCHEMA` in `lib/version.ts`.
`/status` compares them, so a migration that has not been applied to Supabase is
visible rather than mysterious.

## Scheduled jobs

`vercel.json` carries **two** cron entries, both daily, and has to stay that
way. The Hobby plan rejects a sub-daily expression when the deployment is
*created*, so a push produces no deployment at all - no build, no error,
nothing in the dashboard, and reconnecting the repository does not help. That
cost ten days of deploys in August 2026. **If pushes stop deploying, read
`vercel.json` before anything else.**

The jobs that need a tighter cadence - the five-minute status probe, role sync,
counter channels - run from an external scheduler instead. `docs/cron-jobs.md`
has the table of what runs where and the setup.

## Extending the platform

Two things touch more files than they look like they should, and both have a
checklist:

- `docs/adding-a-game.md` - engine, registry, `games` row, thumbnail, verify.
- `docs/cosmetics.md` - the kinds, where each one is drawn, and the five places
  a new kind has to be registered.

## Conventions

- Comments explain **why**, not what. Match the density of surrounding code.
- British English in user-facing copy ("customise", "colour").
- Never commit secrets. `SUPABASE_SECRET_KEY` is service-role and belongs only
  on the worker, never in anything the browser can reach.
- Work on a branch; do not push to `main` without being asked.
