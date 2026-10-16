# Phase 2 — Classic Games Hub visual identity and design system

**Status:** Proposed design direction and specifications, ready for review. **No production UI code changed.**  
**Basis:** Phase 1 source audit. Current production screenshots and verified deployment SHA remain outstanding; do not claim the concepts were tested in the live browser.

## Design thesis

**An independent digital arcade, not a gaming-themed SaaS dashboard.** The website is a practical place to choose a game and play immediately. Its personality comes from games, artwork, type, details and clear feedback—not universal gradients, glowing boxes or a decorative icon on every heading.

### Three visual directions evaluated

| Direction | Strengths | Risks | Decision |
| --- | --- | --- | --- |
| Neon arcade / synthwave | Instantly recognisable gaming aesthetic; lively | Already common; excessive gradients and glow hurt hierarchy | **Reject as default**; preserve as optional user theme |
| Cabinet / pixel nostalgia | Strong personality, memorable motifs | Fake CRT, pixel fonts and cabinet borders can reduce legibility and overwhelm mobile | **Borrow selectively** for game art, achievements and occasional decorative accents |
| Editorial modern arcade | Strong hierarchy, game artwork leads, good responsiveness, natural long-term maintainability | Can become bland without custom art and expressive details | **Choose as primary direction** |

## Identity system — recommended

**Working creative line:** “The arcade is open.” This is a concept line, not a replacement for the product name or an unverified claim about game availability.

- **Brand:** Keep “Classic Games Hub” and the recognisable joystick silhouette. Use a one-colour mark in normal contexts, with an optional accent variant. Do not redraw the icon geometry without approval.
- **Tone:** Confident, specific, playful where relevant; never overhype. Replace “reimagined”, “ultimate”, “amazing” and “endless” with observable details. Respect in-development restrictions.
- **Layout:** Distinct hierarchy: editorial game discovery; distraction-free play; practical settings/status/admin. Do not make all routes variations of one dashboard.
- **Colour:** Keep semantic tokens and OKLCH light/dark architecture. Default palette is near-neutral ink/charcoal and off-white with **one signature vivid violet** for actionable emphasis. Cyan, gold, green and red are reserved for game art or meaningful status. User-selectable premium themes remain supported.
- **Type:** Retain Geist Sans for UI and Geist Mono for numerical/statistical information initially. Differentiate pages by weight, size, alignment and whitespace rather than gratuitous font downloads. Use expressive display typography only if it improves identity and measured performance.
- **Shape:** 8–12px for interactive controls; 12–16px for utility cards; hero/media containers may use 16–20px. Avoid default 24–32px rounding on every component.
- **Borders/elevation:** Prefer subtle borders and restrained shadows. Use flat neutral backgrounds as the baseline. Glow and gradients only where there is an intentional focal point.
- **Icons:** Use Lucide for actions and navigation. Avoid automatic tinted icon badges in every section header. Artwork, not a generic icon, should communicate game identity.
- **Game artwork:** A consistent 8:5 thumbnail grid with custom scene/character/icon compositions per game, consistent safe areas and readable overlays. Do not fabricate playable previews or use identical gradient placeholders.
- **Motion:** 120–180ms for action feedback; 180–260ms for panels; longer animation only for gameplay/earned moments. Honour reduced motion; never animate theme hue as the default experience.
- **Writing:** “Browse games”, “Resume Snake”, “No games found”, “This game is being rebuilt”, “Last checked 5 minutes ago” (only when actually measured). Prefer helpful specificity over marketing language.

## Token specification (design targets, not production CSS)

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| page | #F7F7F5 | #111214 | Base |
| surface | #FFFFFF | #1A1C1F | Cards/panels |
| elevated | #EFEFED | #25282C | Raised utility controls |
| text | #191B1E | #F5F5F3 | Primary text |
| muted | #595D63 | #B4B8BE | Secondary text; contrast to be checked |
| border | #DCDDDC | #34373B | Subtle separators |
| accent | #6B43DB | #A58BFF | Active links, CTAs, selection |
| focus | #5B38C5 | #B8A5FF | Visible keyboard focus |
| success/warning/error | Existing semantic tokens | Existing semantic tokens | Status only |

These are **starting swatches**, not a validated contrast palette. Before implementation, calculate WCAG contrast in both themes and test high-contrast/forced-colour modes. Map new tokens onto existing `styles/globals.css` semantics; avoid duplicating independent theme variables.

## Representative page concepts

### A. Homepage — editorial discovery

1. Small identity eyebrow (“CLASSIC GAMES HUB / ARCADE”).
2. Large direct headline: “Pick a game. Play.”; short supporting line, conditional on actual availability.
3. Primary action “Browse games” and secondary contextual action (sign in, resume last game, or view rebuild progress).
4. One **featured game** artwork panel with actual availability and clear play/view action.
5. Compact category rail and browse grid; recent games for signed-in players only.
6. Leaderboard and economy content **below** the core discovery journey; no multiple competing hero CTAs.
7. Avoid claiming a game is playable until server status confirms it.

