// Generates simple, on-brand SVG thumbnails for every game so the library and
// cards have consistent art without external image dependencies.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "games", "thumbs");
mkdirSync(outDir, { recursive: true });

/** slug -> { grad: [from, to], glyph: inner SVG markup, label } */
const GAMES = {
  snake: { grad: ["#0e7490", "#065f46"], glyph: dots() },
  tetris: { grad: ["#7c3aed", "#4338ca"], glyph: tetromino() },
  "2048": { grad: ["#b45309", "#78350f"], glyph: tile("2048") },
  breakout: { grad: ["#0369a1", "#0c4a6e"], glyph: bricks() },
  pong: { grad: ["#334155", "#0f172a"], glyph: pong() },
  asteroids: { grad: ["#1e293b", "#020617"], glyph: ship() },
  invaders: { grad: ["#166534", "#052e16"], glyph: invader() },
  frogger: { grad: ["#15803d", "#14532d"], glyph: frog() },
  runner: { grad: ["#0891b2", "#155e75"], glyph: runner() },
  target: { grad: ["#dc2626", "#7f1d1d"], glyph: target() },
  match3: { grad: ["#db2777", "#831843"], glyph: gems() },
  bubble: { grad: ["#2563eb", "#1e3a8a"], glyph: bubbles() },
  mines: { grad: ["#475569", "#1e293b"], glyph: mine() },
  memory: { grad: ["#7c3aed", "#5b21b6"], glyph: cards() },
  slide: { grad: ["#0d9488", "#134e4a"], glyph: tile("15") },
  mastermind: { grad: ["#9333ea", "#581c87"], glyph: pegs() },
  hangman: { grad: ["#57534e", "#292524"], glyph: word() },
  simon: { grad: ["#ca8a04", "#713f12"], glyph: simon() },
  tictactoe: { grad: ["#0284c7", "#075985"], glyph: grid3() },
  connect4: { grad: ["#1d4ed8", "#1e3a8a"], glyph: connect() },
  reversi: { grad: ["#065f46", "#022c22"], glyph: reversi() },
  whack: { grad: ["#a16207", "#713f12"], glyph: mole() },
  lightsout: { grad: ["#4f46e5", "#312e81"], glyph: lights() },
};

