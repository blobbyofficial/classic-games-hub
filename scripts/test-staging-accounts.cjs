/** Explicitly opt-in two-account acceptance on an isolated staging site.
 * No purchases, messages or profile writes are made by this test.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const origin = process.env.STAGING_SITE_URL;
const credentials = [
  [process.env.STAGING_PLAYER_A_EMAIL, process.env.STAGING_PLAYER_A_PASSWORD],
  [process.env.STAGING_PLAYER_B_EMAIL, process.env.STAGING_PLAYER_B_PASSWORD],
];
if (!origin || process.env.STAGING_ISOLATED_CONFIRMED !== "yes") {
  throw Error("Explicit staging site URL and isolated-environment confirmation are required");
}
const url = new URL(origin);
if (url.protocol !== "https:" || url.hostname === "classic-games-hub.blobbyofficial.com" ||
    url.hostname === "blobbyofficial.com" || url.hostname.endsWith(".vercel.app") === false && !url.hostname.includes("staging")) {
  throw Error("Refusing to exercise an unrecognized or production site URL");
}
if (credentials.some(([email,password]) => !email || !password)) {
  throw Error("Two disposable staging test accounts are required");
}
if (credentials[0][0] === credentials[1][0]) throw Error("Staging test accounts must be distinct");

test("two isolated authenticated sessions can navigate private routes without auth redirects", { timeout: 150000 }, async () => {
  const browser = await chromium.launch();
  try {
    for (const [email, password] of credentials) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const page = await context.newPage();
        await page.goto(new URL("/login?next=%2Ffriends", url).href, { waitUntil: "domcontentloaded" });
        await page.getByLabel("Username or email").fill(email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.getByRole("button", { name: "Log in" }).click();
        await page.waitForURL(path => !path.pathname.startsWith("/login"), { timeout: 20000 });
        for (const path of ["/friends", "/notifications", "/settings?tab=privacy"]) {
          const response = await page.goto(new URL(path, url).href, { waitUntil: "domcontentloaded" });
          assert.ok(response && response.status() < 500, `Route failed: ${path}`);
          assert.notEqual(new URL(page.url()).pathname, "/login", `Private route redirected: ${path}`);
          assert.ok(await page.locator("main").count(), `No main landmark: ${path}`);
        }
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
});
