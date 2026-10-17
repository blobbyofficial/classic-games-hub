# Eight-stage quality overhaul — independent completion and dependency audit

**Audited:** 17 October 2026  
**Reference:** `main` source and existing docs on `docs/history-audit-2026-10`.  
**Intent:** Audit stages, not pretend that a written phase plan is a completed product redesign. **No implementation changes performed.**

## Executive verdict

**Stages 1 and 2 are documented but not fully verified; stages 3–8 have not been delivered as this overhaul.** There is a useful established platform under the visual patterns: avoid replacing functioning UI solely because it uses Radix, Tailwind, Lucide or common Next.js approaches.

**Gate before any visual rollout:** confirm the current deployed build, capture visual baselines and approve the chosen direction. **Gate before any code refactor:** establish tests and performance measurements. Move test-infrastructure work originally assigned to Stage 7 to an early cross-cutting stage.

### Audit scoreboard

| Stage | Status | Planning deliverable | Missing completion evidence |
|---|---|---|---|
| 1. Full design and code audit | **Partial** | [Phase 1 audit](phase-1-quality-audit.md): 18 issues with source references, surface inventory and proposed priorities | Verified live screenshots, full repository inventory, device/browser walkthroughs, accessibility/performance measurements, signed-in and two-user testing |
| 2. Establish distinctive design identity | **Specification written, not approved/validated** | [Phase 2 specification](phase-2-design-system.md): direction comparison, draft tokens, layout concepts, copy rules and component treatments | Actual design mockups at target widths, WCAG contrast measured against real surfaces, imagery examples for each game family, side-by-side current UI comparison, owner approval |
| 3. Rebuild important user journeys | **Not started** | Concept descriptions only | Implemented pages in branch, before/after comparisons, signed-out/in states, mobile/desktop testing, measurable reductions in friction |
| 4. Give games their own personality | **Not started within overhaul** | Shared game style principles | Per-game art specifications, controls and lifecycle tests, game-by-game implementation, accessibility and device acceptance |
| 5. Clean up engineering | **Not started within overhaul** | Audit targets identified | Dependency analysis, verified dead-code list, tests before refactors, smaller diffs, removed duplication backed by measurements |
| 6. Rewrite generic copy | **Guidelines drafted** | Example rewrites in Phase 2 spec | Full strings inventory, copy review, verified feature/status claims, accessibility review, implemented translations or content changes |
| 7. Polish and test behaviour | **Not started within overhaul** | Acceptance checklist proposed | Automated unit/integration/E2E suites, axe/keyboard/mobile testing, performance budgets and repeatable reports |
| 8. Maintain quality over time | **Foundational documentation only** | Documentation index and release-audit guidance | Enforced conventions, CI gates, ownership, design examples, review checklist and routine release verification |

Progress % values shown in chat are qualitative estimates for orientation, **not** results of a quantitative metric or test run.

## Critical sequencing corrections

1. **Move a baseline test harness and accessibility checks earlier**, before Stage 3. Stage 7 stays as end-to-end polish/verification, not the first introduction of tests.
2. **Split the existing Stage 1 completion gate:** source audit can be accepted independently, but live visual inspection, responsive screenshots and authenticated journey tests remain an explicit blocker to page redesign.
3. **Stage 2 is a decision gate, not an implementation gate.** It needs concrete mockups and owner approval. Raw colour hexes are hypotheses, not tested tokens.
4. **Stage 3 should deliver one vertical slice first**—homepage → browse → game page → play—and confirm it is better before touching unrelated settings, admin or social interfaces.
5. **Stage 4 depends on stable Stage 3 play shell and Stage 5 engine lifecycle foundation.** Standardise resize, pause, input, destroy and reduced-motion guarantees before customizing all engines.
6. **Stage 5 should be incremental and paired with tests.** Avoid a simultaneous whole-project rewrite that erases working behaviours and makes review impossible.
7. **Stage 6 should run alongside Stage 3 prototypes**, because visible words and navigation labels materially affect layout; a final editorial sweep still occurs after implementation.
8. **Stage 8 begins now as a governance task:** record decisions and acceptance criteria as work lands, while final enforcement follows the first validated slice.

## Evidence-grounded issues to resolve

