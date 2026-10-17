const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("lib/games/render-quality.ts", "utf8");
// Pure TS module compiled using native TypeScript strip-types in Node 22 is
// intentionally avoided: keep policy assertions compatible with Node 20 CI.
test("render presets preserve three distinct bounded DPR budgets", () => {
  for (const [name, cap] of [["eco",1],["balanced",1.5],["high",2]]) {
    assert.match(source, new RegExp(name + ": \\{[^\\n]*pixelRatioCap: " + cap.toString().replace(".","\\.") + " \\}"));
  }
});
test("canvas budget protects memory rather than modifying gameplay", () => {
  assert.match(source, /Math\.sqrt\(maxPixels \/ scaledPixels\)/);
  assert.match(source, /3_000_000/);
  assert.doesNotMatch(source, /score|difficulty|speed|simulation/i);
});
