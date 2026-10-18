# Insert Coin — Retro theme implementation specification

**Status:** RETRO DAY + NIGHT 8-BIT CSS FOUNDATIONS CODED on development branch. Not selectable, not deployed, and not level-unlockable. Entitlement backend, visual QA and release gates remain pending.
**Proposed unlock:** Level **25** (subject to owner approval). This creates a distinct milestone between existing level-20 saved-look slots and level-30 vanity URL. Existing level curve uses `xpForLevel()`, but unlock checks must use trusted server-side level data, never local XP calculations.

## Development implementation note (current branch)
- `styles/themes/retro.css` provides Retro Day and Night colours, pixel typography, arcade cabinet frames, tactile controls, navigation and exterior player shell treatment.
- `app/layout.tsx` imports `Press_Start_2P` from `next/font/google` with `preload: false` and exposes `--font-retro-display`. The display font is for headings and small labels; body text remains Geist.
- `scripts/check-retro-theme.mjs` provides source-level checks for font setup, theme scope, styled surfaces and a locked/unreleased theme.
- Theme registry, validators and database deliberately do not accept `retro` yet; security and level-25 grant remain unimplemented. Browser build, font-download availability, layout testing and contrast testing remain unverified.

## Product promise
A full '1990s arcade takeover' of Classic Games Hub, not a colour preset. The UI should evoke a lovingly maintained real arcade cabinet: bold marquee typography, tactile control panels, trackable scoreboard readouts, authentic panel insets and delightful feedback. Avoid unlicensed game branding, misleading fake scores and cartoonish excessive gradients. Maintain the same fast workflows, URLs, keyboard/touch controls, permissions and progression as Basic.

Working public name: **Insert Coin**; internal theme ID: `retro`. Distinguish it from Halloween, Basic, future Red and Premium. Users can opt out at any time, and game mechanics must not change with the theme.

## Visual system
### Retro Night
- Cabinet frame #101715, upper panel #18231E, raised panel #263B34, inset #101A17.
- Foreground #F3EDCF; subordinate text #B7CBBB; readable selected accent #76E3B4.
- Warm marquee gold #E7C67A and brass outline #796C45, used for emphasis rather than every border.
- Art direction: charcoal green, worn-but-clean metal accents, softly lit command panels. No permanently animated glow.

### Retro Day
- Page #F1E9D7, cabinet panel #FFF8E8, recessed panel #E6D9BB.
- Ink #283C35, secondary #53645A, contrasting evergreen controls #285C4B, highlight #886027.
- Warm ivory 'terminal desk' atmosphere, brighter cabinet marquees and accessible foregrounds. Not a dark screen behind every light surface.

### Typography, shape and imagery
- Display-only pixel/arcade letterforms for selected short headings and score counters; legible body typography remains Geist or another current readable sans face.
- Use an audited, licensed, locally bundled display font only if a genuine enhancement; provide system-font fallback and do not ship proprietary font assets inadvertently.
- Rectangular 4–8px radii, stepped but clean strokes, recessed borders, inset labels, small numbered section titles. Theme-aware focus indicators use at least 2px outline.
- Show real cover art inside game cabinets, never hard-coded fake leaderboards/XP/player count.
- Icons remain recognisable and consistent; replace only decorative treatments, not accessible icon meanings.

## Whole-site transformation matrix
| Surface | Retro-specific transformation |
| --- | --- |
| Header | Compact marquee brand, inset search and cabinet-control navigation; maintain 64px/phone safe-area limits |
| Sidebar and mobile tabs | 01/02 indexed navigation, panel borders, physical keycap affordances, strong active state, no disappearing labels |
| Homepage | 'PLAYER ONE' introduction panel, Continue Playing as ready station, authentic category marquees |
| Game library | Cabinet-framed cards with game title/nameplate, screen artwork, state LEDs and real status labels |
| Game detail/player | Game HUD framing and tactile on-screen controls; gameplay canvas untouched, with no CRT post-processing |
| Scores | Scoreboard typography with tabular numeric alignment; real ranking and clear ties/missing data |
| Profiles | Player scorecard, XP as progress-meter, achievement pins and optional selected stat badges |
| Friends/parties | Player roster and ready-state displays using existing permissions; clear buttons and empty states |
| Shop/inventory | Showcase shelving and item labels, same prices and entitlement enforcement |
| Settings/forms | Tactile switches, visible focus, robust validation, no pixel fonts for long-form text |
| Notifications | Brief non-flashing status-light cues, same semantic priority and screen-reader output |
| Errors/empty states | Friendly 'no cartridge inserted' style illustrations without withholding useful explanation |

