/**
 * Dependency-free source-level validation contracts for Server Actions.
 * These checks deliberately do not claim to execute a Next.js Server Action
 * or prove runtime authorization. Real role-based tests belong in staging.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("score action validates score, duration, difficulty before calling RPC", () => {
  const source = read("actions/games.ts");
  const fn = source.slice(source.indexOf("export async function submitScore("), source.indexOf("/** Set favourite"));
  assert.ok(fn.startsWith("export async function submitScore("));
  for (const s of ["slugSchema.safeParse(slug)", "scoreNumberSchema.safeParse(score)", "scoreNumberSchema.safeParse(duration)", "difficultySchema.safeParse(difficulty)"]) {
    const validation = fn.indexOf(s);
    assert.ok(validation >= 0 && validation < fn.indexOf('supabase.rpc("submit_score"'), s);
  }
  assert.match(source, /z\.number\(\)\.finite\(\)\.int\(\)\.min\(0\)/);
  assert.match(source, /auth\.getUser\(\)/);
});

test("economy actions check authenticated Supabase user before RPC", () => {
  const source = read("actions/economy.ts");
  const auth = source.indexOf("supabase.auth.getUser()");
  const operation = source.indexOf("await operation(supabase)");
  assert.ok(auth >= 0 && operation > auth);
  assert.match(source, /if \(authError \|\| !auth\.user\)/);
});

test("gift input has a bounded server-side identifier schema", () => {
  const source = read("actions/economy.ts");
  assert.match(source, /export async function giftItem\(/);
  assert.match(source, /export async function giftWithToken\(/);
  assert.match(source, /invalid\((?:identifierSchema|userIdSchema), toUserId, "recipient"\)/);
});
