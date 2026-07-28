# Parties & online multiplayer

How players group up and play together. Roadmap v1.4.0 "New Dimensions".

## The shape of it

A **party** is a small, transient group (2–8 by default, 20 max) that travels
between games together. One person creates it, others join by a six-character
invite code or a friends-list invite, and the leader picks the game and starts
it for everyone at once.

Two things happen when a match starts, decided by `modeFor()`:

| Mode | When | What it is |
| --- | --- | --- |
| `versus` | Head-to-head engine + exactly 2 players | One shared board, alternating turns, seat 1 moves first |
| `race` | Everything else | Same game, same countdown, live standings |

`HEAD_TO_HEAD` currently holds `tictactoe`, `connect4` and `reversi`. Adding a
game to it requires that engine to accept the optional `net` context and
implement `applyRemoteMove` — engines without it are unaffected and stay
single-player, which is why the rest of the library needed no changes.

## Where the rules live

**In the database, not the UI.** `database/migrations/0044_parties.sql` owns
every invariant:

- **One party per person** — a `UNIQUE` constraint on `party_members.user_id`,
  not application code. This is what every other RPC leans on.
- Size limits, block-list checks, leader-only actions, and leadership handover
  to the longest-serving member when a leader leaves (last one out disbands).
- `parties` and `party_members` are RLS-locked to "you can only see a party you
  are a member of". There are **no** insert/update/delete policies — every
  write goes through a `SECURITY DEFINER` RPC that is revoked from
  `public`/`anon` and granted only to `authenticated`.

The RPCs return `{ok, error}` jsonb envelopes with machine-readable codes;
`actions/parties.ts` is a thin wrapper that turns those codes into sentences a
player can read. Wording lives in one place there rather than scattered across
SQL string literals.

Parties are transient: `purge_stale_parties()` deletes anything untouched for
24 hours.

## Transport

Membership is Postgres. Everything that happens *during* a match is ephemeral
and rides a Supabase Realtime broadcast channel named `party:<party-id>`.

Two deliberate choices:

1. **`roster` is a nudge, not a payload.** When someone's mutation lands they
   broadcast "something changed" and every other client re-reads `party_state`.
   Roster state is never reconstructed from the wire, so a dropped message
   costs a stale second rather than a wrong roster. `parties`/`party_members`
   are deliberately *not* in the realtime publication — adding them would
   stream row data to subscribers.
2. **Nothing about a match in progress is persisted.** Only the final score,
   and only through the ordinary `submit_score` path every single-player run
   already uses — so party play earns exactly what solo play earns, with no
   second scoring path to keep honest or to exploit.

The channel name is the party's UUID, which only members ever see (the row is
RLS-locked and the id appears in no URL). This mirrors how DM threads already
broadcast typing and reactions on `conversation:<id>`.

## Files

| Path | What it does |
| --- | --- |
| `database/migrations/0044_parties.sql` | Tables, RLS, every RPC, the purge job |
| `actions/parties.ts` | Server actions; error codes → readable sentences |
| `lib/party/protocol.ts` | Channel name, event types, `modeFor()`, countdown |
| `lib/party/use-party.ts` | `usePartyState` (server-truth + refresh), `usePartyChannel` |
| `features/party/party-room.tsx` | Owns the connection; picks start / lobby / match |
| `features/party/party-lobby.tsx` | Roster, presence, leader controls, game picker |
| `features/party/match-stage.tsx` | Countdown, the board or the race, standings |
| `app/(main)/party/page.tsx` | Server read + auth gate |

Only games that are published **and** have a playable engine registered can be
picked — `app/(main)/party/page.tsx` filters on `hasEngine()`.
