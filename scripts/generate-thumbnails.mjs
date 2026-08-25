// Generates the game thumbnails as ONE visual system.
//
// The previous set gave every game its own arbitrary dark gradient - teal,
// amber, slate, green - so twenty-four cards side by side read as a pile of
// unrelated art rather than one product. Now every thumbnail shares the same
// near-black base, the same grid, the same vignette and the same glyph
// treatment, and a game's identity comes from a single accent hue drawn from a
// six-colour ramp. Consistent frame, varied accent.
//
// Still SVG and still generated, so the whole set costs a few kB, stays sharp
// at any card size, and a change to the system is one edit here rather than
// twenty-four.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "games", "thumbs");
mkdirSync(outDir, { recursive: true });

/**
 * The accent ramp. Six hues, all pulled toward the site's neon palette so they
 * sit together; nothing muddy or desaturated, which is what made the old set
 * look accidental.
 */
const VIOLET = "#a78bfa";
const CYAN = "#22d3ee";
const PINK = "#f472b6";
const AMBER = "#fbbf24";
const EMERALD = "#34d399";
const SKY = "#38bdf8";

/** slug -> { accent, glyph: inner SVG markup } */
const GAMES = {
  snake: { accent: EMERALD, glyph: dots() },
  slithery: { accent: EMERALD, glyph: dots() },
  tetris: { accent: VIOLET, glyph: tetromino() },
  "2048": { accent: AMBER, glyph: tile("2048") },
  breakout: { accent: SKY, glyph: bricks() },
  pong: { accent: CYAN, glyph: pong() },
  asteroids: { accent: VIOLET, glyph: ship() },
  invaders: { accent: EMERALD, glyph: invader() },
  frogger: { accent: EMERALD, glyph: frog() },
  runner: { accent: CYAN, glyph: runner() },
  target: { accent: PINK, glyph: target() },
  match3: { accent: PINK, glyph: gems() },
  bubble: { accent: SKY, glyph: bubbles() },
  mines: { accent: AMBER, glyph: mine() },
  memory: { accent: VIOLET, glyph: cards() },
  slide: { accent: CYAN, glyph: tile("15") },
  mastermind: { accent: VIOLET, glyph: pegs() },
  hangman: { accent: SKY, glyph: word() },
  simon: { accent: AMBER, glyph: simon() },
  tictactoe: { accent: CYAN, glyph: grid3() },
  connect4: { accent: SKY, glyph: connect() },
  reversi: { accent: EMERALD, glyph: reversi() },
  whack: { accent: AMBER, glyph: mole() },
  lightsout: { accent: VIOLET, glyph: lights() },
  racer: { accent: PINK, glyph: racecar() },
  rubiks: { accent: EMERALD, glyph: cube() },
  labyrinth: { accent: SKY, glyph: corridor() },
};

function corridor() {
  // One-point perspective: left wall, right wall, floor and the far end, with
  // the exit post standing in it. Reads as depth at card size, which is the
  // whole point of the game.
  const O = 92;
  const I = 24;
  const oy = O * 0.62;
  const iy = I * 0.62;
  return `<g>
    <path d="M${-O} ${-oy} L${-I} ${-iy} L${-I} ${iy} L${-O} ${oy} Z" opacity="0.8"/>
    <path d="M${O} ${-oy} L${I} ${-iy} L${I} ${iy} L${O} ${oy} Z" opacity="0.55"/>
    <path d="M${-O} ${oy} L${-I} ${iy} L${I} ${iy} L${O} ${oy} Z" opacity="0.28"/>
    <rect x="${-I}" y="${-iy}" width="${I * 2}" height="${iy * 2}" opacity="0.16"/>
    <rect x="-4.5" y="-13" width="9" height="26" rx="3" fill="#34d399"/>
  </g>`;
}

function cube() {
  // An isometric 3x3 cube: three visible faces, each a tiled 3x3 grid. The
  // cells tile exactly, so a stroke in the base colour is what draws the gaps
  // between stickers - cheaper than insetting nine quads per face.
  const S = 20; // cell edge
  const W = S * 0.87; // horizontal run of one isometric step
  const H = S * 0.5; // vertical rise of one isometric step
  const cell = (d, shade) =>
    `<path d="${d}" opacity="${shade}" stroke="#0b0a14" stroke-width="2.5" stroke-linejoin="round"/>`;

  const parts = [];
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      const chequer = (a + b) % 2;
      // Top face: brightest, both axes running up and out from the centre.
      parts.push(
        cell(
          `M${(a - b) * W} ${(a + b) * H - S * 1.5} l${W} ${H} l${-W} ${H} l${-W} ${-H} Z`,
          0.88 + chequer * 0.12,
        ),
      );
      // Left face: in shadow, dropping from the top face's left edge.
      parts.push(
        cell(
          `M${-W * 3 + a * W} ${a * H + b * S} l${W} ${H} l0 ${S} l${-W} ${-H} Z`,
          0.24 + chequer * 0.1,
        ),
      );
      // Right face: mid-tone, dropping from the top face's right edge.
      parts.push(
        cell(
          `M${a * W} ${S * 1.5 - a * H + b * S} l${W} ${-H} l0 ${S} l${-W} ${H} Z`,
          0.5 + chequer * 0.12,
        ),
      );
    }
  }
  // The cube runs from -1.5S to 4.5S vertically; lift it so it sits centred.
  return `<g transform="translate(0 ${-S * 1.5})">${parts.join("")}</g>`;
}

