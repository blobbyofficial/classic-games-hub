# Velvet Red — fixed and comfortable theme

**Status:** Code committed in PR #74; build, browser QA and SQL deployment outstanding.

## Design intent
Inspired by the curated, full-app theme philosophy of Roblox Plus (not copying Roblox interfaces or its assets). The goal is a distinctive, attractive red theme *without* full-screen saturated red, harsh neon, persistent glows, moving backgrounds or a strobing aesthetic.

One fixed appearance for all players. It is a free theme. Users switching into Velvet Red keep their existing `light`, `dark` or `system` preference, but the Red design renders the same, independent of that preference. Switching to Basic/Halloween resumes the saved preference.

## Colour and surface hierarchy
| Role | Colour | Reason |
| --- | --- | --- |
| Base page | `#161214` | Near-charcoal, soft warm bias; no red glare |
| Card | `#211a1e` | Low-saturation wine graphite |
| Elevated menu | `#2b2025` | Clear layered contrast |
| Header | `#1e171b` | Darker than cards; restrained |
| Accent | `#d77b82` | Muted dusty rose for action controls |
| Active nav | `#59343f` | Burgundy to indicate state |
| Main text | `#f3ebed` | Neutral off-white, readable |
| Muted text | `#baaeb3` | Enough text distinction without dazzling |
| Lines | `#554149` | Warm restrained boundaries |
| Focus ring | `#f1a4a9` | Visible without electric neon |
| Error/status | semantic tokens | Never encode success/error as red alone |

No multiple colour-mode variants. The look is a single carefully balanced dark-leaning oxblood interface and *does not respond visually* to OS system mode changes.

## Implementation
- Global tokens and component surface treatments: `styles/themes/red.css`. Applied using `html[data-site-theme="red"]` selectors so both DOM light/dark classes receive the same design.
- Theme metadata: `lib/themes.ts`; free and selectable. Server validator `lib/validators.ts` accepts `red`.
- SSR: `app/layout.tsx` recognises Red from the active catalogue, excluding Halloween on a Red selection.
- Picker provides Red with no booster or level lock. Appearance controls in navigation and Settings are suppressed while Red is active; explanatory Settings copy informs players that existing preferences are preserved.
- Migration `0113_velvet_red_site_theme.sql` explicitly accepts Red for all players. Deploy SQL after 0112. Old themes remain denied, including unfinished Premium and Retro.
- Existing interactive game runtime and real game artwork retain their original colours; no gameplay overrides.
- Reduced-motion and keyboard focus treatments included.

## Release gates
1. Apply migration 0112, then 0113 to production Supabase **before** deploying new UI.
2. Check `red` save success, refresh persistence, rollback on save failure, and returning to Basic and Halloween.
3. Test both underlying DOM classes (.dark and light), OS/system theme switching, responsive navbar, settings, menu portals, dialogs, button variants and inputs for one visually identical Red appearance.
4. Verify WCAG contrast and focus and run reduced-motion tests.
5. Test mobile/Chromebook low-end performance and gameplay interaction; ensure the theme does not change canvas rendering.
6. Run build/typecheck and `node scripts/check-red-theme.mjs`; capture real screenshots at mobile/tablet/desktop widths. Do not claim deployed until verified.
