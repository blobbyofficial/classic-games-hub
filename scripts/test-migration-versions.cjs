const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync } = require("node:fs");
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
});
