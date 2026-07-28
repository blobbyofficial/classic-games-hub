# Classic Games Hub

A Next.js 16 + Supabase games platform: an arcade of browser games with
accounts, a credits economy, cosmetics, friends, messaging, parties and a
Discord bot.

## Where the plan lives

- **`lib/roadmap.ts`** — what is *coming*, and nothing else. Currently
  **v1.5.0 "Collector's Edition"**. Renders at `/roadmap`.
- **`lib/update-log.ts`** — everything already shipped: past releases, merged
  pull requests, and every change that has landed on `main`. Renders at
  `/updates`.

When something ships it **moves** from the roadmap into the update log — it is
never marked shipped and left in place, or the roadmap grows into an archive
again. `LANDED` in the update log is generated from
`git log --first-parent main`; regenerate it rather than appending by hand.

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
Supabase separately — a migration file in the repo may already be live.

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

Commands must be **registered** with Discord before they appear — either
Admin → Discord bot → "Register slash commands", or
`POST /api/discord/register` with `Authorization: Bearer $CRON_SECRET`.
Registration is a full replace, so it is safe to repeat.

See `docs/discord-bot.md`, and `docs/parties.md` for the multiplayer design.

## Conventions

- Comments explain **why**, not what. Match the density of surrounding code.
- British English in user-facing copy ("customise", "colour").
- Never commit secrets. `SUPABASE_SECRET_KEY` is service-role and belongs only
  on the worker, never in anything the browser can reach.
- Work on a branch; do not push to `main` without being asked.
