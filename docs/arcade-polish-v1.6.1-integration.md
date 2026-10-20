# Arcade Polish v1.6.1 — integration branch

> **Status: integration in progress — NOT a deployable release.**
>
> This branch is public for review. Creating it does not change `main`, the production deployment, or other pull requests.

## Why a separate branch

The 100-item Arcade Polish roadmap was developed as a series of isolated local patch packages. **Those packages are not all integrated into this branch yet.** The archive inventory inspected 49 available installers covering batches 014–068; 23 target paths were referenced by multiple installers. Blindly applying them in order could overwrite changes or break gameplay.

## High-risk integration targets

- `features/games/games-library.tsx` — 9 installer references
- `components/games/game-card.tsx` — 9
- `app/layout.tsx` — 9
- `app/(main)/page.tsx` — 8
- `features/games/game-player.tsx` — 2
- `app/(main)/games/[slug]/page.tsx` — 4
- Theme CSS, navigation, profile XP, and control helpers must also be reconciled.

These are **potential overlapping edits**, not verified conflicts.

## Safe integration gates

- [ ] Capture the exact main commit and validate a clean baseline.
- [ ] Merge available patches **manually by feature**, deduplicating changes to shared files.
- [ ] Verify each of the 100 ideas: integrated, partially integrated, pre-existing, or deferred.
- [ ] Wire up opt-in milestone confetti, avatar XP ring, and version-gated What's New to real server data.
- [ ] Run package install, lint, TypeScript and full Next.js build from this branch.
- [ ] Test desktop, touch/mobile, keyboard focus, reduced motion, theme access and gameplay flows.
- [ ] Review database migration requirements; no migration is applied just by merging this branch.
- [ ] Obtain a successful Vercel preview and perform smoke tests before promoting to production.
- [ ] Check open PRs for overlap; do not automatically merge, close, or rebase them.
- [ ] Publish only after all required checks pass; prepare a rollback path.

## Existing PRs to preserve

- #76 — Slithery migration (database validation outstanding).
- #78 — draft game engine SDK foundation (not production ready).
- #79 — draft repository and migration safeguards.
- #80 — bot dependency updates.

## Limitations

The complete repository was not available for a combined local build in the patch-generation environment. The local patch packages are **not automatically deployed by this branch**. Vercel project access was denied with HTTP 403 for team `blobbys-projects-8a89090d` during the release attempt.

The branch exists to integrate and verify changes without risking the live site. Do **not** merge it into `main` based on this document alone.
