# Handoff - v1.5.0 "Collector's Edition"

Previous session ran out of credits. This file is the complete context needed to
carry on. Delete it once the work is merged.

## Where things stand

**PR #22** (`claude/v1-5-0-dev-plan-gmjufz` -> `main`) is open and **Vercel is
failing on it**. v1.5.0 itself is feature-complete: 17 commits, 11 migrations
(`0047`-`0057`), all already applied to Supabase.

## THE ONE URGENT THING

Someone merged `main` into the PR branch from the GitHub UI (commit `c06e41c`).
**That merge is corrupt.** It resolved conflicts by *concatenating* both sides
instead of merging them:

- `app/not-found.tsx` became 40 lines of two interleaved component bodies
- `components/games/game-card.tsx` spliced a JSX attribute list into the middle
  of another element

The tree does not parse, which is exactly why Vercel fails. `main` itself is
fine; only the merge commit is broken.

**The fix is already done and pushed** to branch **`claude/v1-5-0-merge-fix`**.
It redoes the merge with each conflict resolved on its merits (see that
commit's message for the file-by-file reasoning). `npm run typecheck` passes on
it.

### What the next session should do first

1. `git fetch origin && git checkout claude/v1-5-0-merge-fix && npm install`
2. Run the checks that were **not** completed before credits ran out:
   ```
   npm run lint
   npm run build
   cd bot && npm install && npx tsc --noEmit
   ```
3. **Re-run the em-dash sweep.** `main`'s v1.4.1 redesign reintroduced em
   dashes in the files it rewrote, and those came back through this merge. The
   user asked for hyphens throughout. Sweep everything EXCEPT
   `database/migrations/` - those files are append-only and already applied, and
   their em dashes live inside seeded data and RPC strings, not just comments.
   (Migration `0048` already fixed the database-resident copies.)
4. Get it onto PR #22. Simplest is to fast-forward the PR branch onto this fix:
   ```
   git push origin claude/v1-5-0-merge-fix:claude/v1-5-0-dev-plan-gmjufz
   ```
   That is a non-fast-forward over `c06e41c`, so it needs `--force-with-lease`.
   **Ask the user before force-pushing a branch with an open PR.** The
   alternative is a normal merge commit of the fix branch into the PR branch.
5. Watch PR #22 to green. The session was subscribed to its activity.

## Something that resolved itself

`main`'s v1.4.1 redesign **removed `framer-motion` entirely** and shipped the
animation work. Two things that were blocked on that decision for most of the
previous session are now moot - do not re-raise them:

- the "should we drop framer-motion for bundle size" question
- the roadmap's "More animation, better reduced-motion" item (deleted in the
  merge resolution, because v1.4.1 shipped it)

## What was in flight when credits ran out

A **playable Rubik's cube** engine - the last substantial roadmap item. Nothing
was written yet; only research. Findings worth keeping:

- Engines live in `lib/games/engines/*.ts`, registered in `lib/games/registry.ts`
  (lazy dynamic imports, so each game is code-split).
- The contract is `GameEngineFactory` in `types/index.ts`: a factory taking
  `{ canvas, width, height, onScore, onGameOver, onStatus, reducedMotion }` and
  returning `{ destroy, pause, resume, restart }`.
- Helpers in `lib/games/helpers.ts`: `palette()`, `beep()`, `roundRect()`,
  `createLoop()`. `lib/games/engines/lightsout.ts` is a good compact reference.
- **Recommended approach**: canvas 2D with hand-rolled 3D maths, NOT three.js.
  Every other engine is canvas 2D, and adding a 3D library would undo the
  bundle work this release did. 54 stickers is trivially cheap to
  software-render.
- **Recommended cube model**: give each sticker a 3D position and normal, and
  rotate those integer vectors 90 degrees for a face turn. Colours travel with
  the sticker, so no permutation tables are needed and there is no float drift.
  Solved check = every sticker sharing a normal shares a colour.
- A new game also needs: a `games` row (with `engine_id`), a thumbnail in
  `scripts/generate-thumbnails.mjs` (accent hue + glyph, one visual system), and
  an entry in `ENGINE_LOADERS`.

## Conventions this release has been holding to

Worth keeping, because they were applied consistently:

- **Progress is derived, only the claim is stored.** Collections, seasons and
  "now playing" all compute state from existing rows rather than keeping a
  counter that can drift. The one stored fact is "have they already taken the
  reward", because that is not derivable.
- **Claim guards insert first** and let a primary key refuse the second attempt,
  rather than check-then-write with a window in between.
- **Never ship a cosmetic without a renderer.** Granting an item nothing can
  draw is the bug that left the level-50 Singularity invisible since `0036`.
  Decorations live in `components/profile/avatar-decoration.tsx`, nameplates in
  `nameplate.tsx`, effects in `profile-effects.tsx`, profile frames in
  `profile-frame.tsx`.
- British English, hyphens not em dashes, comments explain *why*.
- Verify RPCs against the live database with the Supabase MCP inside a
  transaction and `rollback` - several real bugs were caught that way.

## Still unbuilt on the roadmap

Only `later`/`idea` tier remains: **More 3D titles** (the cube above) and the
three motion/audio "expressive extras" (entrance animations, cursor trails,
looping profile music). Everything else in v1.5.0 shipped.

## The environment ate work once

Mid-session the container rolled back to an earlier snapshot and six commits
vanished locally - the reflog had no record of them. They were all safe on the
remote. **If files you know you wrote are missing, check `origin` before
rewriting anything.**
