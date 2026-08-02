# Cosmetics

Every cosmetic is a `shop_items` row with a `kind`. `profiles.equipped` is a
JSON object holding **one slug per kind**, which is what lets an avatar frame, a
decoration, a profile frame, an effect, an entrance and a cursor trail all be
worn at once: they are separate kinds, not variants of one.

## The rule that keeps being learned the hard way

**Never ship a cosmetic without a renderer.** Granting an item that nothing can
draw is the bug that left the level-50 Singularity invisible from `0036` until
someone noticed. A new kind is not done when the row exists; it is done when
something on the profile renders it.

## Where each kind is drawn

| Kind | Renderer |
| --- | --- |
| `avatar_frame` | `components/ui/avatar.tsx` |
| `decoration` | `components/profile/avatar-decoration.tsx` |
| `profile_frame` | `components/profile/profile-frame.tsx` |
| `nameplate` | `components/profile/nameplate.tsx` |
| `effect` | `components/profile/profile-effects.tsx` |
| `banner` / `profile_theme` | `components/profile/profile-theme.ts`, `profile-backdrop.tsx` |
| `entrance` | `components/profile/profile-entrance.tsx` |
| `cursor_trail` | `components/profile/cursor-trail.tsx` |
| `track` | `components/profile/profile-music.tsx`, `components/shell/music-player.tsx` |

## Adding a kind

A new kind touches more places than it looks like it should. All of these, or
it will half-work:

1. **Migration** - extend the `shop_items_kind_check` constraint, and add the
   kind to the equippable list inside `equip_item` if it can be worn. Insert the
   shop rows.
2. **`types/database.ts`** - add it to the `ShopKind` union.
3. **`features/economy/`** - four registries: the `EQUIPPABLE` set in
   `inventory-grid.tsx`, `shop-item-card.tsx` and `shop-item-detail.tsx`, the
   `KIND_LABEL` map in `shop-item-card.tsx`, and the tab groups in
   `inventory-grid.tsx` and `shop-grid.tsx`.
4. **`features/economy/cosmetic-preview.tsx`** - the shop preview renders a mock
   profile card through the same components the real profile uses, so the
   preview cannot drift from the equipped result. Wire the new kind in.
5. **The renderer**, and the profile page that mounts it.

## Motion and audio

Anything that moves must respect reduced motion, and the two sources both
count: the stored per-user setting (passed down as a `reduced` prop) and the OS
`prefers-reduced-motion` query. Either one turning it off is enough.

Prefer `motion-safe:` on a CSS animation over an inline `animation` style - an
inline style wins over the utility class, so a cosmetic animated inline cannot
be switched off by `motion-reduce:`. Where a cosmetic is decorative only, mark
it `aria-hidden` and `data-decorative`.

Audio never autoplays. Browsers block it, and a page that makes noise on its own
is worse than one that asks first.
