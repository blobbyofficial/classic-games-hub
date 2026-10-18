# Animated Identity & Level-Unlocked Shop — implementation plan

**Status:** PLANNED, NOT IMPLEMENTED. All game art/behaviour changes and any shop level assignments require explicit separate implementation, migration and QA. This planning file is not an update-log entry.

## Goals and existing architecture

1. Give **every distinct active game thumbnail** an individual, recognisable micro-scene based on its actual game, not a generic zoom/fade. Expand the same animation language to site/app icon, navigation icons where it helps, profile/achievement icons and curated shop-item artwork. **Do not animate every icon simultaneously.**
2. Give purchasable cosmetics a transparent, achievable progression ladder so level matters and people see what they are working toward. Keep coins, purchases and existing inventory intact.
3. Preserve speed, clarity and accessibility on mobile, Chromebook-class hardware and power-constrained devices.

Existing code: `components/games/game-card.tsx` currently renders `game.thumbnail_url` with a universal hover zoom. `features/economy/shop-artwork.tsx` and `curated-shop-artwork.tsx` render shop visuals; `features/economy/shop-item-card.tsx` already calculates `levelLocked` against `item.min_level` and shows an LV badge. `purchase_shop_item()` in migration 0082 independently rejects purchases below the required level. These foundations must be **extended**, not rewritten or bypassed.

## Animation direction: unique per asset, coherent system

### Game thumbnail motion art
- Define a small **per-game animation storyboard** with 2–4 steps (setup, signature move, resolution, resting frame), representative of its actual mechanics. Examples: Snake slithers around one corner and collects food; 2048 slides and merges two tiles; Tetris-style falling-block game drops/locks one piece; Pong returns a ball off a paddle; Minesweeper reveals a safe square; Slithery coils briefly, no screen takeover.
- Each game has a hand-selected **static poster** that also matches the animated composition; don't infer an animation simply from a slug. Audit *all* actual published/coming-soon/in-development game rows against the registry and asset inventory before claiming 100% coverage.
- Store a manifest keyed by **game slug** with poster, optional animation asset, duration, aspect ratio, author/approval, fallback and version. Initial deployment may mix animations and static posters while new assets are created; never render broken or generic replacements.
- On desktop, play on meaningful hover/focus **once**, then rest. On touch, do not autoplay 20+ thumbnails while scrolling: prefer a deliberately selected/visible featured tile, or manual preview on a detail page. Stop when off-screen/tab hidden. Respect low-power and data-saver conditions.
- Do not use twenty-six active animated GIFs. Prefer short optimised WebM/MP4 preview assets or CSS/SVG with small budgets; poster-first with responsive media loading. Only use GIF for an exceptional small identity element already supported, e.g. the existing 512px animated-icon.gif.
- Keep card links, availability badges, favourite controls, content and cover contrast clear while animation runs. No major layout shift.

### Icons and collectibles
- Existing icon.svg remains the **canonical crisp static icon** for metadata/favicon/navigation branding. Existing animated-icon.gif can act as a short opt-in loading/celebration mark, not a permanent navbar loop.
- Create **distinct motion definitions by meaning**, not a blanket bounce: trophy = small raise/spark, friends = two nodes connect, settings = deliberate quarter-turn, favourite = quick filled state, achievements = brief reveal, purchase = item-specific collectible flourish.
- Curated shop items deserve item-specific reveal/preview sequences that accurately show the cosmetic effect. Animate only in item detail preview or on selected card, and never disguise what users are buying.
- Hover and focus affordances must both work; ordinary inactive static nav icons should not continuously dance. Preserve Lucide semantics and SVG accessible labels.
- Variants for Basic, Halloween, Velvet Red, Atelier and Insert Coin must share timing/accessibility contracts while matching each theme's character. Do not blindly apply the same visual effect to every theme.
- Include a static first frame, no-motion variant, optional low-effects switch, stable silhouette, no flicker/strobing, no forced sound.

### Engineering architecture
- Build a `game-thumbnail-motion` component with poster-first rendering and lazy media activation; a typed motion manifest; an `animated-icon` abstraction with CSS transform/opacity keyframes and theme-specific classes; per-item cosmetic previews rather than duplicate asset files.
- Put **all** loops under intersection/page-visibility control. Avoid animations over the game canvas and avoid resetting/pause-breaking active sessions due to theme or hover state.
- Use transform/opacity for motion whenever possible; cap decorative previews to brief 1–3 second clips. Quality fallback for slow devices/reduced-motion should be automatic and visible in automated tests.
- Audit asset budgets by aggregate library viewport, not just individual file size. Test several cards simultaneously on mid-range Android and ChromeOS with CPU throttling.

