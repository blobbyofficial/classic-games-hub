# Quality overhaul — implementation and verification register

**17 October 2026.** This branch contains a **first, limited code slice**. It does not implement the complete eight-stage overhaul. Never interpret a percentage from a planning audit as tests passed or work shipped.

## Confirmed source changes in this branch

| Area | Files | Expected effect | Needs verification |
| --- | --- | --- | --- |
| Game lifecycle | `lib/games/helpers.ts` | Stop scheduling RAF frames while paused; idempotent pause/resume/stop; prevent stopped loop restarting | Run all engines using the helper; hidden-tab behaviour, unmount cleanup, duplicated loop tests |
| Navigation | `components/section-header.tsx`, `components/page-header.tsx` | Show link labels on mobile; remove repeated coloured icon backgrounds | Visual comparison at 360/390/768/1440px, contrast, focus states |
| Game filtering | `features/games/games-library.tsx` | Accessible toggle-button semantics instead of incomplete tab roles | Keyboard + screen reader testing; filter announce and scrolling |
| Marketing accuracy | `app/(main)/page.tsx`, `app/(main)/games/page.tsx` | Remove guaranteed 26-playable language and reduce vague hype | SEO and copy review; live game-state verification |
| Status accessibility | `features/status/report-chart.tsx` | Provide an expandable readable table for all time buckets | Keyboard and screen reader; large report history on mobile |

## Second implementation pass — 17 October 2026

- `components/games/game-card.tsx`: "Coming soon" cards now remain navigable to their information page (instead of a pointer-disabled, unfocusable link); in-development games no longer show the generic hover play overlay. Availability remains enforced by the game route; this is not a new access-control check.
- `components/empty-state.tsx`: replaces the repeated dashed/tinted-icon template with a calmer bordered utility treatment.
- `features/games/games-library.tsx`: unknown URL categories fall back to All, category buttons carry explicit types, and Clear search has a more usable touch/focus target.
- `scripts/test-game-loop.cjs`: executes the actual TypeScript game-loop helper in a deterministic animation-frame harness. Checks initial scheduling, ticking, pause, idempotent resume, stopping and prevention of restart after stop.
- `.github/workflows/ci.yml`: adds that regression check to the site CI job after TypeScript typecheck.

**Verification status:** Commits are recorded on this branch; CI execution and browser validation have not been confirmed. A test existing is not evidence that it passed.

## Third implementation pass — 17 October 2026

- `components/games/game-card.tsx`: adds explicit accessible names describing current access/status, strengthens keyboard focus visibility, and ensures featured/early-access badges do not visually compete with the primary in-development state.
- `features/games/games-library.tsx`: normalises whitespace in search and tolerates missing tag arrays, with other filters unchanged.
- These are source-verified code changes only. Browser testing, build output, accessibility audits and deployment checks remain pending.

## Remaining work by stage

1. **Audit:** Capture real deployed screenshot/device baseline and inventory all route states. Production origin/commit SHA must be confirmed.
2. **Identity:** Review and approve actual Figma/mockups, art style, tokens, contrast and light/dark typography. See previous Phase 2 specification.
3. **User journeys:** Implement complete homepage → games → player, then account, social, shop, status, roadmap and admin flows with screenshots and acceptance tests.
4. **Games:** Upgrade lifecycle contracts and independently review/illustrate every intended engine; verify touch, keyboard, score, resize and pause.
5. **Engineering:** Establish tests, investigate duplication and dependency use before deletion, profile performance and simplify actual bottlenecks.
6. **Copy:** Inventory all interface strings; write and test contextual empty/error/locked/auth states. This branch changes only a few.
7. **Testing:** Add CI-enforced unit/integration/browser tests, visual regression, axe, Lighthouse/Web Vitals budgets and manual device matrix. Build not run in this environment.
8. **Governance:** Establish documented component decisions, quality-review ownership and release gates; update documentation in the documentation PR.

## Safety gates before merge

- [ ] `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build` pass on PR.
- [ ] Test `createLoop` RAF count with fake animation frames: no callback after pause or stop, exactly one schedule after resume, no resume after stop.
- [ ] Test actual game restart, pause from UI, page navigation and reduced motion.
- [ ] Check game library keyboard focus and toggled state with a screen reader.
- [ ] Test table accessibility and long scroll on the status page.
- [ ] Review accuracy of all new copy against actual availability.
- [ ] Capture desktop/mobile before/after screenshots.
- [ ] Preserve all game-engine and public database behaviour; roll back if a regression appears.

No stage is honestly at **100%** until its documented exit criteria have evidence, reviews and successful checks.
