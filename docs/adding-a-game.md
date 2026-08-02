# Adding a game

Five things have to line up, and missing any one of them gives a game that
looks present but does not play. Cube (`0058`) is the most recent worked
example; Lights Out is the smallest.

## 1. The engine

`lib/games/engines/<id>.ts`, default-exporting a `GameEngineFactory`
(`types/index.ts`):

```ts
const mygame: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus, reducedMotion }) => {
  // ...
  return { destroy, pause, resume, restart };
};
export default mygame;
```

- `onScore(n)` reports the running score; the host throttles it.
- `onGameOver(score, durationSeconds)` ends a run and the host persists it.
- `onStatus(text)` is transient prompt text ("Paused", "Level 3").
- `reducedMotion` is a real setting, not a hint. Skip in-between frames rather
  than dropping the game.
- `destroy()` must remove **every** listener it added, including ones on
  `window`.

Helpers live in `lib/games/helpers.ts`: `palette()`, `beep()`, `roundRect()`,
`createLoop()`, `clamp()`, `randInt()`, `choice()`.

Board games that can be played head-to-head also take a `net` context and
implement `applyRemoteMove` - see `tictactoe.ts` and `docs/parties.md`.

**Everything is canvas 2D.** That is a deliberate constraint, not an accident:
the bundle work in v1.4.1 removed a whole animation runtime, and a 3D library
would put more back than every engine here weighs put together. Cube renders a
solid object with about forty lines of hand-rolled vector maths.

### 3D games

If the camera sits *inside* the scene, use `lib/games/engine3d.ts` rather than
starting from trigonometry. It gives you a free camera, perspective,
near-plane clipping, backface culling, depth sorting, Lambert lighting, fog and
edge outlines - hand it world-space `Face`s and a `Camera` and it does the rest.
Labyrinth is the worked example.

Two things it will not do for you, both learned by looking at the screen rather
than at the maths:

- **Do not spawn the camera facing a wall.** A flat-shaded surface filling the
  frame tells the player nothing about where they are.
- **Flat shading needs help up close.** Subdivide large surfaces and turn on
  `edge`, or a wall at arm's length is a rectangle of uniform colour.

## 2. The registry

Add a lazy entry to `ENGINE_LOADERS` in `lib/games/registry.ts` so the engine
stays code-split:

```ts
mygame: () => import("./engines/mygame"),
```

## 3. The `games` row

A migration, following `0058_rubiks_cube.sql`. `engine_id` must match the
registry key, and `slug` is the URL. The economy fields are the ones worth
thinking about:

| Column | What it does |
| --- | --- |
| `max_score` | Anti-cheat ceiling. A score above it is rejected. |
| `credit_divisor` | Score ÷ this = credits earned. Higher pays less. |
| `max_credits_per_session` | Hard cap per run, whatever the score. |

Calibrate against an existing game of similar length and skill rather than
picking numbers fresh - Cube sits alongside Lights Out, Turbo Horizon alongside
the other arcade titles.

Migrations are append-only and may already be live. Verify one against the real
database inside a transaction with `rollback` before committing it.

## 4. The thumbnail

Add a `slug -> { accent, glyph }` entry to `GAMES` in
`scripts/generate-thumbnails.mjs`, then run `npm run generate:assets`.

Glyphs are drawn around the origin, roughly within ±90 × ±60, and scaled 1.35×
onto a 480×300 card. The accent comes from a six-colour ramp. Do **not**
invent a new frame or gradient: the whole point of the generated set is that
twenty-five cards read as one product rather than twenty-five pieces of
unrelated art.

## 5. Verify it

`npm run typecheck`, `npm run lint`, `npm run build`, and then actually play it
on a narrow viewport as well as a wide one. A canvas that assumes a desktop
aspect ratio is the most common way a new engine ships broken.