function racecar() {
  // Perspective road + car silhouette.
  return `<g>
    <path d="M-16 -80 L16 -80 L120 100 L-120 100 Z" fill="#1f2333"/>
    <path d="M-2 -80 L2 -80 L10 100 L-10 100 Z" fill="#fff" opacity="0.5"/>
    <circle cx="0" cy="-92" r="18" fill="#fbbf24" opacity="0.9"/>
    <g transform="translate(0 55)">
      <rect x="-34" y="-16" width="68" height="34" rx="9"/>
      <rect x="-20" y="-26" width="40" height="16" rx="6" opacity="0.7"/>
      <rect x="-40" y="6" width="12" height="14" rx="3" fill="#0b0a12"/>
      <rect x="28" y="6" width="12" height="14" rx="3" fill="#0b0a12"/>
    </g>
  </g>`;
}

function wrap(id, accent, inner) {
  // Glyphs are scaled up as a group: they were drawn for the old flat cards
  // and sat marooned in the middle of the new vignette.
  // Shared frame, accent-driven identity. Layer order matters: base, then the
  // accent grid, then the glow on top of it so the grid reads through the
  // brightest area, then the vignette to pull the eye to the centre, then the
  // glyph, then a hairline of the accent to tie the card to its art.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" width="480" height="300">
  <defs>
    <linearGradient id="b${id}" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#1a1430"/><stop offset="1" stop-color="#0b0a14"/>
    </linearGradient>
    <radialGradient id="w${id}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.42"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="v${id}" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.45"/>
    </radialGradient>
    <pattern id="g${id}" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="${accent}" stroke-opacity="0.10"/>
    </pattern>
  </defs>
  <rect width="480" height="300" fill="url(#b${id})"/>
  <rect width="480" height="300" fill="url(#g${id})"/>
  <ellipse cx="240" cy="150" rx="195" ry="145" fill="url(#w${id})"/>
  <rect width="480" height="300" fill="url(#v${id})"/>
  <g transform="translate(240 150) scale(1.35)" fill="#ffffff">${inner}</g>
  <rect x="0.5" y="0.5" width="479" height="299" fill="none" stroke="${accent}" stroke-opacity="0.22"/>
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
  // A figure mid-stride: head, leaning torso, one leg forward and one back,
  // one arm driving. The old version was a head and a single rectangle, which
  // read as a barbell rather than a person.
  return `<g stroke="#fff" stroke-width="11" stroke-linecap="round" fill="none">
    <path d="M-4 -18 L10 6"/>
    <path d="M10 6 L-14 26"/>
    <path d="M10 6 L34 22"/>
    <path d="M-4 -14 L-30 -2"/>
    <path d="M-4 -14 L22 -22"/>
  </g>
  <circle cx="0" cy="-38" r="14"/>
  <rect x="-46" y="42" width="92" height="7" rx="3.5" opacity="0.35"/>`;
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
  // Four quadrants of a disc with a dark hub. The old version used three
  // hand-placed arcs, one of them rotated, so it rendered lopsided.
  const q = (a, b, fill) => {
    const r = 62;
    const [x1, y1] = [Math.cos(a) * r, Math.sin(a) * r];
    const [x2, y2] = [Math.cos(b) * r, Math.sin(b) * r];
    return `<path d="M0 0 L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${fill}"/>`;
  };
  const H = Math.PI / 2;
  return (
    q(Math.PI, -H, "#22c55e") +
    q(-H, 0, "#ef4444") +
    q(0, H, "#eab308") +
    q(H, Math.PI, "#3b82f6") +
    `<circle r="20" fill="#0b0a14"/>`
  );
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
for (const [slug, { accent, glyph }] of Object.entries(GAMES)) {
  writeFileSync(join(outDir, `${slug}.svg`), wrap(n++, accent, glyph));
}
console.log(`Generated ${n} thumbnails in public/games/thumbs`);