## Shop level ladder — proposals, not assigned values

| Level | What becomes available | Intended feel |
| --- | --- | --- |
| 1 | Selected common essentials and basic cosmetics | Real choice from the start, no empty shop |
| 5 | Additional badges, simple frames, a small set of tracks | First achievable milestone; respect existing music unlock |
| 10 | More elaborate frames, nameplates and curated collectibles | Noticeable identity options |
| 15 | Themed banners and refined profile decorations | Strong progression milestone |
| 20 | Special visual effects and higher-detail profile frames | More expressive, still cosmetic |
| 25 | New collectible styles and sophisticated entrances | Celebrate the Retro theme milestone without duplicating its free entitlement |
| 30 | A carefully selected premium-looking earned cosmetic tier | Fits alongside vanity URL unlock |
| 40–50 | A very small aspirational selection of ornate cosmetics | Long-term optional goal, not essential functionality |

These are **candidate thresholds**. Level requirements must be assigned manually, per item, based on the curated shop roster and progression distribution. Do not add level gates to all existing items automatically or treat rarity alone as a level requirement.

### Ownership/fairness rules
- **Existing owners keep access** to purchased items and may continue to equip them after the migration, even if their current level is below the newly introduced purchase threshold. Purchases made before the rule change are never confiscated or refunded without a separate correction process.
- Shop level locks govern **new purchases**, not viewing previews, inventory ownership, or legitimate equipped items. Retain staff-only/seasonal constraints independently.
- No retroactive credit deductions or automatic refunds. Avoid changes to credit prices without a documented economy review.
- Provide a clearly readable `Level X required` label on card/detail page with how many levels remain and a level-progression link; allow viewing and wishlisting while locked. Never make locked goods look purchasable.
- Existing shop data may be sparse or diverge from seed migrations. Inspect the **actual live catalogue** before writing any update statements. Use idempotent data migration keyed by exact existing slugs; report unmatched entries, never mass-assign by guessed rarity/category.
- Server continues to enforce `min_level` in `purchase_shop_item()`; audit gifting, rewards and alternate purchase flows so a level lock cannot be bypassed accidentally. Intentional grants from achievements/events are separate entitlements with explicit rules.
- Preserve the boost cap, credits ledger, concurrency protection and duplicate purchase handling in migration 0082.

## Delivery phases and acceptance gates

**A — Inventory and art audit**: enumerate active game slugs, static/animated assets, icon references and current curated shop rows. Confirm count; draw a per-game storyboard and per-item proposed threshold list. No guessed content.

**B — Motion foundation**: typed manifest, lazy player, static fallbacks, global reduced-motion/high-contrast, one-shot hover/focus behavior, pause on background and budget tests. Add a manual test page for all motion variants.

**C — Art production**: implement custom, recognisable animations in small batches; sign off on each, track coverage by game and shop item. No “all assets complete” until the entire current active catalogue is audited.

**D — Shop tier migration**: review **specific slugs** and levels, apply idempotent SQL in staging, confirm actual row counts and preserved inventory, then validate direct RPC calls as level 1/9/10/19/20/24/25/29/30 etc.

**E — Shop UX**: group filters for All / Available Now / Locked / Owned; clearly show progression and remaining levels; consistent item-detail and preview behaviour. Let users preview locked cosmetics.

**F — Cross-device verification**: mobile scrolling, keyboard/focus, screen readers, reduced motion, data saver, slow Chromebooks, full library render, load budgets, theme compatibility, poster error handling and unchanged game FPS. Release only after build, screenshots and DB acceptance.

## Success criteria
- A bespoke storyboard and tested poster/motion pair for **every active game** (denominator recorded in asset manifest); no generic “animate all” CSS tricks.
- Distinct meaningful icons and curated shop item previews without distracting permanent animation.
- Every shop lock is clearly labelled and enforced at both UI and trusted database purchase RPC, with existing owners protected.
- No significant degradation to mobile scroll responsiveness, initial library load or gameplay frame pacing; easy opt-out and static fallbacks.
