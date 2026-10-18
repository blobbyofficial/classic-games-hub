# v1.6.1 independently checked game platform packages

The root application continues using npm and its existing lockfile; pnpm-workspace.yaml is **opt-in**, not a completed package-manager migration.

Existing source-only packages:
- `game-contracts`: validated manifest schema v1
- `game-runtime`: asynchronous, serial lifecycle
- `game-sdk`: host-mediated capability negotiation and resource cleanup
- `game-input`: scoped logical keyboard actions, also usable by touch/gamepad adapters

Each directory has an isolated TypeScript project. Run `npx tsc -p packages/game-contracts/tsconfig.json` (and similarly for the other directories), or `npm run check:game-packages` after dependencies are installed. No package is yet imported by production game pages.

Before using the workspace as an install/build boundary: supply package.json manifests, workspace install and CI checks, and a new lockfile in a controlled follow-up. Do not delete or migrate legacy games.
