const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assertIsolatedEnvironment } = require("./assert-isolated-staging.cjs");
const check = (url, kind, confirmed="yes") => assertIsolatedEnvironment({ url, kind, confirmed });

test("known production addresses and direct/pooler database connections are rejected", () => {
  for (const url of [
    "https://classic-games-hub.blobbyofficial.com",
    "https://blobbyofficial.com",
    "postgresql://postgres:secret@db.isgqukmmhuzhpalbruwt.supabase.co:5432/postgres",
    "postgresql://postgres.isgqukmmhuzhpalbruwt:secret@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"
  ]) {
    assert.throws(() => check(url, url.startsWith("http") ? "website" : "database"), /production/i);
  }
});
test("unconfirmed staging, wrong schemes and bad targets are rejected", () => {
  assert.throws(() => check("https://staging.example.net", "website", "no"), /confirmation/);
  assert.throws(() => check("http://staging.example.net", "website"), /scheme|HTTPS/);
  assert.throws(() => check("https://staging.example.net", "database"), /PostgreSQL/);
  assert.throws(() => check("invalid url", "website"), /Malformed/);
});
test("nonproduction staging endpoints can be accepted after confirmation", () => {
  assert.doesNotThrow(() => check("https://staging.example.net", "website"));
  assert.doesNotThrow(() => check("postgres://staging_user:secret@db.staging.example.net:5432/staging", "database"));
});
