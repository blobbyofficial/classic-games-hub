/**
 * Real Chromium regression checks. No login, credentials, or production writes.
 * Run after starting the site: BASE_URL=http://127.0.0.1:3000 node scripts/test-browser.cjs
 * Requires playwright and axe-core to be installed in the test environment.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const axe = require("axe-core");
const root = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const routes = ["/", "/games", "/roadmap", "/status"];
test("public pages render at phone and laptop widths without critical accessibility violations", { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [375, 1024]) {
      const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: "reduce" });
      try {
        for (const pathname of routes) {
          const response = await page.goto(new URL(pathname, root).href, { waitUntil: "domcontentloaded", timeout: 25000 });
          assert.equal(response?.status(), 200, `${pathname} at ${width}px should respond 200`);
          assert.ok(await page.locator("main").count(), `${pathname} missing main landmark`);
          await page.addScriptTag({ content: axe.source });
          const violations = await page.evaluate(async () => {
            const result = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
            return result.violations.filter(v => v.impact === "critical").map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, html: n.html.slice(0, 350), summary: n.failureSummary })) }));
          });
          assert.deepEqual(violations, [], `Critical accessibility issues on ${pathname} at ${width}px`);
          // Catch large unintentional document-wide horizontal overflow.
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(overflow <= 2, `${pathname} overflows viewport by ${overflow}px at ${width}px`);
        }
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

test("game library search, sorting and keyboard controls work", { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(new URL("/games", root).href, { waitUntil: "networkidle" });
    const search = page.getByRole("textbox", { name: "Search games" });
    await search.fill("a-nonexistent-game-that-cannot-possibly-match");
    await assert.doesNotReject(() => page.getByText("No games match your filters").waitFor());
    await page.getByRole("button", { name: "Clear filters" }).click();
    await assert.doesNotReject(() => page.getByRole("group", { name: "Filter games by category" }).waitFor());
    const sort = page.getByRole("combobox", { name: "Sort games by" });
    await sort.focus();
    await sort.press("Enter");
    await assert.doesNotReject(() => page.getByRole("option", { name: "Most played" }).waitFor());
    await page.getByRole("option", { name: "Most played" }).click();
    assert.equal(await sort.getAttribute("aria-expanded"), "false");
  } finally { await browser.close(); }
});

test("protected cron endpoint rejects anonymous requests in browser test environment", { timeout: 30000 }, async () => {
  const response = await fetch(new URL("/api/cron/status-probe", root), { redirect: "manual", signal: AbortSignal.timeout(12000) });
  assert.equal(response.status, 401);
});
