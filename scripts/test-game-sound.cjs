const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("lib/games/helpers.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("all game beeps respect sound volume, mute, and invalid settings", () => {
  const played = [];
  class FakeAudio {
    currentTime = 0;
    destination = {};
    createGain() {
      const gain = { value: 0, exponentialRampToValueAtTime() {} };
      return { gain, connect() { played.push(gain.value); } };
    }
    createOscillator() {
      return { frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
    }
  }
  const sandbox = { exports: {}, window: { AudioContext: FakeAudio } };
  vm.runInNewContext(compiled, sandbox);
  const { beep, setGameSoundEffectsVolume, getGameSoundEffectsVolume } = sandbox.exports;
  setGameSoundEffectsVolume(0);
  beep();
  assert.equal(played.length, 0, "Muted sound must never create audio");
  setGameSoundEffectsVolume(50);
  beep(440, 0.08, "square", 0.04);
  assert.ok(Math.abs(played[0] - 0.02) < 1e-8, "Saved 50% scales sound level");
  setGameSoundEffectsVolume(200);
  assert.equal(getGameSoundEffectsVolume(), 1, "Volume is capped to 100%");
  setGameSoundEffectsVolume(-50);
  assert.equal(getGameSoundEffectsVolume(), 0, "Volume cannot be negative");
  setGameSoundEffectsVolume(NaN);
  assert.equal(getGameSoundEffectsVolume(), 1, "Invalid data falls back safely");
});
