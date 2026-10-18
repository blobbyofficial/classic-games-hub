// Run: node scripts/check-red-theme.mjs
// Static regression checks; browser/DB behaviour requires deployed integration tests.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const css = read("styles/themes/red.css");
const layout = read("app/layout.tsx");
const themes = read("lib/themes.ts");
const validators = read("lib/validators.ts");
const picker = read("features/settings/site-theme-picker.tsx");
const pref = read("features/settings/preferences-settings.tsx");
const migration = read("database/migrations/0113_velvet_red_site_theme.sql");
assert.ok(layout.includes('import "@/styles/themes/red.css"'), "Red stylesheet must load");
assert.ok(themes.includes('id: "red"'), "Red must be selectable");
assert.ok(validators.includes('"default", "red"'), "Red must be accepted by server validator");
assert.ok(migration.includes("'halloween', 'red'"), "DB must allow free Red");
assert.match(css, /html\[data-site-theme="red"\],\s*html\.dark\[data-site-theme="red"\]/, "Red must be identical in both modes");
assert.ok(css.includes("color-scheme: dark"), "Fixed appearance should own its browser chrome");
assert.ok(css.includes(".site-appearance-toggle") && css.includes(".site-appearance-row"), "Appearance toggles must be hidden in fixed Red");
assert.ok(pref.includes("red-fixed-mode-note"), "Explain fixed Red appearance");
assert.ok(picker.includes("Velvet Red"), "Red must be explained in picker");
for (const selector of [".halloween-navigation",".halloween-sidebar",".halloween-mobile-nav",".halloween-search",".halloween-game-card",".halloween-ui-button",".halloween-ui-input",".halloween-player-shell",".halloween-player-stage"]) {
  assert.ok(css.includes(selector), "Missing themed surface " + selector);
}
assert.ok(css.includes("prefers-reduced-motion: reduce"), "Reduced motion guard missing");
assert.ok(!themes.includes('id: "premium"') && !themes.includes('id: "retro"'), "Locked unfinished themes must stay unreleased");
console.log("Velvet Red static checks passed (fixed mode, catalogue, migration, surfaces).");
