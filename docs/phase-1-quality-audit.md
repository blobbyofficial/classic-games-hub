# Phase 1 — Product, visual and engineering audit

**Date:** 16 October 2026  
**Scope:** Read-only examination of the current `main` source and publicly retrievable URLs. No redesign, refactor, database update or runtime change was performed.  
**Evidence standard:** **Confirmed source behaviour** means directly visible in named files; **design assessment** is an opinion to validate with people/screenshots; **requires runtime verification** has not been proven by operating the application.

## Executive decision

The site already has meaningful engineering structure, a central visual-token system, accessibility-minded details and substantial real features. Its greatest quality risks are **an inconsistent product identity**, overused dashboard patterns, claims that disagree with game availability, old gameplay lifecycle constraints, and operational uncertainty. Do **not** rewrite the entire application or strip established components for cosmetic reasons. Give the arcade a deliberate art direction and validate work by user journey.

## Evidence boundary and critical question

The public URL `https://classic-games-hub.blobbyofficial.com/` returned an indexed/cached page titled **Classic Games Hub | Static Retro Arcade** describing a **22-game static edition** and a static brochure-like product. The current `main` repo instead implements **Next.js 16 + React + Supabase**, an authenticated community platform, and a 26-engine rebuild. Requests to `/games`, `/status`, and `/roadmap` were not retrievable through the available public inspection tool. **This is not enough evidence to conclude what the currently deployed site looks like or whether the origin is misconfigured.** Before Phase 2, obtain a fresh direct browser inspection, screenshot at desktop/tablet/mobile widths, response headers and deployed commit SHA. Investigate whether the public hostname points to a separate static edition, the retrieval index is stale, or the production deployment differs from the repository.

This document is a **source-grounded Phase 1 audit**, not a completed visual screenshot audit or validated production UX test. Those require a browser/device session and live authenticated test accounts. Never portray source-only reviews as measured Lighthouse scores or user tests.

## Findings, sorted by severity

