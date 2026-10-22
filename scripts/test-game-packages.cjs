/** Run source-only package tests without switching the production package manager. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cgh-package-tests-"));
const sources = [
  "packages/game-contracts/src/index.ts",
  "packages/game-runtime/src/index.ts",
  "packages/game-sdk/src/index.ts",
  "packages/game-input/src/index.ts",
];
try {
  for (const source of sources) {
    const target = path.join(temp, source.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const code = ts.transpileModule(fs.readFileSync(path.join(root, source), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    fs.writeFileSync(target, code);
  }
  const contracts = require(path.join(temp, sources[0].replace(/\.ts$/, ".js")));
  const runtime = require(path.join(temp, sources[1].replace(/\.ts$/, ".js")));
  const sdk = require(path.join(temp, sources[2].replace(/\.ts$/, ".js")));
  const input = require(path.join(temp, sources[3].replace(/\.ts$/, ".js")));
  const valid = {
    schemaVersion: 1, id: "snake", title: "Snake", version: "1.0.0",
    sdk: { major: 1 }, display: { width: 480, height: 480, resize: "contain" },
    input: ["keyboard", "touch"], quality: ["eco", "balanced"],
    capabilities: ["score", "audio"], status: "in-development"
  };
  test("manifest rejects invalid versions, duplicates and dimensions", () => {
    assert.equal(contracts.validateGameManifest(valid).ok, true);
    for (const patch of [
      { schemaVersion: 2 }, { version: "bad" }, { id: "../escape" },
      { input: ["touch", "touch"] }, { display: { width: 0, height: 480, resize: "contain" } },
    ]) assert.equal(contracts.validateGameManifest({ ...valid, ...patch }).ok, false);
  });
  test("capabilities only expose host-granted and declared services", () => {
    const score = { submitRun: async () => ({ accepted: true }) };
    const audio = { play() {}, setMuted() {} };
    const services = sdk.negotiateCapabilities(valid, { score, audio, settings: {} }, new Set(["score"]));
    assert.equal(services.score, score);
    assert.equal(services.audio, undefined);
    assert.equal(services.settings, undefined);
    assert.equal(Object.isFrozen(services), true);
  });
  test("input handles focus, justPressed and release", () => {
    const actions = new input.ActionInput();
    assert.equal(actions.keyDown("ArrowUp"), true);
    assert.equal(actions.snapshot().justPressed.has("up"), true);
    assert.equal(actions.snapshot().justPressed.size, 0);
    actions.setActive(false);
    assert.equal(actions.snapshot().pressed.size, 0);
    assert.equal(actions.keyDown("ArrowUp"), false);
  });
  test("game runtime transitions and disposal are repeatable", async () => {
    const events = [];
    const game = {
      initialize: async ({ signal }) => { assert.equal(signal.aborted, false); },
      start: async () => events.push("start"),
      pause: async () => events.push("pause"),
      resume: async () => events.push("resume"),
      restart: async () => events.push("restart"),
      dispose: async () => events.push("dispose"),
    };
    const instance = new runtime.GameRuntime(() => game);
    await instance.initialize({ canvas: {}, capabilities: {} });
    await instance.start();
    await instance.pause();
    await instance.resume();
    await instance.restart();
    assert.equal(instance.state, "running");
    await assert.rejects(instance.start(), runtime.GameLifecycleError);
    assert.equal(instance.state, "running");
    await instance.dispose();
    await instance.dispose();
    assert.equal(instance.state, "disposed");
    assert.equal(instance.signal.aborted, true);
    assert.deepEqual(events, ["start", "pause", "resume", "restart", "dispose"]);
  });
  test("fatal engine errors move runtime into failed state", async () => {
    const events = [];
    const game = { initialize() {}, start() { throw Error("engine failed"); }, dispose() {} };
    const instance = new runtime.GameRuntime(() => game, (event) => events.push(event));
    await instance.initialize({ canvas: {}, capabilities: {} });
    await assert.rejects(instance.start(), /engine failed/);
    assert.equal(instance.state, "failed");
    assert.equal(events.some((event) => event.type === "error"), true);
    await instance.dispose();
  });
} finally {
  // Node's test callbacks execute asynchronously. Cleanup when the process exits.
  process.once("exit", () => fs.rmSync(temp, { recursive: true, force: true }));
}
