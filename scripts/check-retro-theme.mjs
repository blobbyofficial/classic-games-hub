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
assert.match(css,/--retro-pixel-font:/);
assert.match(css,/font-family: var\(--retro-pixel-font\)/, "Headings should use actual pixel font");
for(const cls of [".halloween-navigation",".halloween-sidebar",".halloween-mobile-nav",".halloween-game-card",".halloween-ui-card",".halloween-ui-button",".halloween-player-stage"]){
 assert.ok(css.includes(cls), "Missing retro component treatment: " + cls);
}
assert.match(css,/prefers-reduced-motion:reduce/);
assert.ok(!/id:\s*["']retro["']/.test(themes),"Do not expose theme before level entitlement checks");
assert.ok(!validator.includes('"retro"'),"Do not accept theme before backend gating");
console.log("Retro Day source checks passed (font, isolation, components, locked status).");
