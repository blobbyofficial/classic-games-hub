/**
 * Phase 6 independent browser accessibility acceptance.
 * Anonymous public routes only, isolated Next server, no accounts or telemetry.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const axe = require("axe-core");
const origin = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const routes = ["/", "/games", "/roadmap", "/status", "/login", "/register"];

test("public workflows meet automated critical/serious WCAG checks", { timeout: 180000 }, async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390, 1024]) {
      const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: "reduce" });
      try {
        for (const pathname of routes) {
          const response = await page.goto(new URL(pathname, origin).href, { waitUntil: "domcontentloaded", timeout: 25000 });
          assert.equal(response?.status(), 200, `${pathname} HTTP status at ${width}px`);
          await page.addScriptTag({ content: axe.source });
          const failures = await page.evaluate(async () => {
            const r = await window.axe.run(document, {
              runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
            });
            return r.violations.filter(v => ["critical", "serious"].includes(v.impact))
              .map(v => ({ rule: v.id, impact: v.impact, elements: v.nodes.map(n => n.target.join(" ")) }));
          });
          assert.deepEqual(failures, [], `${pathname} WCAG issues at ${width}px`);
          assert.equal(await page.locator("main").count(), 1, `${pathname} should expose one main landmark`);
        }
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
