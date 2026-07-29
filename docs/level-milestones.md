# Level milestones

Levelling unlocks features, not just a bigger number. This is the full list and
where each one is enforced.

| Level | Unlock | Enforced in |
| --- | --- | --- |
| 5 | Buy music tracks | `shop_items.min_level`, checked in `purchase_shop_item()` (`0036`) |
| 10 | Create groups | `create_group()` (`0035`) |
| 15 | Post stories | `post_story()` (`0035`) |
| 20 | Five saved looks instead of one | `preset_slot_limit()` (`0047`) |
| 30 | Vanity profile URL | `set_vanity_slug()` (`0045`) |
| 50 | The mythic Singularity effect | `add_xp()` (`0036`), backfilled in `0047` |

There is deliberately no central milestone table. Each gate lives inside the
`SECURITY DEFINER` RPC that performs the action it guards, because that is the
only place a check cannot be skipped. The UI mirrors some of these predicates to
decide what to show, but showing or hiding a control is presentation, and
presentation is not a security boundary.

Staff (`role in ('admin', 'moderator')`) bypass every gate above, so the flows
can be verified without grinding levels.

## Saved looks (level 20)

A preset is a snapshot of `profiles.equipped` under a name.

- `save_loadout_preset(p_name, p_id)` - snapshot the current look. Creating a
  new preset counts existing rows against `preset_slot_limit()`; passing `p_id`
  overwrites an existing one and is not subject to the limit.
- `apply_loadout_preset(p_id)` - write the preset back to `profiles.equipped`.
- `delete_loadout_preset(p_id)`
- `my_loadout_presets()` - the caller's presets plus their current slot limit,
  in one round trip, so the UI never hard-codes the number.

**Applying re-checks ownership.** A preset stores slugs, and a stored slug is
not proof that the player still owns the item: boosts expire, purchases can be
refunded, and staff-only items must stay staff-only. `apply_loadout_preset`
rebuilds the equipped map from what the caller owns *now* and silently drops the
rest, returning a `dropped` count so the UI can mention it. A preset saved six
months ago still works for the parts that are still valid.

Two keys in `equipped` are not shop items and pass through untouched:
`name_style`, and `banner` when it holds a raw `#rrggbb` custom colour.

`loadout_presets` has RLS with a select-only policy for the owner. There is no
insert, update or delete policy on purpose - every write goes through the RPCs
above, which is what enforces the slot limit. A direct insert is refused.

## Singularity (level 50)

`effect-singularity` is seeded with `available = false` and `price = 0`: it is
unbuyable and granted automatically by `add_xp()` when a player crosses level
50, along with a notification. It is the only effect a player cannot preview
before earning it.

`getInventory()` does not filter on `available`, so it appears in the inventory
once owned, and `effect` is in `equip_item`'s allowlist, so it equips like any
other effect. The renderer is `Singularity` in
`components/profile/profile-effects.tsx`.
