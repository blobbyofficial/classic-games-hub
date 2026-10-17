// Run: node scripts/check-halloween.mjs
// Fast source-level guardrails. This is not a replacement for the production build or browser QA.
import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("styles/seasons/halloween.css");
const layout=read("app/layout.tsx");
const season=read("lib/seasonal-theme.ts");
const home=read("app/(main)/page.tsx");
const event=read("components/shell/seasonal-banner.tsx");
for(const file of ["public/seasons/halloween/arcade.svg","public/seasons/halloween/night-sky.svg"]) {
  assert.ok(existsSync(new URL("../"+file,import.meta.url)),file+" missing");
  assert.ok(css.includes("/"+file.replace(/^public\//,"")),file+" not referenced");
}
assert.match(layout,/data-season=\{activeSeason\(\)/);
assert.match(layout,/styles\/seasons\/halloween\.css/);
assert.match(season,/override === "off"/);
assert.match(season,/override === "halloween"/);
assert.match(home,/halloween=\{activeSeason\(\) === "halloween"\}/);
assert.match(event,/halloween-seasonal-banner/);
assert.match(css,/html\[data-season=["']halloween["']\]/);
assert.match(css,/prefers-reduced-motion/);
console.log("Halloween source checks passed (assets, activation, scope, accessibility).");
