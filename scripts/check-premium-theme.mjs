// Run with node scripts/check-premium-theme.mjs
// Static checks: these do not substitute for a production build or visual QA.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const css = read("styles/themes/premium.css");
const layout = read("app/layout.tsx");
const catalogue = read("lib/themes.ts");
const schema = read("lib/validators.ts");
assert.ok(layout.includes('import "@/styles/themes/premium.css";'), "Premium stylesheet must load");
assert.match(css, /html\.dark\[data-site-theme="premium"\]:not\(\[data-season="halloween"\]\)/);
assert.match(css, /html:not\(\.dark\)\[data-site-theme="premium"\]:not\(\[data-season="halloween"\]\)/, "Premium Day must be explicitly light-scoped");
for (const token of ["--background", "--foreground", "--card", "--primary", "--primary-foreground", "--ring", "--border", "--input", "--popover"]) {
  assert.ok(css.includes(token + ":"), "Missing premium colour token " + token);
}
for (const selector of [".halloween-navigation", ".halloween-sidebar", ".halloween-mobile-nav", ".halloween-search", ".halloween-game-card", ".halloween-ui-button", ".halloween-player-stage"]) {
  assert.ok(css.includes(selector), "Premium surface missing: " + selector);
}
assert.match(css, /prefers-reduced-motion: reduce/, "Reduced-motion rules missing");
assert.ok(!/id:\s*["']premium["']/.test(catalogue), "Premium must not become selectable before entitlement checks");
assert.ok(!schema.includes('"premium"'), "Premium must not be accepted for settings writes before gate");
for (const mode of ['html.dark[data-site-theme="premium"]:not([data-season="halloween"])', 'html:not(.dark)[data-site-theme="premium"]:not([data-season="halloween"])']) {
  assert.ok(css.includes(mode), `Missing scoped Premium variant: ${mode}`);
}
console.log("Atelier Night/Day static checks passed (isolation, tokens, surfaces, locked status).");
