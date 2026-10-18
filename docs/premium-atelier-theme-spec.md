# Premium UI — Atelier
Status: DESIGN SPECIFICATION ONLY; not implemented or unlockable.
Owner: Classic Games Hub. Proposed entitlement: active Discord server booster (plus authorised staff preview).
This document extends [site-theme-redesign-plan.md](./site-theme-redesign-plan.md), without exposing another theme in the app.

## Product intent
Premium is the standout *cosmetic* thank-you for supporting the Discord server. It should feel like a cohesive premium edition of the whole Hub, not a gold recolour of Basic or a performance-heavy animated wallpaper. Elegant, smooth, fast, accessible, mobile-first, distinct from both Basic and Halloween; no competitive advantages, credits/XP boosts or exclusive game power. No manipulative renewal prompts.

Working identity: **Atelier** (working name only). Creative pillars:
1. Crafted: a considered hierarchy and deliberate surfaces, immaculate spacing and typography, premium-quality design execution.
2. Tactile: fast, meaningful feedback to interactions (press, select, open, complete); motion never gates interaction.
3. Personal: premium identity for the player, coherent across site, their own selected light/dark/system mode, and cosmetic expression in their profile.
4. Responsive: great on a £100-class phone/Chromebook as well as high-refresh PCs; effects adapt without changing interaction outcomes.
5. Desirable: the standard Basic UI stays excellent, but Premium feels like an entirely different *experience*.

## Visual direction: Atelier Night and Atelier Day
Night:
- Page #0C1018, main surface #161D27, elevated surface #202937, input surface #252F3D.
- Primary ink #F5F1E9, secondary ink #B5BECA, subdued border #384455.
- Champagne accent #C9AB7D and muted secondary accent #E0CDAA, always checked for WCAG contrast. Do not use accent for dense paragraphs.
- Control states: raised and pressed surfaces; avoid glass/reflection on large scroll areas.
Day:
- Page #EEECE7, main surface #FAF9F6, elevated surface #FFFFFF, input #F1EFEA.
- Primary ink #252C36, secondary #525B66, borders #D3CEC4.
- Bronze accent #786044 for accessible text/border use; warmer #B19164 only as decorative foil when contrast allows.
Both:
- Max three levels of elevation. Surface depth comes from slight tone differences and selective restrained shadow, not continuous glow.
- Type: keep Geist for body, with deliberate weight/size/letter-spacing hierarchy; optional editorial display face only if licensed/available and it fits bundle budgets. No external runtime font requests beyond existing font workflow.
- Corners: ~12px controls, ~16px cards, ~20px hero panels; consistency over over-rounding.
- Detailed custom treatment for game covers, not unbounded gradients; use actual cover art.
- Chrome and cosmetics may have a tiny metallic edge; never add visible gold borders everywhere.
- All text contrast, status colours, focus rings and disabled states independently tested in both modes.

## Premium design surfaces
### Top navigation and command search
- Polished, slightly recessed compact nav; clean site mark, appropriately spaced icons, clear current-page state.
- Command search feels near-instant. When focused, present keyboard shortcuts, recent games, favourites, relevant results and a lightweight backdrop. Respect no-results and slow-network states.
- Header stays one row on narrow phones; don't increase height or steal game-stage space.
### Home
- Distinct editorial hero with measured typography and subtle border detail; fast visible actions: Continue Playing, Browse, Friends.
- Compact 'Your arcade' panel with recently played/favourites and genuinely useful progress. No inflated statistics or fabricated personalised numbers.
- Game discovery cards: precise thumbnails, hover/focus treatments, coherent states and tiny microinteraction, not all cards moving at once.
### Library and game detail
- Filters are responsive, clearly selected, keyboard accessible; no hover-only access.
- Hover gives a restrained lift only with fine pointers; on touch, use immediate pressed-state feedback.
- Player shell puts game performance first: no blur, animation, or elaborate borders over canvas; no theme-dependent resets of game runtime.
### Social, profile, achievements and collections
- Upgraded (but compatible) achievement and profile display: material depth, fine timeline and tasteful booster attribution when player chooses to show it.
- Friends and party interfaces prioritize clear availability, invite status and privacy, not ornamental effects.
- Notifications provide subtle spatial cues, not shaking or flashing.
### Settings and accessibility
- Premium tile has a preview with representative UI pieces, light and dark samples, locked explanation and eligibility status.
- Unlock acknowledgment once, after entitlement is confirmed; no repeated confetti or attention-grabbing banners.
- Reduced motion, high contrast and system preferences inherited; optional 'minimal effects' setting for eligible users.

## Interaction and motion system
- Simple CSS transitions first, transformed/opacity-only animation where possible.
- Press: 70–110ms with immediate visible state; release on pointer-up. No delayed touch interaction.
- Hover/focus: 100–150ms, always functional with keyboard and touch.
- Menu/dialog entry: 140–200ms; exit: 100–140ms; never hold focus or content hostage to animations.
- Navigational transitions: only where Next.js lifecycle allows an honest instant response; do not fake speed with artificial loaders. Preserve scroll/back behaviour.
- On success: discreet, short feedback with sound *off by default* unless player enables UI audio.
- Reduced-motion settings remove nonessential transforms/parallax and animated foil; state changes remain clear by colour, border, text and ARIA.
- Never animate box-shadow/filter/large blur effects in lists or during canvas gameplay; no perpetual gradients, particles or autoplay everywhere.
- Support keyboard focus, pointer, touch and gamepad separately; avoid hover-only or drag-only actions.

