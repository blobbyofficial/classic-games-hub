/* Run with: node scripts/test-game-loop.cjs
 * Minimal deterministic runtime test for the shared game loop. Uses installed
 * the actual createLoop helper source without a compiler dependency.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const file = path.join(__dirname, "..", "lib", "games", "helpers.ts");
const source = fs.readFileSync(file, "utf8");
const start = source.indexOf("export function createLoop(");
const end = source.indexOf("/**\n * Pick a per-difficulty value.", start);
assert.ok(start >= 0 && end > start, "createLoop source exists");
const compiled = source.slice(start, end)
  .replace(/export function createLoop\([^\n]*\) \{/, "function createLoop(update, render, step = 1 / 60) {")
  .replace("(now: number)", "(now)") + "\nexports.createLoop = createLoop;";

let clock = 0;
let nextId = 0;
const scheduled = new Map();
const exportsObject = {};
const context = {
  exports: exportsObject,
  performance: { now: () => clock },
  requestAnimationFrame: (fn) => {
    const id = ++nextId;
    scheduled.set(id, fn);
    return id;
  },
  cancelAnimationFrame: (id) => scheduled.delete(id),
};
vm.runInNewContext(compiled, context, { filename: file });
const { createLoop } = exportsObject;
assert.equal(typeof createLoop, "function");

let updates = 0;
let renders = 0;
const loop = createLoop(() => updates++, () => renders++);
assert.equal(scheduled.size, 1, "one frame scheduled initially");
function tick(ms) {
  clock += ms;
  const callbacks = Array.from(scheduled.values());
  scheduled.clear();
  for (const fn of callbacks) fn(clock);
}

tick(17);
assert.equal(scheduled.size, 1, "running loop schedules one new frame");
assert.equal(renders, 1);
assert.ok(updates >= 1, "updates on a frame");

loop.pause();
assert.equal(loop.running, false);
assert.equal(scheduled.size, 0, "pause cancels pending frame");
tick(1000);
assert.equal(scheduled.size, 0, "pause stays idle");
loop.pause();
loop.resume();
loop.resume();
assert.equal(scheduled.size, 1, "resume is idempotent");

tick(17);
assert.equal(scheduled.size, 1);
loop.stop();
assert.equal(scheduled.size, 0, "stop cancels pending frame");
loop.resume();
assert.equal(scheduled.size, 0, "stopped loop cannot restart");
assert.equal(loop.running, false);
console.log("Game-loop lifecycle tests passed");
