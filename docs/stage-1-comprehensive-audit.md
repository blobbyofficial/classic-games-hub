# Stage 1 — Comprehensive design, code and experience audit

**Audit date:** 17 October 2026  
**Target:** `blobbyofficial/classic-games-hub` (main source; quality PR #49 contains some fixes)  
**Stage:** Audit only, **not** design implementation.  
**Audit scope result:** Source architecture, page families, game framework, actions, quality gates and operations reviewed; **live browser screenshots, mobile device testing, authenticated flows, database state and production deployment have not been verified**. Do not interpret the scope review as a green production-health report.

## Bottom line

The architecture has substantial implementation depth and several good accessibility/performance patterns, but presentation relies heavily on the same accent/icon/card/gradient motifs across unrelated tasks. There are some confirmed source issues (for example, the original paused-loop RAF scheduling; incomplete category tab semantics; misleading unavailable-game cues) and some major unverified operational conditions. “Vibecoded” is a subjective impression, not an engineering defect category; the aim is coherent product decisions, truthful states and demonstrably robust behaviour.

## Evidence register and coverage

### Public route family inventory

The source index was examined through GitHub file search and targeted file reads. The existence of a route **does not** mean its behaviour was tested in production.

| Family | Representative routes | Source evidence and review |
| --- | --- | --- |
| Global shell | `app/layout.tsx`, `app/(main)/layout.tsx`, `app/(auth)/layout.tsx`, `app/not-found.tsx`, error/loading boundaries | Global fonts/themes, session, banners, skip navigation, mobile nav and fallback states |
| Discovery | `/`, `/games`, `/games/[slug]` | Home sections, library filtering, status-sensitive cards, lazy play engine |
| Accounts | `/login`, `/register`, `/welcome`, `/two-factor`, reset flows | Auth route presence and Supabase-based account architecture; runtime auth not tested |
| Social | `/friends`, `/messages`, `/messages/[id]`, `/party`, `/invite/[code]`, `/u/[username]` | Permission-gated server pages, invitation/party code structure, social/actions |
| Progression | `/leaderboards`, `/achievements`, `/challenges`, `/collections` | Page composition, data/read paths, client score trust boundary |
| Economy | `/shop`, `/shop/[slug]`, `/inventory`, `/settings` | Server action/RPC split, purchase/error and cosmetic journeys need live validation |
| Administration | `/admin`, `/admin/users`, `/admin/games`, `/admin/site`, `/admin/flags`, `/admin/reports`, `/admin/analytics`, `/admin/discord`, `/admin/status`, `/admin/audit`, `/admin/announcements`, `/admin/events` | Role-based layouts and dashboard pages exist; role/account matrix not tested |
| Trust and documentation | `/status`, `/roadmap`, `/updates`, legal pages | Monitoring dependencies, admin override, release/version discrepancies, dense timeline layouts |
| Public API and jobs | `/api/status/*`, `/api/cron/*`, Discord interactions | Probe implementation, schedules, secrets, failure states exist; cannot infer real cron health |

### Concrete files inspected beyond earlier Phase 1

- UI source: `app/(main)/games/[slug]/page.tsx` (~290 lines); `features/games/game-player.tsx` (~431); `app/(main)/u/[username]/page.tsx` (~421); `app/(main)/updates/page.tsx` (~452); `app/(main)/leaderboards/page.tsx` (~170); `app/(main)/status/page.tsx` (~181); `app/(main)/roadmap/page.tsx` (~235).
- Route families: login, register, friends, party, shop, settings, admin, messages, inventory, achievements, leaderboards, game details and user profiles.
- Services and actions: `actions/games.ts`, `actions/economy.ts`, `actions/social.ts`, `actions/auth.ts`, `actions/parties.ts`, `app/api/cron/status-probe/route.ts`.
- Engine system: `lib/games/registry.ts`, `lib/games/helpers.ts`, `types/index.ts` and code search across engine files.
- UI foundation: `styles/globals.css`, `components/page-header.tsx`, `components/section-header.tsx`, `components/games/game-card.tsx`, `components/games/game-grid.tsx`, `features/games/games-library.tsx`, `features/status/report-chart.tsx`.
- Build/operations: `package.json`, `.github/workflows/ci.yml`, `proxy.ts`, `next.config.ts`, `docs/cron-jobs.md`, migrations and public update/roadmap ledgers.

GitHub text search also found **more than 40** page/default-route modules, multiple auth/administration screens, and **15 matches** for `createLoop(` including helper/docs/engines. Search returned **no literal TODO/FIXME files**; absence of markers is **not** evidence that a feature is complete. Many catch blocks exist; each must be reviewed for whether silent failure is intentional, rather than classifying all as broken.

### Audit categories and risk conclusions

| Area | Verdict | Evidence | Next acceptance gate |
| --- | --- | --- | --- |
| Information architecture | Broad and functional but dashboard-heavy | Main navigation and many specialised page modules | Test prioritised user tasks and click depth |
| Visual coherence | Consistent tokens but generic repeated compositions | Theme OKLCH tokens; rounded boxes/icon tiles/aurora/glass | Screenshot comparison before/after for each page family |
| Accessibility | Strong existing effort; specific semantic gaps | Skip link, reduced motion, labelled controls, chart buckets, filter roles | Automated + keyboard + real screen-reader audit |
| Mobile/responsiveness | Responsive CSS and mobile navigation exist | Layout, card grid, mobile bottom padding, filters | 360/390/768px devices, zoom/reflow |
| Games | Significant engine code; original lifecycle contract thin | Registry, GameEngineHandle, RAF helper, GamePlayer | All engines: pause/resume/stop/resize/touch/background tab |
| Economy and scores | Server actions/RPCs; score authenticity not proven | `actions/games.ts`, SQL reward path | Database integration and malicious-input tests |
| Social/multiplayer | Source supports friends/chat/parties | Page routes and actions | Two-user reconnect, privacy, blocked users and membership tests |
| Performance | Some intentional optimisations present | Optimised images, code splitting, Promise.all, reduced blur | Actual LCP/INP/CLS, bundle and frame-time measurements |
| Monitoring | Rich UI and SQL migration, no live operational verification | Status page, probe route, scheduled jobs migration | Verify deployed environment, last probe and recorded samples |
| Documentation | Release ledger broad but conflicting metadata | package version vs public ledger, previous README | Reconcile version and counts with deploy SHA |
| Automated quality | CI lint/types/build plus added loop test on PR #49 | CI workflow, package scripts, test file | Confirm passed CI and expand unit/integration/browser suites |
| Security | Layered mechanisms but no penetration test | Auth middleware, CSP report-only, Zod and RLS | RLS/grants audit and CI regression matrix |

## Findings: priority register

**Confirmed source findings (do not imply browser reproduction):**
1. **P1** Shared game-loop scheduling used RAF even while paused (original `lib/games/helpers.ts`); PR #49 changes it. Verify after merge and test all consumers.
2. **P1** GameEngineHandle does not standardise resize, state persistence or input; migration should be backwards-compatible (`types/index.ts`).
3. **P1** Static SEO metadata previously promised 26 instantly playable classics during a staged rebuild (`app/(main)/page.tsx`); PR #49 revises it, deployment pending.
4. **P2** `GamesLibrary` used tab roles without implemented roving focus and keyboard arrows; PR #49 changes it to a button group.
5. **P2** SectionHeader hid its link text on mobile; PR #49 restores it.
6. **P2** GameCard originally disabled navigation on Coming Soon entries and rendered a generic play cue on in-development games; PR #49 adjusts card affordances.
7. **P2** Status chart offered only aggregate screen-reader information; PR #49 adds textual per-bucket report table.
8. **P2** Distinctive game artwork competes with repeated card shadows, gradients, universal icon tiles and glass affordances (`styles/globals.css`, core components).
9. **P2** The roadmap supports a runtime `roadmap_override` so source roadmap isn't always effective content (`app/(main)/roadmap/page.tsx`).
10. **P2** Themeable site palettes and fixed game helper accent colours can diverge (`lib/games/helpers.ts`).
11. **P2** Current package version `2.0.0` and public 1.x release ledger disagree; package description count is stale.
12. **P2** Existing scripts do not provide a comprehensive suite of unit, database integration, accessibility and E2E checks. PR #49 adds only a small RAF test.
13. **P3** Homepage marketing copy used phrases such as “reimagined” and “timeless” without explaining availability; partially revised in PR #49.
14. **P3** Large roadmap and update screens use repeated nested release cards; clearer release-level navigation should be tested rather than guessed.

**Requires production/device verification:**
15. **P1** Public web retrieval currently returns a **six-month-old cached static edition** at the expected hostname, while Next.js repo is a different platform. This **does not establish an ongoing deployment mismatch**. Confirm the current Vercel production SHA and direct screenshots.
16. **P1** Actual `pg_cron` execution, Vault secret and status samples cannot be inferred from migration `0075`; check production logs.
17. **P1** Whether the score and multiplayer boundaries are exploitable is not determined by the presence of client-supplied scores; verify with policy/RPC tests.
18. **P2** Browser-performance and accessibility metrics cannot be assigned from code. Capture performance traces and real screen-reader/device reports.

## Journey-by-journey test inventory

| Journey | States/screens to capture | Tests required |
| --- | --- | --- |
| Anonymous visitor | Home, search, categories, game detail, locked vs playable | Mobile, keyboard, link accuracy, screenshots |
| Registered player | Resume, profile, score, achievements, leaderboard | Auth expiry, duplicated interactions, network failure |
| Authentication | Login, register, reset, MFA and recovery | Validation, focus, errors, session and redirect handling |
| Social | Friend requests, groups, messages, party, invites | Two simultaneous accounts, reconnect, blocked/privacy |
| Economy | Shop, inventory, gifting, reward and purchase | Concurrency, insufficient credits, duplicate action |
| Moderation/admin | Access-denied states, reporting, flags, status overrides | Role/permission matrix, admin rollback and audit trail |
| Operations | Status, roadmap, updates | Stale/unknown data, maintenance, override display, metadata |

Recommended screenshot baseline: **360, 390, 768, 1024 and 1440 px** in both light and dark, plus keyboard focus, loading, empty, error, and authenticated states. This is a **test specification, not a claim of screenshots taken**.

## Evidence to mark Stage 1 fully complete

- [x] Repository architecture and major feature families enumerated
- [x] Representative source files reviewed across UI, routes, engine, server actions, security and operations
- [x] Visual design patterns and identity weaknesses catalogued
- [x] Issues prioritised by severity with evidence paths
- [x] Accessibility and interaction risks catalogued
- [x] Existing positive engineering patterns recognised
- [x] Prioritised downstream work and ownership by phase described
- [ ] **Fresh production screenshots** verified against the deployed commit; cached public result does not qualify
- [ ] **Authenticated, staff and two-user browser testing** conducted with real accounts
- [ ] **Mobile viewport and screen-reader walk-throughs** performed
- [ ] **Lighthouse/Core Web Vitals/frame-time baseline** recorded from actual current deployment
- [ ] **Production environment**, database cron and monitoring data inspected
- [ ] **Full programmatic whole-tree inventory** reconciled with the targeted source sampling

**Closure verdict:** This is a substantial **source-backed comprehensive audit document**, not a 100%-verified full live design/code audit. Do not change the stage tracker to 100% until the remaining evidence exists. A closed source review and an open runtime verification gate can be managed separately.

## Next action

First confirm which version of the product is actually deployed and capture screenshots. Then run the defined cross-role/device matrix. Move confirmed defects into the implementation PR; keep the audit distinct from redesign work. Do not resolve findings solely by changing tracker percentages.
