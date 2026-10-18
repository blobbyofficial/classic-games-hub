# Classic Games Hub — simplified theme system and next designs

## Shipping in this change
The theme picker contains only **Basic** (internal ID `default`) and **Halloween**. All old colours (Midnight, Ocean, Emerald, Crimson, Gold, Neon Rose, Synthwave, Aurora) are removed from the active UI and global CSS rules. Existing settings on retired themes fall back safely to Basic in application code; the SQL migration maps their stored value to `default`. No account, level, score, or cosmetics records are removed.

Basic has neutral, low-chroma light and dark modes. Halloween remains seasonal, with its own separate light and dark palettes. A non-seasonal fallback must always exist, including when Halloween is unavailable.

## Final proposed lineup: five themes total
1. **Basic** — Free for everyone; neutral light/dark/system modes. Clear typography, restrained contrast, conventional cards, no seasonal effects. The baseline accessible experience.
2. **Halloween** — Seasonal, free; dedicated light/dark/system modes and the existing Halloween artwork and component styling. Outside the availability window, retain a stored preference but render Basic unless explicitly overridden by environment configuration.
3. **Premium** — Discord booster/staff exclusive. A complete high-quality visual system, not an oversaturated recolour: rich materials, deliberate borders and layering, carefully selected microinteractions, subtle optional animated details and premium navigation/cards. Light/dark/system support, motion-off and budget-device fallbacks. Only cosmetic differences; no gameplay advantages. Server-enforced eligibility and graceful fallback when entitlement expires.
4. **Retro** — Level-unlocked theme. Proposed requirement: **level 25** (between existing 20 and 30 milestones), to be confirmed before release. Arcade-inspired typography for headings, readable modern body type, cabinet-style borders and navigation, restrained scanline/pixel-art motifs, tactile control styles, responsive layout and low-cost fallbacks. Light/dark/system variants. Never render pixel fonts for long body text.
5. **Red / Velvet Red** — Free, fixed appearance without light/dark variant. Low-saturation oxblood-charcoal surfaces with muted rose highlights, balanced off-white text and careful accessible contrast. Changing global Light/Dark setting must not alter the Red palette; keep the user's preferred mode stored for other themes. **CSS foundation, picker, validator and database migration implemented on branch**; see [Velvet Red specification](./velvet-red-theme-spec.md). Deployment and browser QA pending.

The all-five-theme one-shot rollout procedure is in [five-theme release runbook](./five-theme-release-runbook.md). Premium and Retro now have entitlement integration in migration 0114 and the Settings picker, but production validation is pending.

For the complete Retro arcade makeover plan, see [Insert Coin specification](./retro-insert-coin-theme-spec.md). This is planning-only and is not currently an unlockable theme.

For the complete Premium experience proposal, see [Premium Atelier design specification](./premium-atelier-theme-spec.md). It is planning-only and remains locked until all implementation and eligibility gates pass.

## Engineering requirements before shipping the future themes
- Single theme catalogue drives picker, manifest, rendering, validation and backend permissions. Never expose a theme that lacks its complete styles and eligibility checks.
- Use explicit `data-site-theme` with only one active theme at a time. Seasonal selectors must require Halloween explicitly and cannot leak into other themes. Basic must never inherit seasonal art.
- Site appearance mode (light/dark/system) remains a separate user preference; themes declare whether they support it. A fixed theme such as Red ignores mode only for rendering.
- Theme switching should be optimistic with rollback on failed save and no full-page reload. Persist settings server-side and apply them during SSR without hydration flashes.
- Backend trigger and client/server validation must agree. Premium requires active booster/staff role; Retro checks level threshold server-side. Validate revocation and level changes.
- Migrate retired values safely. If a previously selected theme is unsupported, show Basic rather than mixing CSS styles.
- Test signed-out/signed-in visitors, system mode changes, mobile nav, forms, game pages, popovers, text contrast, keyboard focus, reduced motion, slow devices, reload and session restoration.
- Preserve player data and entitlements; no premium-priced purchase or forced conversion.

## Delivery sequence
1. Ship Basic + Halloween removal and SQL migration; verify seasonal saving and rollback paths.
2. Develop a shared theme manifest and isolated design token architecture with screenshot/contrast regression tests.
3. Implement Red (free, fixed) to prove theme mode opt-out and live switching. **Code committed; browser testing, SQL rollout and deployment outstanding.**
4. Implement Retro plus audited level gating and typography/assets.
5. Implement Premium with booster gating and Retro with level-25 entitlement checks; server/SSR/picker integration coded, pending migration and browser QA.
6. Run a cross-theme compatibility release gate before exposing any additional option.

No dates or future theme releases are promised by this design document.