| ID | Severity | Evidence | Observation and impact | Recommendation |
| --- | --- | --- | --- | --- |
| P1-01 | **Critical — verification** | Public hostname response; `app/(main)/page.tsx`; `package.json` | Publicly retrievable static-edition copy and Next.js source describe materially different products. May be stale content; current deployment unverified. | Establish production SHA, origin, public routes and current screenshots before design decisions. |
| P1-02 | **High** | `app/(main)/page.tsx`, `app/(main)/games/page.tsx` | Homepage metadata promises “Play 26 Classic Games Free”; the catalogue uses `getPublishedGames()` and the rebuild marks engines `in_development`. The exact currently playable count is unknown. | Generate messaging from verified available games; differentiate playable, staff preview and in-development. |
| P1-03 | **High** | `lib/games/helpers.ts` `createLoop` | The callback queues `requestAnimationFrame(frame)` **before** checking `running`; pausing prevents updating/rendering but keeps requesting frames. | Cancel animation scheduling on pause, restart on resume, test teardown and visibility handling. |
| P1-04 | **High** | `types/index.ts`, `lib/games/helpers.ts` | Engine interface only exposes `pause/resume/restart/destroy` and optional `applyRemoteMove`; lacks standard resize, input dispatch, state snapshots and lifecycle events. | Define an adapter-compatible next-generation engine protocol; do not migrate every game at once. |
| P1-05 | **High — runtime verification** | `app/(main)/status/page.tsx`, `docs/cron-jobs.md`, migration `0075_scheduled_jobs.sql` | The status screen needs scheduled sample data, which code alone does not prove exists. Unknown uptime can undermine trust. | Verify pg_cron/Vault secret/recording and explicitly show last successful sample and unknown status. |
| P1-06 | **High — audit** | `app/(main)/roadmap/page.tsx`, `lib/roadmap.ts` | An enabled `roadmap_override` can replace built-in release data. Source edits do not necessarily match the rendered roadmap. | Make effective source obvious in admin UI, schema-validate overrides, warn on drift, test. |
| P1-07 | **Medium** | `styles/globals.css`, `components/ui/button.tsx`, `components/page-header.tsx`, `components/section-header.tsx` | Repeated tinted icon tile + rounded box + muted subtitle, gradient hero, glass/gradient button variants, many rounded surfaces. Individually defensible, but overuse risks a standard SaaS-template appearance. **Design assessment, not a defect.** | Audit real screenshot frequency; distinguish arcade artwork, utility surfaces and editorial layouts. |
| P1-08 | **Medium** | `app/(main)/page.tsx`, `components/games/game-card.tsx` | Homepage is driven by featured/recent/category/all-games/leaderboard cards; thumbnail cards use a common gradient-overlay composition. Useful functionality, but the game identities may compete with a repetitive grid. | Create intentional hero/featured compositions, art direction for each game, and one cohesive discovery hierarchy. |
| P1-09 | **Medium** | `app/(main)/layout.tsx` | Global layout performs multiple asynchronous reads even for navigation; most are parallel after session fetch. Possible first-navigation latency is unmeasured. | Profile RSC waterfall, cache strategy, streaming fallback and signed-out path; don't assume performance regression. |
| P1-10 | **Medium** | `components/section-header.tsx` | “View all” link text is hidden on mobile while only an ArrowRight icon remains. Destination is not self-describing to some users. | Supply an accessible link name and evaluate whether small screens can retain short textual action labels. |
| P1-11 | **Medium** | `features/games/games-library.tsx` | Category filters are buttons with `role=tab` inside `tablist`, but no visible arrow-key tab keyboard handling/roving tabindex. This is a possible ARIA-pattern mismatch; native button activation works. | Either implement the full tabs keyboard contract or remove tab roles and express a filter button group. |
| P1-12 | **Medium** | `features/status/report-chart.tsx` | Report chart offers mouse-hover details while the visual bars are `aria-hidden`; there is an aggregate accessible label but no keyboard access to bucket-specific values. | Provide focusable bucket navigation or a compact accessible summary/table option; test real screen readers. |
| P1-13 | **Medium** | `styles/globals.css`, `lib/games/helpers.ts` `palette` | Site palettes use theme-derived OKLCH tokens, while game helpers still hardcode a purple/pink/cyan/gold palette. This may create a mismatch between an individual game and the selected site theme. | Define game artwork palettes intentionally, with contrast and theme compatibility rules, rather than automatically mapping every game colour to CSS theme. |
| P1-14 | **Medium** | `app/(main)/page.tsx`, `app/(main)/games/page.tsx` | Copy such as “Your arcade, reimagined”, “timeless games”, “and counting”, “Every classic, one click away” is generic and can conflict with rebuild locks. | Rewrite around actual user tasks and observable features; test concise variants. |
| P1-15 | **Medium** | `package.json`, `lib/update-log.ts`, README | Package advertises v2.0.0/22 playable; public release ledger documents v1.5.x and roadmap anticipates v1.6–v1.9. | Reconcile release metadata in docs/tooling separately from visual changes. |
| P1-16 | **Medium** | `package.json`; `.github/workflows/ci.yml` in prior review | Project scripts include lint/typecheck/build but not automated test command. Visual refactors risk regressions. | Establish baseline browser, component, accessibility and game-engine tests before substantial page replacements. |
| P1-17 | **Low — preserve** | `app/(main)/layout.tsx`, `features/games/games-library.tsx`, `components/games/game-card.tsx` | Existing skip link, `aria-live` game count, labelled search, search reset, image loading strategy, motion-safe hover and reduced-motion efforts are valuable. | Protect these during redesign instead of stripping them for simpler markup. |
| P1-18 | **Low — preserve** | `styles/globals.css` | Existing OKLCH light/dark colours, multiple site-theme presets, custom easing and reduced-motion handling represent a reusable foundation. | Simplify unnecessary visual variants after visual inventory; preserve theme compatibility and contrast. |

## Surface-by-surface design and UX review

| Surface | Source location | Strength | Audit concern | Next inspection |
| --- | --- | --- | --- | --- |
| Homepage | `app/(main)/page.tsx` | Server-oriented content sections; admin-controlled section ordering; featured and recent discovery | Familiar gradient hero + dashboard content rail; claims overstate availability | Capture signed-out and signed-in, mobile and desktop; observe click hierarchy |
| Game catalogue | `app/(main)/games/page.tsx`, `features/games/games-library.tsx` | Search, sort, favourites, category chips and meaningful empty state | Filter semantics; default grids lack strong editorial hierarchy | Keyboard and narrow mobile tests; disabled/in-development states |
| Game cards | `components/games/game-card.tsx` | Optimized thumbnails, stable statuses and fav button | Repeated gradient-image overlay on all games | Distinct artwork, hierarchy, colour/contrast and locked-state testing |
| Game runtime | `types/index.ts`, `lib/games/helpers.ts` | Single factory contract; fixed time step; reduced-motion context | Lifecycle too thin; paused RAF still schedules | Run-game, background tab, resize, touch/orientation, destruction |
| Status | `app/(main)/status/page.tsx`, `features/status/*` | Strong error message when database unavailable; well-structured public incident/report panels | Missing data and hover-only chart details; can be too dashboard-like | Verify cron samples and degraded/unknown mobile screen states |
| Roadmap | `app/(main)/roadmap/page.tsx`, `lib/roadmap.ts` | Grouped releases and clear “not a promise” messaging | Very long plan, repeated card hierarchy, override drift | Test findability of active release and reading on phones |
| Site shell | `app/(main)/layout.tsx`, `components/shell/*` | Skip link, nav groups, sticky context, mobile nav | Persistent chrome plus feature banners may overwhelm game focus | Review pages with multiple banners and modal nav states |
| Accounts/profile | `features/auth/*`, `features/settings/*` and profile routes | Real Supabase/MFA foundations | No screenshot or complete authenticated journey verified in this audit | Log in/out, MFA, error/reset flows, profile settings and mobile forms |
| Social/parties | `features/social/*`, `features/party/*` | Integrated chat and party capability in source | Cross-device realtime and edge cases not tested | Two-user setup; invitations, disconnections, blocked users, keyboard |
| Shop/economy | `features/economy/*`, `actions/economy.ts` | Transaction/RPC-oriented architecture | UX of affordability, loading, failures and reward honesty untested | Purchase confirmation, duplicate submission, errors, offline path |
| Admin | `features/admin/*`, admin routes | Centralised control surfaces | Configuration complexity could conceal source/default behaviour | Role-gated admin walkthrough and rollback behaviour |

