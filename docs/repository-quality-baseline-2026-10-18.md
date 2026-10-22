# Repository quality baseline — 18 October 2026

Status: **initial evidence-based inventory, not a completed audit**. This document distinguishes verified repository facts from items requiring testing. Release target: **v1.6.1**. Do not deploy solely because this document exists.

## Confirmed at the baseline

- The main-branch `package.json` reports version `2.0.0`, inconsistent with ongoing v1.6.1 release work. Do not edit the package version without updating the lockfile and deciding whether this package version is intended to track releases.
- The main README contains historically specific claims about gameplay counts, roadmap status, and Discord bot hosting that require revalidation. Treat source engines, published database records, and publicly playable games as separate counts.
- Main CI includes npm lint, typecheck, engine loop and contract tests, production build, Discord bot checks, and an opt-in staging job. Existence of CI jobs **does not prove successful runs**.
- Open PRs observed: #72 (roadmap release placement), #76 (missing Slithery row), #78 (v1.6.1 architecture foundation). They overlap related work and require ordered review, not bulk merging.
- Repository branch search surfaced over 50 branch names, many generated for isolated changes. Their safety for deletion is unverified.

## Priority order

1. **P0: preserve a reproducible baseline.** Confirm the production deployment SHA, compare main with deployed source, capture current CI status, and document build reproducibility. Do not overwrite or reset branches.
2. **P0: prevent destructive migration mistakes.** Inventory the SQL migrations and their applied versions against each environment. Back up production and test migrations on disposable staging before application. Never assume that an UPDATE inserted a missing game.
3. **P1: reconcile open work.** Review PRs for duplicate/contradictory edits, dependency order, review status and CI. Merge only after validation. Close superseded PRs with an explanation; do not delete active contributor work.
4. **P1: make builds reliable.** Pin a supported Node/dependency toolchain, investigate dependency peer conflicts, validate npm ci / lint / typecheck / build, and fix actual failures rather than disabling checks.
5. **P1: test player journeys.** Add browser smoke checks for signed-out browsing, sign-in, game start/pause/restart, score persistence, touch controls, keyboard input, slow devices, profile and shop. Use isolated test accounts and a staging database.
6. **P2: simplify architecture.** Map ownership of routes, server actions, database functions, game engines, and bot worker. Remove dead code and duplicated helpers only after dependency searches and regression coverage.
7. **P2: reorganise documentation.** Make README a concise entry point, keep deployment and migration runbooks separate, provide one authoritative release log and one roadmap source, and label historic documents archived.
8. **P2: visual consistency.** Audit real mobile and desktop pages against reusable tokens and component patterns; fix navigation, spacing, empty states and accessibility before new theme effects.

## Release gates for v1.6.1

- A reproducible, green CI run on the exact proposed merge commit.
- No unresolved critical security, integrity or player-login regressions.
- Game catalog database rows, engine registry and routing reconciled.
- Staging verification of migrations, RLS and score/economy behaviour.
- Desktop/mobile gameplay and navigation smoke tests documented.
- README, deployment/runbook, release version, changelog and roadmap consistent.
- Explicit rollback plan for application code and database changes.
- No deployment from an unreviewed multi-feature branch.

## Evidence log

| Check | Status | Follow-up |
| --- | --- | --- |
| Main README versus current releases | Confirmed drift | Rewrite after verifying current implementation |
| Package release number | Confirmed mismatch | Decide version source of truth; update manifest and lockfile together |
| CI workflow configuration | Present | Inspect recent run results and failing logs |
| Branch inventory | Partial | Complete paginated inventory; tag merged, abandoned, active |
| PR #72, #76, #78 | Open in observed results | Review conflicts, mergeability and CI |
| Browser UX, performance, accessibility | Not tested | Run against staging and production read-only |
| Production schema | Not inspected | Compare migration history safely |

Do not mark any of the unchecked items as complete based on a code review alone.
