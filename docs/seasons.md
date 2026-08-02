# Seasons and collections

Two long-loop systems that share a page (`/collections`) and a principle:
**progress is derived, only the claim is stored.**

## Why progress is never stored

"How far through is this player" is always answerable from data that already
exists - owned items for a collection, play sessions for a season. A stored
counter would be a second copy of that truth, and it would drift the moment an
item expires, a purchase is refunded, or a play session is deleted.

What is *not* derivable is "have they already taken the reward". That is the
one fact each system stores, and it is stored as a row whose primary key makes
a double payout impossible.

## Seasons (`0054`)

A season is a themed track of tiers unlocked by **season XP**, which is the XP a
player earned from play sessions inside the season's window:

```sql
select sum(ps.xp_earned) from play_sessions ps
where ps.user_id = ... and ps.created_at >= s.starts_at and ps.created_at < s.ends_at
```

Because it is derived, seasons need **no hook into `add_xp` or `submit_score`** -
nothing on the hot path changed to add this feature.

### Three decisions that are data, not schema

These were open product questions. The schema is arranged so getting any of
them wrong costs an `UPDATE`, not a migration:

| Question | Where it lives |
| --- | --- |
| How long is a season? | `seasons.starts_at` / `ends_at`. Quarterly, monthly or ad-hoc all work; nothing assumes a length. |
| Is there a paid track? | Not built. This is the free track. A paid tier would be an additive column plus a payment integration that does not exist in this codebase. |
| Do past cosmetics return? | Operational. A past item comes back only if someone adds it to a new season's tiers. The default is that it does not. |

### Adding a season

1. Insert the reward cosmetics into `shop_items` with `available = false`, so
   they can never be bought.
2. **Add a renderer for each one**, or the reward will be granted and draw
   nothing - see `docs/level-milestones.md` for where each kind lives. This is
   the single easiest mistake to make here.
3. Insert the `seasons` row with its window.
4. Insert `season_tiers`, ascending `xp_required`.

`my_season()` returns whichever season is active and currently within its
window, so a new season takes over automatically and the page shows nothing
between seasons.

## Collections (`0050`)

A named set of shop items. Own all of them and claim the set for credits plus a
badge that cannot be bought at any price - proof of finishing something, which
is a different kind of prize from anything on the shelf.

`collections.season` is a nullable text tag, so a collection can be associated
with a season without either system depending on the other.

## The claim guard, in both systems

`claim_collection()` and `claim_season_tier()` both insert the claim row
*first* and let the primary key refuse a second attempt, rather than checking
and then writing with a window in between. `claim_collection()` additionally
deletes the row again if the set turns out to be incomplete, so a set that was
not finished can still be earned properly later.
