# Game Architecture 2.1 — foundation

This is an **additive, non-production first phase**. The existing `lib/games/registry.ts`, canvas engine factories, game URLs, scores, favourites, database game rows and published states remain unchanged. Do not switch to the new runtime without a game-specific migration and tests.

## What exists

- `packages/game-contracts/src/index.ts` contains the versioned v1 manifest and a runtime validator. A manifest describes a game package; it **does not** create a Supabase catalogue row or publish a game.
- `packages/game-runtime/src/index.ts` implements serialized initialization/start/pause/resume/restart/dispose transitions, state/error events and cancellation. The game owns its listeners, animation frames and other resources and **must** clean them up in `dispose`.
- No workspace installer, new database schema, SDK access to score submissions, or migrated game is introduced in this phase.

## Proposed package layout

```text
packages/
  game-contracts/src/index.ts
  game-runtime/src/index.ts
  game-sdk/            # next: capability-gated services
  game-input/          # next: logical actions and focus
  game-rendering/      # next: fixed-step simulation / quality
  game-audio/          # later
  game-ui/             # later
  game-testing/        # next: harness and lifecycle tests
games/
  snake/               # first migration; no legacy files moved until validated
```

## Safety and acceptance gates

1. Define isolated package builds and a workspace setup *without replacing npm until CI is proven*.
2. Add negative manifest tests, lifecycle/reentrancy/rejection/abort tests, and a standalone game harness.
3. Implement capability negotiation and typed platform adapters; never grant score, credit or XP authority to clients.
4. Port Snake behind a default-off feature flag, preserving legacy engine IDs and existing public routes.
5. Verify browser restart/visibility/cleanup, Android touch, desktop keyboard, gamepad and low-end performance before any rollout.
6. Treat Vaulted and In development as editorial states, not permission to remove or hide a released game.

## Outstanding design issue

The current runtime reports invalid operations as `failed`. Before production adoption, distinguish programmer misuse from fatal engine errors and test disposal under outstanding promises and rejected cleanup. Manifest validation must also be connected to the game loader and CI rather than trusted implicitly.