## Motion, sound and input
- Pointer press response targeted at 60–100ms; menu response 120–170ms; no motion delays before interactions.
- One-shot 1–3px press translation/opacity feedback, disabled with reduced motion. No jarring shake, glitch, strobe, fake CRT burn-in or constant particles.
- Optional small tactile audio cues only when the user explicitly turns on UI sounds; off by default, independent of game audio.
- Control hints adapt to keyboard, mobile touch and trackpad; every command works without hover and has visible focus.
- On a slow phone/Chromebook, skip texture effects automatically or via minimal-effects settings. No WebGL dependency for interface cosmetics.

## Unlock and security
- The existing milestone system uses authoritative `public.profiles.level` for feature gates and documented trusted RPCs; Retro must follow the same backend pattern, never a client-only lock.
- Proposed once-earned reward at level 25: record a durable, uniquely constrained entitlement via server-side level-award/RPC path; protect duplicate and concurrent awards. Backfill qualified existing profiles.
- Persist entitlement after earning even if a level is adjusted downward, except a deliberate audited admin revocation for erroneous grants.
- Validate site_theme='retro' with a backend trigger/RPC that checks authenticated user identity and entitlement; a manipulated REST/JS client cannot select it.
- Staff preview may bypass during testing (existing project convention), but staff mode must not grant transferable player rewards.
- SSR reads trusted eligibility before setting data-site-theme; after revocation or invalid settings, fall back to Basic with a clear explanation, without resetting unrelated preferences.
- Avoid creating a separate shop item or accepting payment for this reward. The chosen level 25 is *proposed*, not yet approved.

## Theme architecture
- One canonical theme registry and entitlement mapping for settings picker and SSR.
- CSS only active at `html[data-site-theme="retro"]`; separate `html.dark[data-site-theme="retro"]` and light-mode rules. Seasonal styling must require Halloween theme activation, not simply October.
- Theme-specific presentation components can use small explicit variant slots only where CSS tokens alone cannot change structure (e.g. game cabinet card decoration, scoreboard visual alignment). Keep data fetching, gameplay and navigation shared.
- Theme switching must not remount the game engine or reset a match. Preserve scroll/focus and stored preferences.
- Load font and decorative resources on demand for Retro users where feasible. Defer cosmetic assets outside first viewport; provide no-JS/reduced-motion fallbacks.
- For released Retro, add to catalogue, validators, backend checks and migration together; never expose a partial unfinished theme.

## Test and release gates
1. Lock security: anonymous, under-level, exact-level, over-level, staff, tampered client, direct API update, revocation and migration-backfill tests.
2. Functional regression across home/library/game player/profile/social/settings/shop: identical navigation, scores, XP, rewards and purchases.
3. Screenshot comparisons of Basic Light/Dark, Halloween Light/Dark, Premium Day/Night and Retro Light/Dark at 320, 390, 768, 1280px.
4. Cross-browser: Android Chrome, iOS Safari, ChromeOS trackpad, low-end desktop, modern desktop; test zoom, portrait/landscape, touch/keyboard/gamepad.
5. WCAG 2.2 AA target for readable text/control contrast, no keyboard traps, robust focus, touch targets and high contrast/reduced motion.
6. No meaningful game FPS/input latency regression vs Basic; no expensive canvas overlays or indefinite animation.
7. Preview behind admin flag; signed-off limited test cohort; staged launch with rollback and explicit success/failure checklist.
8. Shipping includes docs, update log and current milestone list; build/typecheck/lint and device/browser acceptance evidence.

## Delivery PR breakdown
- **R0 — Technical baseline:** prototype two representative screens; audit accessibility and theme architecture; confirm level 25.
- **R1 — Tokens & typography:** dark/light palettes, locally bundled display font if approved, structural component primitives.
- **R2 — Shell and library:** nav, mobile tabs, arcade cabinet game tiles, responsive and focus QA.
- **R3 — Player/social/profiles:** HUD frame, scoreboards, achievement displays, messages, parties, shop and forms.
- **R4 — Server-entitlement:** unique permanent unlock + backfill, safe migration, RLS/trigger checks, staff preview, settings and SSR.
- **R5 — Performance QA & launch:** reduced-motion, real devices, visual tests, feature flag, release notes; enable only after gates pass.

## Non-goals
No gameplay changes, no flashing/strobing, no pay-to-win, no forced sound, no full-site CRT filters, no pixel-font body paragraphs, no oversized fixed header, no fake game cabinets that obscure real controls, and no unlocked state before backend verification.