## Visual-system inventory

- **Colour:** `styles/globals.css` defines light/dark OKLCH surfaces, semantic state colours and site-theme presets. Existing palette is broad, with multiple animated premium themes.
- **Typography:** global `--font-sans` and `--font-mono` use Geist; utility classes for `text-display`, `text-title` create a scale. Direction should add arcade-specific identity and a deliberately chosen editorial type hierarchy, not randomly introduce fonts per page.
- **Shape:** base radius 0.875rem; repeated rounded-xl/2xl/3xl shells. Differentiate cabinet art, dense functional tables and editorial feature blocks.
- **Depth/effects:** multiple brand-tinted shadow tokens plus glass, gradients, aurora and hover lift. Apply effects sparingly according to purpose, not to every card.
- **Icons:** lucide-react provides consistent functionality but universal icon badges make unrelated pages feel assembled from templates. Reserve icon tiles for navigation/utility and introduce original game motifs for identity.
- **Motion:** CSS themes and motion-safe interactions exist; avoid removing reduced-motion guards. Standardize duration, feedback, interruption and accessibility rather than making everything move.
- **Media:** game card thumbnails are a major visual opportunity. Establish a recognisable illustration/art system with distinct games rather than repeated decorative abstraction.

## Proposed Phase 2 direction tests (not yet approved)

1. **Editorial arcade:** strong type hierarchy, large meaningful game art, restrained black/neutral surfaces and one purposeful accent.
2. **Cabinet library:** game imagery behaves like a curated shelf of arcade cabinets; play action takes priority over stats.
3. **Utility clarity:** accounts, status, moderation and settings remain dense, accessible functional layouts rather than being forced into decorative arcade compositions.

Compare these on homepage, catalogue, game-detail, account and status screens, across mobile and desktop; choose a single coherent system rather than three independent redesigns.

## Acceptance measures and user journeys

| Journey | Must be validated | Proposed success criterion |
| --- | --- | --- |
| Visitor → choose game | Game status and clear play action | No unavailable game presented as immediately playable |
| Player → start/restart/pause | Input/resize and state | No lost or doubled frames/input handlers during pause/restart |
| Signed-out → create account | Forms, auth errors, mobile | Understandable recovery, no inaccessible controls |
| Player → favourite/search/filter | Keyboard and mobile chips | Fully operable with keyboard and labelled controls |
| Player → buy cosmetics | Confirmation, errors, back-navigation | No duplicate purchase or ambiguous balance |
| Two players → party | Invitations, latency, reconnect | Explicitly handled desync and opponent exit |
| Visitor → read status | Unknown, degraded, maintenance | Never reports no-samples as healthy uptime |
| Admin → configure roadmap | Override editing | Can see exact active source and revert safely |

## What Phase 1 has NOT established

- No current screenshot inventory, visual pixel comparison, live authenticated test, real user observation, Lighthouse/Web Vitals measurement, automated axe audit, or successful local build was available in this pass.
- Specific issues not demonstrated by runtime tests are **investigation items**, not proof of exploit or broken production behaviour.
- The public static page might be a historical cached snapshot; do not infer a hosting incident without fresh deployment evidence.
- A complete file-by-file review of the entire repository and every game engine is not represented by the targeted source sample. Phase 2 implementation should include engine-by-engine acceptance cases and a broader programmatic source inventory.

## Execution order

1. Verify actual deployed origin, production SHA and current desktop/mobile screenshots; **block aesthetic decisions until verified**.
2. Inventory all screens, record page taxonomy and capture current UI states (signed in/out, empty/loading/error, mobile/desktop).
3. Prototype visual directions on representative pages and obtain approval.
4. Fix shared behaviour and semantics on targeted components before large reskins, protected by tests.
5. Implement in small branches with benchmark, accessibility and regression evidence; avoid blanket rewrites.

**Status:** Phase 1 source audit and report delivered. Live visual/browser validation remains explicitly outstanding, so it would be inaccurate to call the full end-to-end visual audit completed.
