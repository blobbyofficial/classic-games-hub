# Release readiness checklist — Classic Games Hub

**Target:** ship the missing updates safely, using the validated fixes in `fix/build-and-theme-migration-20261019`.
**Incident:** #81. **Release policy:** no Production deployment, promotion, migration execution, or merge until the gates below pass and the user explicitly authorizes release.
**Last confirmed Ready Production SHA:** `728f51d279a0b28c15be9ebceb0eea3c15f405e7`. **Latest main before isolation:** `fdc44fa756346c72347322bc1f847d5671935aeb`.

Statuses: [x] source change confirmed; [ ] incomplete or not yet verified. Attach command output, CI URL, database evidence or browser screenshots when completing a gate.

## Gate A — Build must pass (release blocker)
- [ ] Capture the **first actual failure** in `npm run build`, not merely Vercel's generic exit code 1. Use GitHub Actions logs or a reproducible local clean checkout; do not trigger more Vercel deployments merely to obtain logs.
- [ ] Run `npm ci` with Node 24 in a clean environment; inspect lockfile consistency and dependency errors.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm run build`; record results and fix code on the isolated branch.
- [ ] Run relevant theme regression scripts: `node scripts/check-halloween.mjs`, `node scripts/check-premium-theme.mjs`, `node scripts/check-retro-theme.mjs`, `node scripts/check-red-theme.mjs`.
- [ ] Review image generation and `next/font/google` build dependencies, `app/opengraph-image.tsx`, and Node runtime/server import compatibility.
- [ ] Verify Preview build **READY** when deployment testing is explicitly authorized.

## Gate B — Database safety (release blocker)
- [x] Correct invalid dollar-quote in 0114 on main (`b547c17`).
- [x] Correct duplicate PostgreSQL `RAISE EXCEPTION ... USING MESSAGE` patterns in 0111–0114 on fix branch (commits `8061684`, `4adb54b`, `8bcd598`, `b94028d`).
- [ ] Verify every migration 0099, 0111, 0112, 0113, 0114 against an isolated test database; run SQL parsing / transactional migration tests.
- [ ] Read production migration history and schema; **never assume** that merging SQL applies it. Identify exactly which migrations are missing.
- [ ] Confirm rollback/backup and dependency ordering. Apply only missing reviewed migrations before production release, after user authorization.
- [ ] Test Halloween saving; Retro level-24 denial/level-25 unlock and persistence; Premium boost/revocation; direct database-write protection.

## Gate C — Feature regression
- [ ] Social Open Graph image serves correct PNG, image links unfurl, counters are accurate and failures degrade gracefully.
- [ ] Themes Basic, Halloween, Velvet Red, Premium and Retro persist across navigation and reload; verify light/dark/system, locking, fallback and mobile rendering.
- [ ] Game filters: URL query persistence, sorting, browser back/forward, search, favourites, empty results, mobile.
- [ ] Slither: game exists as a published DB record, desktop steering, mobile controls, pause/resume and score behavior.
- [ ] Homepage/catalogue counts and published games match the database; check auth and Discord booster entitlement sync.
- [ ] Smoke-test other changes introduced between `728f51d` and the intended release SHA, not only headline features.

## Gate D — Production authorization and rollout (DO NOT EXECUTE YET)
- [ ] Review diff and CI on fix branch; merge only after approval. Ensure intended commit is exactly recorded.
- [ ] Check Vercel build allowance and project settings (repo, production branch, root directory, Node version, environment variables) without exposing secrets.
- [ ] Back up DB and apply authorized missing migrations using recorded migration history.
- [ ] Deploy the tested exact SHA to Production once; require **READY**, not QUEUED/BUILDING.
- [ ] Confirm `classic-games-hub.blobbyofficial.com` is aliased to that exact READY deployment, with canonical URL behavior correct.
- [ ] Validate live desktop/mobile/social share routes, authenticated journeys and error logging; retain Ready `728f51d` rollback path.
- [ ] Update release notes and issue #81 with deployment ID, SHA, timestamp, migration state, test evidence; only close #81 after evidence.

## Current blockers / evidence
- Production build attempts of `b547c17` and `fdc44fa` returned `npm run build` exit code 1; detailed Vercel build logs inaccessible via connected API (403).
- Production currently has a previously Ready deployment at `728f51d`; do **not** treat newer merged code as live.
- No evidence yet that production SQL 0099/0111–0114 are applied.
- This document records prerequisites, not a claim of test completion.
