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
const card=read("components/games/game-card.tsx");
const player=read("features/games/game-player.tsx");
const nav=read("components/shell/navbar.tsx");
for(const file of ["public/seasons/halloween/arcade.svg","public/seasons/halloween/night-sky.svg"]) {
  assert.ok(existsSync(new URL("../"+file,import.meta.url)),file+" missing");
  assert.ok(css.includes("/"+file.replace(/^public\//,"")),file+" not referenced");
}
assert.match(layout,/data-season=\{halloweenEnabled/);
assert.match(layout,/styles\/seasons\/halloween\.css/);
assert.match(season,/override === "off"/);
assert.match(season,/override === "halloween"/);
assert.match(home,/halloween=\{activeSeason\(\) === "halloween"/);
assert.match(event,/halloween-seasonal-banner/);
assert.match(event,/event\.multiplier, event\.message/);
assert.match(card,/halloween-game-card/);
assert.match(player,/halloween-player-stage/);
assert.match(nav,/halloween-navigation/);
assert.match(css,/html\[data-season=["']halloween["']\]/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/\.halloween-hero::after/);
assert.ok(!css.includes(".halloween-normal-heading"),"obsolete heading selector");
console.log("Halloween source checks passed (assets, activation, scope, accessibility).");
