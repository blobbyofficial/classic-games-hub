/**
 * Opt-in HTTP smoke test for a locally running or preview deployment.
 * BASE_URL=http://localhost:3000 npm run test:smoke
 * Does not use credentials, write data, or trust a status page's reported health.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const base = process.env.BASE_URL;
if (!base) throw Error("Set BASE_URL to an authorized local or preview deployment.");
const origin = new URL(base);
if (!["http:", "https:"].includes(origin.protocol)) throw Error("BASE_URL must be HTTP(S)");
const routes = ["/", "/games", "/roadmap", "/status"];
for (const path of routes) {
  test(`GET ${path} serves usable HTML`, async () => {
    const url = new URL(path, origin);
    url.searchParams.set("_smoke", Date.now().toString());
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12000), headers: { "cache-control": "no-cache" } });
    assert.equal(response.status, 200, `${path} returned ${response.status}`);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/i);
    const html = await response.text();
    assert.match(html, /<main\b|<h1\b/i, `${path} missing primary content`);
  });
}
test("Unauthorized status probe must reject requests", async () => {
  const response = await fetch(new URL("/api/cron/status-probe", origin), {
    redirect: "manual", signal: AbortSignal.timeout(12000),
  });
  assert.equal(response.status, 401, "Unauthenticated probe must not run");
});
