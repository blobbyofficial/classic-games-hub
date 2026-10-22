# Game Architecture v1.6.1 — foundation

This is an **additive, non-production first phase**. The existing `lib/games/registry.ts`, canvas engine factories, game URLs, scores, favourites, database game rows and published states remain unchanged. Do not switch to the new runtime without a game-specific migration and tests.

## What exists

- `packages/game-contracts/src/index.ts` contains the versioned v1 manifest and a runtime validator. A manifest describes a game package; it **does not** create a Supabase catalogue row or publish a game.
- `packages/game-runtime/src/index.ts` implements serialized initialization/start/pause/resume/restart/dispose transitions, state/error events and cancellation. The game owns its listeners, animation frames and other resources and **must** clean them up in `dispose`.
- Added source-only game SDK and input packages, isolated TypeScript projects, opt-in pnpm workspace discovery and a focused Node test harness. No database schema or migrated game is introduced.\n- A score service interface is only a transport request; the server remains responsible for validating scores and calculating rewards.

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

1. Independently typecheck all four packages with `npm run check:game-packages` and exercise baseline tests with `npm run test:game-packages`; migrate package installs to pnpm only after CI and lockfile review.
2. Add negative manifest tests, lifecycle/reentrancy/rejection/abort tests, and a standalone game harness.
3. Implement capability negotiation and typed platform adapters; never grant score, credit or XP authority to clients.
4. Port Snake behind a default-off feature flag, preserving legacy engine IDs and existing public routes.
5. Verify browser restart/visibility/cleanup, Android touch, desktop keyboard, gamepad and low-end performance before any rollout.
6. Treat Vaulted and In development as editorial states, not permission to remove or hide a released game.

## Outstanding design issue

Invalid lifecycle calls now raise `GameLifecycleError` without failing a healthy game. Before production adoption, test cancellation and cleanup under outstanding promises and rejected cleanup, and connect manifest validation to the loader and CI. The existing package typechecks and Node tests have been authored but have not been executed in this session.
