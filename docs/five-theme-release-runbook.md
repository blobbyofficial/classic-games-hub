# Single five-theme release runbook

PR: https://github.com/blobbyofficial/classic-games-hub/pull/74
Status: Implementation committed; production release and full browser QA unverified.

## Available themes and access
- Basic: free, light/dark/system.
- Halloween: seasonal, light/dark/system.
- Velvet Red: free, one fixed colour-mode independent appearance.
- Premium Atelier: active Discord booster or staff only, light/dark/system.
- Retro Insert Coin: level 25 permanent achievement, light/dark/system.

## Single-release checklist
1. Back up production Supabase. Confirm applied migrations and compare schema with migrations on this PR branch.
2. Coordinate earlier Halloween PR #73 before merging this branch. Resolve conflicts against main and run build, type check, lint, and all theme regression scripts.
3. Run unapplied database migrations in order: 0111, 0112, 0113, 0114. Apply only missing migrations using normal tracking. Deploy 0114 BEFORE deploying the frontend that exposes Premium/Retro. 0112 normalises retired settings to Basic.
4. Database testing: Level 24 denied Retro; Level 25 granted Retro; previously granted Retro persists after level changes; current booster eligible for Premium; nonbooster denied; removing booster status restores Basic; direct PostgREST writes denied; role and level columns protected.
5. Browser QA: Light/Dark/System all correct for Basic/Halloween/Premium/Retro; Red does not change colours with system mode; changing away restores preferred appearance. Test signed-out, save/reload, errors, mobile navigation, dialogs, keyboard focus, touch, game canvas, contrast and reduced motion.
6. Confirm Discord role-sync health, including both booster unlock and revocation. Existing entitlement source is profiles.booster_since; stale sync data may delay entitlement changes.
7. Resolve Vercel build-rate-limit blocker. Confirm preview build Ready, then merge PR #74 and verify production SHA and Ready status. A pending/failed Vercel build is not a release.
8. Monitor settings saves and sync logs in production before announcing. Have rollback plan.

## Technical safeguards
- New database migration 0114 introduces theme_unlocks with RLS and no client write policy, awards retro at Level 25 and backfills existing eligible users.
- check_site_theme database trigger validates active booster or permanent Retro reward even if the client is modified.
- SSR resolves my_theme_entitlements for restricted preferences and falls back to Basic when entitlement validation fails.
- Five-theme picker shows locked themes with explanation and blocks selection until server confirms eligibility.
- Staff preview eligibility follows existing role convention.

## Remaining validation
Build, production database migration, browser screenshots and QA have not been completed in this session. Vercel previously reported build-rate-limit failure. Do not merge to production without completing these checks.