function wrap(id, from, to, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" width="480" height="300">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <pattern id="grid${id}" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>
    </pattern>
  </defs>
  <rect width="480" height="300" fill="url(#bg${id})"/>
  <rect width="480" height="300" fill="url(#grid${id})"/>
  <g transform="translate(240 150)" fill="#fff">${inner}</g>
</svg>`;
}

function dots() {
  return `<circle cx="0" cy="30" r="26"/><circle cx="-40" cy="-10" r="20" opacity="0.6"/><circle cx="42" cy="-10" r="20" opacity="0.6"/><circle cx="0" cy="-46" r="20" opacity="0.6"/>`;
}
function tetromino() {
  return `<g transform="translate(-45 -45)"><rect x="0" y="30" width="30" height="30" rx="4"/><rect x="30" y="30" width="30" height="30" rx="4" opacity="0.85"/><rect x="60" y="30" width="30" height="30" rx="4" opacity="0.7"/><rect x="30" y="0" width="30" height="30" rx="4" opacity="0.55"/></g>`;
}
function tile(t) {
  return `<rect x="-55" y="-45" width="110" height="90" rx="14" opacity="0.95"/><text x="0" y="14" font-family="system-ui" font-weight="800" font-size="42" fill="#1e1b3a" text-anchor="middle">${t}</text>`;
}
function bricks() {
  let r = "";
  for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) r += `<rect x="${-90 + x * 46}" y="${-40 + y * 22}" width="42" height="18" rx="3" opacity="${0.9 - y * 0.2}"/>`;
  return r + `<circle cx="0" cy="52" r="8"/>`;
}
function pong() {
  return `<rect x="-96" y="-30" width="12" height="60" rx="6"/><rect x="84" y="-10" width="12" height="60" rx="6"/><circle cx="0" cy="0" r="10"/><rect x="-2" y="-60" width="4" height="120" opacity="0.3"/>`;
}
function ship() {
  return `<path d="M0 -46 L34 42 L0 22 L-34 42 Z"/><circle cx="70" cy="-30" r="16" opacity="0.6"/><circle cx="-60" cy="30" r="12" opacity="0.5"/>`;
}
function invader() {
  return `<g transform="translate(-45 -36)"><rect x="12" y="0" width="12" height="12"/><rect x="48" y="0" width="12" height="12"/><rect x="0" y="12" width="72" height="12"/><rect x="0" y="24" width="72" height="12"/><rect x="12" y="36" width="12" height="12"/><rect x="48" y="36" width="12" height="12"/></g>`;
}
function frog() {
  return `<circle cx="0" cy="6" r="34"/><circle cx="-16" cy="-24" r="12"/><circle cx="16" cy="-24" r="12"/><circle cx="-16" cy="-24" r="5" fill="#14532d"/><circle cx="16" cy="-24" r="5" fill="#14532d"/>`;
}
function runner() {
  return `<circle cx="-6" cy="-34" r="12"/><rect x="-14" y="-20" width="16" height="34" rx="6" transform="rotate(12)"/><rect x="-40" y="40" width="90" height="8" rx="4" opacity="0.4"/>`;
}
function target() {
  return `<circle r="46" fill="none" stroke="#fff" stroke-width="8"/><circle r="28" fill="none" stroke="#fff" stroke-width="8" opacity="0.8"/><circle r="8"/>`;
}
function gems() {
  return `<path d="M-40 -20 L-20 -40 L0 -20 L-20 0 Z"/><path d="M8 -10 L28 -30 L48 -10 L28 10 Z" opacity="0.8"/><path d="M-16 20 L4 0 L24 20 L4 40 Z" opacity="0.6"/>`;
}
function bubbles() {
  return `<circle cx="-30" cy="-18" r="22"/><circle cx="20" cy="-24" r="18" opacity="0.8"/><circle cx="-4" cy="24" r="20" opacity="0.65"/>`;
}
function mine() {
  return `<circle r="30"/><g stroke="#fff" stroke-width="7">${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<line x1="${Math.cos(a) * 30}" y1="${Math.sin(a) * 30}" x2="${Math.cos(a) * 46}" y2="${Math.sin(a) * 46}"/>`; }).join("")}</g>`;
}
function cards() {
  return `<rect x="-58" y="-40" width="52" height="72" rx="8"/><rect x="6" y="-40" width="52" height="72" rx="8" opacity="0.7"/>`;
}
function pegs() {
  let r = "";
  const c = ["#ef4444", "#22d3ee", "#fbbf24", "#34d399"];
  for (let i = 0; i < 4; i++) r += `<circle cx="${-54 + i * 36}" cy="0" r="15" fill="${c[i]}"/>`;
  return r;
}
function word() {
  return `<rect x="-70" y="30" width="140" height="8" rx="4"/><text x="0" y="0" font-family="monospace" font-weight="800" font-size="46" text-anchor="middle">_A_</text>`;
}
function simon() {
  return `<path d="M-50 -50 A70 70 0 0 1 0 -70 L0 -8 Z" fill="#22c55e"/><path d="M0 -70 A70 70 0 0 1 50 -50 L0 -8 Z" fill="#ef4444"/><path d="M50 -50 A70 70 0 0 1 0 12 L0 -8 Z" fill="#eab308" transform="rotate(90)"/><circle cx="0" cy="-8" r="18" fill="#111"/>`;
}
function grid3() {
  return `<g stroke="#fff" stroke-width="6"><line x1="-18" y1="-54" x2="-18" y2="54"/><line x1="18" y1="-54" x2="18" y2="54"/><line x1="-54" y1="-18" x2="54" y2="-18"/><line x1="-54" y1="18" x2="54" y2="18"/></g><text x="-36" y="-24" font-size="30" font-weight="800" text-anchor="middle">X</text><circle cx="36" cy="36" r="13" fill="none" stroke="#fff" stroke-width="6"/>`;
}
function connect() {
  let r = `<rect x="-66" y="-50" width="132" height="100" rx="12" opacity="0.25"/>`;
  const c = ["#ef4444", "#fbbf24"];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) r += `<circle cx="${-48 + x * 32}" cy="${-30 + y * 30}" r="12" fill="${(x + y) % 2 ? c[0] : c[1]}"/>`;
  return r;
}
function reversi() {
  let r = "";
  for (let i = 0; i < 3; i++) r += `<circle cx="${-40 + i * 40}" cy="0" r="18" fill="${i === 1 ? "#fff" : "#111"}" stroke="#fff" stroke-width="2"/>`;
  return r;
}
function mole() {
  return `<ellipse cx="0" cy="40" rx="52" ry="16" opacity="0.3"/><circle cx="0" cy="6" r="30"/><circle cx="-10" cy="0" r="5" fill="#111"/><circle cx="10" cy="0" r="5" fill="#111"/><ellipse cx="0" cy="14" rx="8" ry="5" fill="#111"/>`;
}
function lights() {
  let r = "";
  const on = [0, 2, 3, 5, 8];
  for (let i = 0; i < 9; i++) r += `<rect x="${-54 + (i % 3) * 40}" y="${-54 + Math.floor(i / 3) * 40}" width="30" height="30" rx="6" opacity="${on.includes(i) ? 1 : 0.3}"/>`;
  return r;
}

let n = 0;
for (const [slug, { grad, glyph }] of Object.entries(GAMES)) {
  writeFileSync(join(outDir, `${slug}.svg`), wrap(n++, grad[0], grad[1], glyph));
}
console.log(`Generated ${n} thumbnails in public/games/thumbs`);
