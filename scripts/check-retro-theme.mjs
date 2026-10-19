// Run: node scripts/check-retro-theme.mjs
// Source-level guards only; not a substitute for build/browser QA.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const layout = read("app/layout.tsx");
const css = read("styles/themes/retro.css");
const themes = read("lib/themes.ts");
const validator = read("lib/validators.ts");
assert.match(layout,/Press_Start_2P/, "Real pixel display font must be loaded");
assert.match(layout,/styles\/themes\/retro\.css/, "Retro stylesheet must be imported");
assert.match(css,/html:not\(\.dark\)\[data-site-theme="retro"\]/, "Retro light scope missing");
assert.match(css,/html\.dark\[data-site-theme="retro"\]:not\(\[data-season="halloween"\]\)/, "Retro dark palette must exclude Halloween");
assert.match(css,/--retro-pixel-font:/);
assert.match(css,/\.retro-pixel-label[\\s\\S]*font-family: var\(--retro-pixel-font\)/, "Short arcade labels should use the pixel font");
assert.match(css,/font-family: var\(--font-geist-sans\)/, "Main headings must remain legible");
assert.doesNotMatch(css,/text-transform: uppercase;/, "Retro should not uppercase every heading");
for(const cls of [".halloween-navigation",".halloween-sidebar",".halloween-mobile-nav",".halloween-game-card",".halloween-ui-card",".halloween-ui-button",".halloween-player-stage"]){
 assert.ok(css.includes(cls), "Missing retro component treatment: " + cls);
}
assert.match(css,/prefers-reduced-motion: reduce/);
for (const fragment of ["--background: #10111b", "--primary: #a9a0ff", "html[data-site-theme=\"retro\"]:not([data-season=\"halloween\"]) .halloween-game-card", "html[data-site-theme=\"retro\"]:not([data-season=\"halloween\"]) .halloween-player-stage"]) {
  assert.ok(css.includes(fragment), `Missing Retro Night rule: ${fragment}`);
}
assert.match(themes,/id: "retro"/);
assert.ok(validator.includes('"retro"'));
assert.match(read("database/migrations/0114_single_release_theme_entitlements.sql"), /new.site_theme = 'retro'/);
assert.match(read("app/layout.tsx"), /canUseSiteTheme/);
console.log("Retro Day/Night checks passed (readable typography, palettes, surfaces, secured entitlement).");
