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

test("Public roadmap icons resolve to explicitly imported Lucide icons", () => {
  const roadmap = read("lib/roadmap.ts");
  const page = read("app/(main)/roadmap/page.tsx");
  const iconNames = [...roadmap.matchAll(/\bicon:\s*"([A-Za-z][A-Za-z0-9]*)"/g)]
    .map((match) => match[1]);
  assert.ok(iconNames.length >= 6, "Did not find roadmap icon definitions");
  const mapping = page.match(/const ICONS:[\s\S]*?= \{([\s\S]*?)\n\};/);
  assert.ok(mapping, "Roadmap icon registry missing");
  const mapped = new Set([...mapping[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9]*),?\s*$/gm)]
    .map((match) => match[1]));
  const missing = [...new Set(iconNames)].filter((name) => !mapped.has(name));
  assert.deepEqual(missing, [], `Unknown roadmap icons: ${missing.join(", ")}`);
});

test("Roadmap override has an explicit visible explanation", () => {
  const page = read("app/(main)/roadmap/page.tsx");
  assert.match(page, /roadmap_override/);
  assert.match(page, /hasActiveOverride/);
  assert.match(page, /currently managed by site administrators/);
});
