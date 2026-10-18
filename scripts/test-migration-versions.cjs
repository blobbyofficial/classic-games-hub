const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

/** Supabase migration versions must be unique; duplicate prefixes can reorder schema changes. */
test("SQL migrations use unique monotonically sortable version identifiers", () => {
  const dir = join(__dirname, "../database/migrations");
  const seen = new Map();
  for (const file of readdirSync(dir).filter(name => name.endsWith(".sql"))) {
    const match = /^(\d+)_/.exec(file);
    assert.ok(match, `Migration has no numeric version: ${file}`);
    const version = match[1];
    const prior = seen.get(version);
    assert.equal(prior, undefined, `Duplicate migration version ${version}: ${prior} and ${file}`);
    seen.set(version, file);
  }
  assert.ok(seen.size > 0, "No SQL migrations found");
  const latest = [...seen.keys()].sort((a, b) => Number(a) - Number(b)).at(-1);
  const version = readFileSync(join(__dirname, "../lib/version.ts"), "utf8");
  assert.match(version, new RegExp(`export const EXPECTED_SCHEMA = ["\u0027]${latest}["\u0027]`), "Expected schema version must match latest SQL migration");
});

test("fresh seed respects the original difficulty enum", () => {
  const { readFileSync } = require("node:fs");
  const dir = join(__dirname, "../database/migrations");
  const definition = readFileSync(join(dir, "0002_games_platform.sql"), "utf8");
  const seed = readFileSync(join(dir, "0005_seed.sql"), "utf8");
  assert.match(definition, /difficulty in \('easy', 'normal', 'hard'\)/);
  assert.doesNotMatch(seed, /'medium'/,
    "Seed must not use a difficulty that violates the original schema");
});

test("migration files are nonempty, consistently named, and free of merge conflict markers", () => {
  const dir = join(__dirname, "../database/migrations");
  const files = readdirSync(dir).filter(name => name.endsWith(".sql"));
  assert.ok(files.length > 0, "No migration SQL files found");
  const widths = new Set();
  for (const file of files) {
    const match = /^(\\d+)_([a-z0-9][a-z0-9_-]*)\\.sql$/.exec(file);
    assert.ok(match, `Unexpected migration filename: ${file}`);
    widths.add(match[1].length);
    const sql = readFileSync(join(dir, file), "utf8");
    assert.ok(sql.trim().length > 0, `Empty migration: ${file}`);
    assert.doesNotMatch(sql, /^(?:<<<<<<< |=======\\s*$|>>>>>>> )/m, `Merge conflict marker in ${file}`);
  }
  assert.equal(widths.size, 1, "Mixed migration version widths can sort incorrectly");
});
