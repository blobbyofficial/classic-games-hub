/** Phase 4 mobile acceptance smoke against an isolated local build. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const origin = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
test("mobile navigation, search and library at roadmap widths", { timeout: 150000 }, async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [320, 360, 375, 390, 430]) {
      const page = await browser.newPage({ viewport: { width, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      try {
        for (const pathname of ["/", "/games", "/roadmap"]) {
          const response = await page.goto(new URL(pathname, origin).href, { waitUntil: "networkidle", timeout: 25000 });
          assert.equal(response?.status(), 200, `${pathname} at ${width}px`);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          assert.ok(overflow <= 2, `${pathname} overflows by ${overflow}px at ${width}px`);
          const nav = page.getByRole("navigation", { name: "Mobile primary navigation" });
          assert.equal(await nav.isVisible(), true);
          const links = nav.getByRole("link");
          assert.equal(await links.count(), 5);
          for (const link of await links.all()) {
            const box = await link.boundingBox();
            assert.ok(box && box.height >= 44, `Mobile tab target height below 44px at ${width}px`);
          }
        }
        await page.goto(new URL("/games",origin).href, { waitUntil: "networkidle" });
        const sort = page.getByRole("combobox", { name: "Sort games by" });
        assert.equal(await sort.isVisible(), true);
        const search = page.getByRole("textbox", { name: "Search games" });
        await search.fill("some-impossible-search-query-zzzx");
        await page.getByText("No games match your filters").waitFor();
        await page.getByRole("button", { name: "Clear filters" }).click();
        await page.getByRole("group", { name: "Filter games by category" }).waitFor();
        const menu = page.getByRole("button", { name: "Open menu" });
        await menu.click();
        await page.getByRole("dialog", { name: "Navigation menu" }).waitFor();
        await page.getByRole("button", { name: "Close navigation menu" }).click();
        await page.getByRole("dialog", { name: "Navigation menu" }).waitFor({ state: "hidden" });
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
