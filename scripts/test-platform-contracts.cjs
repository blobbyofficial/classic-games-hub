/**
 * Static configuration contracts for high-risk deployment regressions.
 * Run with node --test scripts/test-platform-contracts.cjs
 * Runtime health and authorization are deliberately NOT inferred from these checks.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("Vercel declares exactly the two intended daily jobs", () => {
  const data = JSON.parse(read("vercel.json"));
  assert.deepEqual(
    data.crons.map(({ path, schedule }) => [path, schedule]),
    [
      ["/api/cron/discord-publish", "0 5 * * *"],
      ["/api/cron/booster-drops", "0 6 * * *"],
    ],
    "Unexpected Vercel cron schedule; verify plan limits before changing",
  );
});

test("Four sub-daily jobs are configured in the scheduler migration", () => {
  const sql = read("database/migrations/0075_scheduled_jobs.sql");
  const expected = [
    ["status-probe", "*/5 * * * *", "status-probe"],
    ["discord-role-sync", "*/2 * * * *", "discord-role-sync"],
    ["discord-stats", "*/10 * * * *", "discord-stats"],
    ["discord-audit-log", "*/5 * * * *", "discord-audit-log"],
  ];
  for (const [name, schedule, route] of expected) {
    assert.ok(
      sql.includes(`cron.schedule('${name}', '${schedule}'`),
      `Missing or changed pg_cron schedule: ${name}`,
    );
    assert.ok(
      sql.includes(`cron_call('/api/cron/${route}')`),
      `Missing pg_cron route: ${route}`,
    );
  }
  assert.match(sql, /vault\.decrypted_secrets/);
  assert.match(sql, /cron_base_url/);
});

test("Status probe requires cron bearer authentication before admin access", () => {
  const route = read("app/api/cron/status-probe/route.ts");
  const authAt = route.indexOf('request.headers.get("authorization")');
  const adminAt = route.indexOf("createAdminClient()");
  assert.ok(authAt >= 0 && adminAt > authAt, "Expected authorization before admin client");
  assert.match(route, /discordEnv\.cronSecret/);
  assert.match(route, /status:\s*401/);
  assert.match(route, /status_record_checks/);
});

test("The optional gateway worker health reports readiness explicitly", () => {
  const health = read("bot/src/health.ts");
  assert.match(health, /client\.isReady\(\)/);
  assert.match(health, /ready \? 200 : 503/);
  assert.match(health, /uptime_seconds/);
});
