/**
 * Run server-action boundary tests without touching Supabase.
 * Actual TypeScript is transpiled and loaded with controlled mocks.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { z } = require("zod");

const root = path.resolve(__dirname, "..");
function loadAction(file, rpcCalls) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: file,
    reportDiagnostics: true,
  });
  const loadedModule = { exports: {} };
  const mocks = {
    "next/cache": { revalidatePath() {} },
    "zod": { z },
    "@/lib/supabase/server": {
      async createClient() {
        return {
          auth: { async getUser() { return { data: { user: { id: "fixture-user" } }, error: null }; } },
          async rpc(name, args) { rpcCalls.push({ name, args }); return { data: { ok: true }, error: null }; },
        };
      },
    },
    "@/lib/validators": { reviewSchema: z.object({ rating: z.number().min(1).max(5) }) },
  };
  const context = { module: loadedModule, exports: loadedModule.exports, console, require(id) {
    if (!(id in mocks)) throw Error("Unexpected dependency: " + id);
    return mocks[id];
  } };
  vm.runInNewContext(compiled.outputText, context, { filename: file });
  return loadedModule.exports;
}
test("score submission rejects malformed values without sending RPCs", async () => {
  const calls = [];
  const actions = loadAction("actions/games.ts", calls);
  for (const args of [
    ["snake", NaN, 10],
    ["snake", Infinity, 10],
    ["snake", -1, 10],
    ["snake", 1.5, 10],
    ["snake", 1, -1],
    ["snake", 1, 10, "root"],
    ["../../config", 10, 10],
  ]) {
    const result = await actions.submitScore(...args);
    assert.equal(result.ok, false, `Unexpected acceptance of ${JSON.stringify(args)}`);
  }
  assert.equal(calls.length, 0, "Invalid score must never reach an RPC");
  const ok = await actions.submitScore("snake", 100, 32, "regular");
  assert.equal(ok.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "submit_score");
});

