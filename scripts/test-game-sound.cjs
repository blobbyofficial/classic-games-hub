const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("lib/games/helpers.ts", "utf8");
// Extract the small self-contained sound policy without depending on the
// TypeScript 7 compiler API (not published as the historical JS runtime).
const begin = source.indexOf("let audioCtx: AudioContext | null = null;");
const end = source.indexOf("/**\\n * A fixed-timestep game loop.", begin);
assert.ok(begin >= 0 && end > begin);
const audioJs = source.slice(begin, end)
  .replace("let audioCtx: AudioContext | null = null;", "let audioCtx = null;")
  .replace(/export function /g, "function ")
  .replace("value: number", "value")
  .replace("): void", ")")
  .replace("(): number", "()")
  .replace("type: OscillatorType = ", "type = ")
  .replace("(window as unknown as { webkitAudioContext: typeof AudioContext })", "window");


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
  vm.runInNewContext(audioJs + "\\nexports.beep = beep; exports.setGameSoundEffectsVolume = setGameSoundEffectsVolume; exports.getGameSoundEffectsVolume = getGameSoundEffectsVolume;", sandbox);
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
