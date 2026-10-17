const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { prepareMigrations } = require("./prepare-local-supabase-migrations.cjs");

test("legacy migration numbering becomes strictly ordered valid timestamps", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cgh-migration-test-"));
  try {
    const from = path.join(root, "from"), to = path.join(root, "to");
    fs.mkdirSync(from);
    for (const n of ["0001", "0059", "0060", "0083"]) {
      fs.writeFileSync(path.join(from, `${n}_sample.sql`), `select ${Number(n)};`);
    }
    const created = prepareMigrations(from, to).map(x => path.basename(x));
    assert.deepEqual(created, [
      "20261017000001_sample.sql", "20261017000059_sample.sql",
      "20261017000100_sample.sql", "20261017000123_sample.sql"
    ]);
    assert.equal(fs.readFileSync(path.join(to, created[3]), "utf8"), "select 83;");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test("duplicate versions cannot silently overwrite local migration files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cgh-migration-test-"));
  try {
    const from = path.join(root, "from"), to = path.join(root, "to");
    fs.mkdirSync(from);
    fs.writeFileSync(path.join(from, "0083_a.sql"), "select 1;");
    fs.writeFileSync(path.join(from, "0083_b.sql"), "select 2;");
    assert.throws(() => prepareMigrations(from, to), /Duplicate SQL migration/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