### B. Game library — utility + expressive artwork

- Search and category filters first; sort/favourites secondary.
- Keep a clear result count and “Clear filters” empty state.
- Each game card: distinctive artwork, title, category, status and one primary action. Rating/popularity metadata should not obscure the play choice.
- Category chips should be an accessible filter group or implement full tabs keyboard behaviour.
- On mobile, avoid hiding all navigation meaning behind icon-only affordances.

### C. Game detail and play

- The **game canvas is the hero**, not a large marketing header.
- Display actual status, controls, pause/restart/fullscreen, score and difficulty with a consistent placement.
- Preserve per-game visual personality and reduced-motion settings.
- Put rankings, achievements and related games after the play area.
- Provide explicit states for “in development”, lost connection, unsupported input, and save failures.

### D. Account/profile and settings

- Quiet utility styling; clean form layout, clear labels, actionable validation, strong focus states.
- Distinguish editable profile data from public statistics.
- Keep social actions context-specific and preserve moderation/privacy controls.
- No game-like decorative gradients on password/MFA recovery forms.

### E. Status and roadmap

- **Status:** Trustworthy, sparse and data-led. Overall state, last successful sample, component uptime, incidents, then report chart. Unknown data must not look green.
- **Roadmap:** Current release at top, compact release navigation and expandable details. Make proposed vs in-progress vs shipped states unmistakable. Admin override must not silently change source of truth.

## Component rules

| Component | Preserve | Change |
| --- | --- | --- |
| `PageHeader` | Shared semantics and spacing | Optional icon, no obligatory tinted tile; page-specific editorial variants |
| `SectionHeader` | Accessible heading and contextual link | Text link visible on mobile, reduce decorative badges |
| `GameCard` | Optimised thumbnails, statuses, favourite actions | Art-led variants, restrained overlays, clearer status/action |
| `Button` | Loading/disabled/focus/reduced-motion handling | One primary and a small secondary hierarchy; glass/gradient not default |
| `Sidebar`/`MobileNav` | Active route, badge counts, keyboard access | Reduce chrome when game is in focus; test banner stack |
| `EmptyState` | Actionable recovery | Copy specific to context, original illustration only when useful |
| `ReportChart` | Aggregate accessibility description | Accessible bucket data and keyboard alternative |

## Interaction specification

- Hover must not be the only way to reveal important content.
- All links/buttons need a clear accessible name; tab order should match visual order.
- Distinguish loading, empty, offline, error, in-development and unavailable states.
- Responsive target widths for review: **360, 390, 768, 1024 and 1440px**, plus zoom to 200%.
- Validate touch target sizing and contrast; avoid horizontal overflow except intentionally scrollable category rails.
- Respect `prefers-reduced-motion`; focus rings must be visible in light/dark themes.
- Avoid CLS from images, dynamic banners and changing game aspect ratios.

## Copy style guide

**Use:** short, accurate, human, useful language; explain the next step; make limitations visible.

| Replace | With (conditional on actual state) |
| --- | --- |
| “Your arcade, reimagined.” | “Pick a game. Play.” |
| “Every classic, one click away.” | “Browse the game library.” |
| “26 timeless games” when games are locked | “Explore the games being rebuilt.” |
| “No data available” | “Uptime history hasn’t been recorded yet. Current service checks may still be available.” |
| “Something went wrong” | “We couldn’t save your score. Try again.” |

Do not change public-facing copy in this phase; these are approved-for-review proposals.

## Prototypes to implement in Phase 3, after approval

1. Homepage (signed out + signed in), dark/light, desktop/mobile.
2. Game catalogue and cards, including rebuild locks and no-results.
3. Game detail/play (Snake as reference), pause and keyboard/touch.
4. Profile/account forms and social preview.
5. Status and roadmap, including unknown and long-content states.

Each prototype should have a before/after screenshot, design-token diff, responsive states, keyboard walkthrough and concise rationale. Build the first prototype in an isolated branch, not a site-wide restyle.

## Acceptance checklist for Phase 2

- [x] Chosen coherent design direction and documented rejected alternatives
- [x] Brand, type, colour, spacing, radius, media and motion principles
- [x] Component treatment and representative page layouts
- [x] Tone-of-voice and sample copy
- [x] Accessibility/responsiveness constraints and validation plan
- [ ] Real live-site screenshot comparison (blocked by deployment verification/browser access)
- [ ] Stakeholder sign-off on direction (pending)
- [ ] WCAG contrast calculation on rendered UI (implementation verification)

**Decision required:** approve the **editorial modern arcade** direction, or request changes to the colour/art direction before Phase 3. Phase 2 is a specification and decision phase; implementation belongs to Phase 3.
