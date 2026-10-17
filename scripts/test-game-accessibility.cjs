const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const player = fs.readFileSync("features/games/game-player.tsx", "utf8");
test("game display has a meaningful name and controls description", () => {
  assert.match(player, /role="img" aria-label=\{\x60\$\{title\} game display\x60\}/);
  assert.match(player, /aria-describedby="game-controls-description"/);
  assert.match(player, /id="game-controls-description"/);
});
test("game actions and overlays have readable names", () => {
  assert.match(player, /aria-label="Game actions"/);
  assert.match(player, /aria-label=\{paused \? "Resume" : "Pause"\}/);
  assert.match(player, /aria-label="Restart"/);
  assert.match(player, /aria-label="Resume paused game"/);
});

test("game loader failure is announced and can be retried without hiding gameplay UI", () => {
  assert.match(player, /role="alert"/);
  assert.match(player, /onClick=\{replay\}>Try loading again/);
  assert.match(player, /setEngineError\(null\)/);
  assert.match(player, /generation !== engineGeneration\.current/);
});
