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
            return result.violations.filter(v => v.impact === "critical");
          });
          assert.deepEqual(violations.map(v => `${v.id}: ${v.nodes.length} nodes`), [], `Critical accessibility issues on ${pathname} at ${width}px`);
          // Catch large unintentional document-wide horizontal overflow.
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(overflow <= 2, `${pathname} overflows viewport by ${overflow}px at ${width}px`);
        }
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
