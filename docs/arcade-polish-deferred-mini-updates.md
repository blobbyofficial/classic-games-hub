# Arcade Polish — deferred mini-update roadmap

**Status:** planned candidates, not shipped. **Last reviewed:** 31 October 2026.

The original 100-idea exploration generated isolated patches that were not all merged. PR #84 shipped a narrower set of games-library, homepage and accessibility changes. A patch bundle's existence is not evidence that the corresponding feature is integrated, tested or live.

## Where it lives

The public site's `/roadmap` page reads `lib/roadmap.ts`. Its new **Arcade Polish — follow-up minis** section intentionally has no release number or date yet. This avoids occupying existing v1.6.2 Puzzle Reborn and v1.6.3 Sharp Shooters commitments, or confusing Arcade Polish with the Arcade Reborn engine architecture project.

## Suggested order

### Mini A — Discovery and quick play (highest priority)
- Controls preview before launch (original idea #48).
- Related-games recommendation quality (#81).
- Accessible game-card quick actions (#90).
- Better homepage featured spotlight (#93), optionally daily tips (#53).

Acceptance: keyboard-only + mobile use, accessible link/button structures, no inaccessible game recommended, responsive layout, successful Next.js build.

### Mini B — Player feedback and usability
- Improved loading and error recovery (#55, #79).
- Touch controls and device orientation guidance (#84, #87).
- Sound preferences and instructional keycaps (#92, #94).
- Opt-in avatar XP ring (#78), personal best feedback (#91) and milestone confetti (#77), with **server-confirmed** progress only.

Acceptance: no server score/XP trust changes, reduced-motion support, auth and anonymous states, mobile gameplay regression.

### Mini C — Theme, performance and release quality
- Navigation transitions, focus indicators and theme swatches (#75, #76, #80).
- Phone/low-end responsiveness and performance measurements (#61–#70).
- Automated screenshots, release checklist, accessibility checks and asset/dependency verification (#56–#60, #98–#99).

Acceptance: real measurements rather than cosmetic scorecards; test theme entitlements, touch, trackpad, screen readers and keyboard.

## What is already included in PR #84

Recently viewed strip (#83), title search highlights (#89), empty-state recovery (#82), progressively displayed library cards (#63), back to top (#88), category-aware Surprise Me (#86), keyboard search shortcuts, homepage signature (#100), version-gated What's New (#97), and footer/mobile accessibility corrections.

## Backlog rules

1. Before each new mini release, inspect the current `main` implementation and the relevant original patch packages. Some ideas may already exist or conflict.
2. Each item must be explicitly assigned **shipped / already exists / deferred / dropped**. Do not claim 100 completed.
3. Work on short-lived branches and small PRs; don't alter existing Arcade Reborn, database or other open PR branches.
4. UI-only updates should not require Supabase SQL. If a feature does require new SQL, review it and its migration number against the actual latest migration before asking anyone to run it.
5. Require CI/typecheck, browser/mobile/a11y checks and a preview before merging.

## Scope note

This is a **prioritised plan**, not an exhaustive item-by-item accounting of all 100 ideas. A complete audit of the remaining packages and production code is still outstanding. Older docs under `docs/arcade-polish-*` describe earlier test/integration snapshots, not today's release readiness.