## Engineering boundaries
- Theme ID proposed: `premium`; catalogue metadata defines availability, mode support, rendering tokens, previews and eligibility. Do not add to selectable catalogue until complete.
- CSS selectors: `html[data-site-theme="premium"]` and `html.dark[data-site-theme="premium"]`. Halloween selectors must be additionally gated by site-theme to prevent any contamination; seasonal date is NOT permission to override a selected user theme.
- Use tokens for design primitives (`--background`, `--card`, etc.) and optional theme-local component classes; don't fork the whole app into a separate premium codebase.
- One global colour-mode state; premium supports light/dark/system. Switching is instantaneous visually, persists server-side and survives hydration/reload without flashing.
- Eligibility cannot be client-authoritative: server verifies linked Discord booster status or approved staff privilege. RLS/DB guard verifies `site_theme` on mutation. Eligibility is checked again when sessions refresh; no querying Discord on every navigation.
- If a booster loses eligibility: retain preference for potential later return only if security/privacy reviewed; otherwise automatically fall back to Basic, keep all player progress, explain the changed appearance once. No broken account settings and no retroactive removal of other earned entitlements.
- Derive entitlements from existing trusted role-sync infrastructure; review stale role sync/outage paths and introduce documented expiry/refresh grace instead of unconditional optimistic unlock.
- Never render premium UI on a server request unless entitlement is proved by trusted current data. Do not leak locked previews of private user information.
- Shared controls unaffected functionally; analytics and game rules never change with theme. Feature-flag rollout and rollback.
- No new heavy rendering libraries for cosmetics. Prefer CSS and existing icon assets.
- Use only preloaded or bundled assets; avoid excessive layout shift and network waterfalls.

## Performance requirements and release gates
Targets (engineering acceptance targets; measured, not promises):
- No meaningful degradation vs Basic for p75 interaction latency or input responsiveness on mobile.
- Theme token toggle applies on next paint in the active document, without remounting game components.
- Additional theme-only CSS/JS budget: target < 20KB gzip combined over existing site where feasible; justify deviations with measured evidence.
- In active gameplay: negligible additional GPU/CPU from premium chrome; suspend non-essential animations.
- 60fps target for UI transitions on representative phones; maintain fluid 30fps fallback on older devices; responsive feedback even under contention.
- No large offscreen blur, backdrop filters or continuous animations on slow devices.
- Accessibility: WCAG 2.2 AA contrast and visible focus, readable 200% zoom, 320px layout, no hidden nav, touch targets, reduced motion and forced-colours support as appropriate.
- Cross-platform: ChromeOS trackpad/keyboard, Android Chrome, iPhone Safari, desktop Chrome/Firefox/Safari; test menu, dialog, game detail, game fullscreen and settings.
- Visual diffs for basic light/dark, Halloween light/dark and premium light/dark at 320, 390, 768, 1280 widths. Ensure styles don't leak.
- Security/RLS tests for owner/staff, booster, expired booster, unlinked Discord, signed out, tampered settings and stale role records. Verify the site's previously reported Discord role-sync problems before relying on eligibility.
- Automated a11y and browser QA plus user playtesting. No 'complete' status based purely on CSS compilation.

## Work plan and measurable milestones
P0 Design-system feasibility: verify existing CSS, Nav, Card, Button, game player and mobile surfaces; collect reproducible Basic baseline and entitlement flow; design 2-3 polished reference screens.
P1 Tokens and UI fundamentals: premium light/dark tokens, surfaces, typography, focus, shadow, responsive reusable primitives; screenshot proof and light/dark toggle tests.
P2 Shell and discovery: navigation, command search, home, library cards, settings previews, mobile. Pass low-end device and a11y gates.
P3 Social and profile identity: consistent profile/achievement styling, party/social surfaces, consent-sensitive attribution.
P4 Eligibility and persistence: server-backed booster access, staff testing, revocation/fallback, no premium bypass, database migrations and backfill strategy.
P5 Performance polish: measured interaction timings, motion reductions, fallback profiles, game-stage tests and asset budgets.
P6 Beta and release: private booster preview, visual regression, cross-device QA, feature flag and rollback; staged enablement only with concrete evidence.
Each phase can ship as a self-contained PR *without prematurely enabling the theme*.

## Non-goals
No gameplay advantages, paywalls for core navigation, loud gold everywhere, fake luxury material, endless glow, forced cinematic page transitions, hidden features, expensive effects on low-end hardware, exclusive information access, client-authored entitlement, or automatic enabling over a user's previous choice.

## Success criteria
Booster players voluntarily select Premium and report it feels distinctly more polished and usable, without meaningful performance regression. It is an aesthetic reward they are proud to keep on; it is not a penalty for non-boosters.