| Finding | Source | Recommended owner/stage | Close criterion |
|---|---|---|---|
| Possibly misleading '26 playable' SEO/hero language during rebuild | `app/(main)/page.tsx`; `app/(main)/games/page.tsx` | 3 + 6 | Copy generated from real availability, indexed page and disabled states checked |
| Static-edition/public-source discrepancy identified in Stage 1 | [Phase 1](phase-1-quality-audit.md) | 1 gate | Deployment SHA and live route screenshots documented |
| Frame callback reschedules when paused | `lib/games/helpers.ts`, `createLoop` | 4 + 5 | No RAF while paused; resume and stop tested |
| Game lifecycle lacks standard resize/input/state contract | `types/index.ts` | 4 + 5 | Adapter-backed interface accepted in reference game, compatibility tests |
| Universal icon-title tile/cards and gradient treatment | `components/page-header.tsx`; `components/section-header.tsx`; `components/games/game-card.tsx`; `styles/globals.css` | 2 + 3 | Chosen page hierarchy and custom art demonstrated in representative screens |
| Category buttons use tablist/tab roles without demonstrated arrow-key support | `features/games/games-library.tsx` | 3 + 7 | Correct keyboard pattern validated |
| Chart detail interaction is hover-led | `features/status/report-chart.tsx` | 3 + 7 | Keyboard-accessible values or equivalent data table tested |
| Roadmap may use admin override instead of source `ROADMAP` | `app/(main)/roadmap/page.tsx` | 3 + 8 | Active content source and rollback visible; override validated |
| Current status history unknown even though cron scheduling exists in Git | `docs/cron-jobs.md`, `app/(main)/status/page.tsx` | 3 + 7 | Last sample + job health verified in actual database |
| No test script defined in package metadata | `package.json`; `.github/workflows/ci.yml` | Early shared gate + 7 | Unit/integration/e2e jobs and failure reports run on PRs |
| Package v2.0.0 conflicts with curated 1.x release sequence | `package.json`; `lib/update-log.ts` | 8 + docs | One documented source and reconciliation check |
| Repeated generic copy | `app/(main)/page.tsx`; `app/(main)/games/page.tsx` | 6 | Approved copy inventory and no false availability claims |

## Proposed re-ordered execution

**Foundation A — verify reality:** Confirm site origin and production SHA; collect desktop/mobile screenshots; document existing user flows and content statuses; record performance and accessibility baseline.

**Foundation B — prevent regressions:** Add representative unit tests, a database test environment, Playwright smoke tests for browse/play/login, an accessibility checklist, and a stable visual screenshot baseline.

**Stage 2 completion:** Produce actual homepage, catalogue, game player, profile and status mockups for dark/light and mobile/desktop; verify contrast; settle branding and visual principles. Seek approval *before* broad code changes.

**Stage 3 first slice:** Implement browse/play journey only and compare against baseline. If validated, migrate the remaining surfaces progressively.

**Stages 4–5 in paired increments:** Engine contract + one game's distinctive artwork/interaction + tests; repeat per family. Refactor only as required to make the next slice better.

**Stage 6 continuously:** Rewrite page/interaction copy as each journey lands; audit all other strings at the end.

**Stage 7 full verification:** Run device/browser matrix, keyboard/screen-reader checks, performance metrics, failure scenarios, and regression suites. Fix blockers before launch.

**Stage 8 enforcement:** CI rules, component usage examples, documentation, release-evidence checklist, maintenance owner and periodic audit cadence.

## Per-stage exit gates

**1. Audit complete only when:** Source coverage inventory + visual screenshots for public, authenticated, staff, empty/error/loading and mobile routes; an issues register with reproducible evidence; baseline measurements.

**2. Identity complete only when:** Approved direction, mockups on five representative page types, token/contrast verification, sample game art, typography and mobile variants, brand assets/usage rules.

**3. Journey complete only when:** The corresponding changes are implemented and tested, user tasks are shorter or clearer, errors and locked states are explicit, and no accessibility regression occurs.

**4. Game personality complete only when:** Each intended game is tracked individually, engine lifecycle works, distinct artwork feels intentional, game controls are accessible and the accepted game set is playable in expected environments.

**5. Engineering complete only when:** Unused code is demonstrably unused, tests pass, complexity and bundle/runtime metrics improve or hold, and no sensitive flow regresses.

**6. Copy complete only when:** Copy inventory is reviewed, implemented, factually accurate and accessible in every relevant state; no placeholder or outdated feature claim remains.

**7. Polish complete only when:** Testing outputs and known exceptions are documented, browser/device coverage exists, performance budgets met or deviations justified, and critical bugs are closed.

**8. Long-term standards complete only when:** A contributor can follow documented rules, CI enforces critical quality gates, future releases link to evidence, and deviations are visible.

## Preserve versus replace

**Preserve:** Existing Next.js/React/Supabase architecture where suitable, SQL permission boundaries, responsive layouts, skip link, reduced-motion implementation, shared token semantics, lazy game loading, protected MFA/recovery journeys and meaningful empty states.

**Evaluate and simplify:** Icon tile applied to every heading, unnecessary gradient/glass surface variants, oversized release cards, hidden mobile link labels, generic marketing copy and theme-to-canvas colour mismatch.

**Do not claim:** That an interface looks 'AI made' by objective test, that unusual UI equals poor engineering, that old commits are deployed, or that Stage 1/2 has passed runtime validation.

## Overall status and next approval

**Current maturity:** Two written planning/audit deliverables; zero implemented overhaul releases demonstrated. The recommended next action is to close the live-verification and visual-prototype gaps rather than immediately starting a site-wide redesign.

The aesthetic direction **editorial modern arcade** remains a recommendation, not a user-approved final design.
