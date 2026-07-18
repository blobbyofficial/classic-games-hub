import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette, roundRect } from "../helpers";

const COLS = 10;
const ROWS = 20;
const SHAPES: Record<string, { cells: number[][]; color: string }> = {
  I: { cells: [[0, 1], [1, 1], [2, 1], [3, 1]], color: "#22d3ee" },
  O: { cells: [[1, 0], [2, 0], [1, 1], [2, 1]], color: "#fbbf24" },
  T: { cells: [[1, 0], [0, 1], [1, 1], [2, 1]], color: "#a78bfa" },
  S: { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: "#34d399" },
  Z: { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: "#f87171" },
  J: { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: "#60a5fa" },
  L: { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: "#fb923c" },
};
const KEYS = Object.keys(SHAPES);

const tetris: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const cell = Math.min(width / COLS, height / ROWS);
  const ox = (width - cell * COLS) / 2;
  const oy = (height - cell * ROWS) / 2;
  const pal = palette();

  let grid: (string | null)[][];
  let piece: { x: number; y: number; cells: number[][]; color: string };
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropAcc = 0;
  let alive = true;

  function spawn() {
    const key = KEYS[Math.floor(Math.random() * KEYS.length)];
    const s = SHAPES[key];
    piece = { x: 3, y: 0, cells: s.cells.map((c) => [...c]), color: s.color };
    if (collides(piece.cells, piece.x, piece.y)) {
      alive = false;
      beep(120, 0.3, "sawtooth");
      onStatus?.("Game over");
      onGameOver(score, lines);
    }
  }

  function reset() {
    grid = Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
    score = 0;
    lines = 0;
    level = 1;
    alive = true;
    onScore(0);
    onStatus?.("");
    spawn();
  }

  function collides(cells: number[][], px: number, py: number) {
    return cells.some(([cx, cy]) => {
      const x = px + cx;
      const y = py + cy;
      return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && grid[y][x]);
    });
  }

  function merge() {
    piece.cells.forEach(([cx, cy]) => {
      const y = piece.y + cy;
      if (y >= 0) grid[y][piece.x + cx] = piece.color;
    });
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (grid[y].every((c) => c)) {
        grid.splice(y, 1);
        grid.unshift(Array<string | null>(COLS).fill(null));
        cleared++;
        y++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += [0, 40, 100, 300, 1200][cleared] * level;
      level = 1 + Math.floor(lines / 10);
      onScore(score);
      beep(cleared >= 4 ? 880 : 520, 0.12);
    }
    spawn();
  }

  function rotate() {
    const rotated = piece.cells.map(([x, y]) => [3 - y, x]);
    // normalize
    const minX = Math.min(...rotated.map((c) => c[0]));
    const minY = Math.min(...rotated.map((c) => c[1]));
    const norm = rotated.map(([x, y]) => [x - minX, y - minY]);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(norm, piece.x + kick, piece.y)) {
        piece.cells = norm;
        piece.x += kick;
        return;
      }
    }
  }

  function move(dx: number) {
    if (!collides(piece.cells, piece.x + dx, piece.y)) piece.x += dx;
  }

  function softDrop() {
    if (!collides(piece.cells, piece.x, piece.y + 1)) {
      piece.y++;
      return true;
    }
    merge();
    return false;
  }

  function hardDrop() {
    while (!collides(piece.cells, piece.x, piece.y + 1)) piece.y++;
    score += 2;
    onScore(score);
    merge();
  }

  function update(dt: number) {
    if (!alive) return;
    dropAcc += dt;
    const speed = Math.max(0.05, 0.8 - (level - 1) * 0.07);
    if (dropAcc >= speed) {
      dropAcc = 0;
      softDrop();
    }
  }

  function drawCell(x: number, y: number, color: string) {
    ctx.fillStyle = color;
    roundRect(ctx, ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, ox + x * cell + 1, oy + y * cell + 1, cell - 2, (cell - 2) * 0.35, 3);
    ctx.fill();
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(ox, oy, cell * COLS, cell * ROWS);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(ox + x * cell, oy);
      ctx.lineTo(ox + x * cell, oy + ROWS * cell);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + y * cell);
      ctx.lineTo(ox + COLS * cell, oy + y * cell);
      ctx.stroke();
    }
    grid.forEach((row, y) => row.forEach((c, x) => c && drawCell(x, y, c)));
    if (alive) {
      // ghost
      let gy = piece.y;
      while (!collides(piece.cells, piece.x, gy + 1)) gy++;
      piece.cells.forEach(([cx, cy]) => {
        ctx.strokeStyle = piece.color + "66";
        ctx.strokeRect(ox + (piece.x + cx) * cell + 2, oy + (gy + cy) * cell + 2, cell - 4, cell - 4);
      });
      piece.cells.forEach(([cx, cy]) => piece.y + cy >= 0 && drawCell(piece.x + cx, piece.y + cy, piece.color));
    }
  }

  function onKey(e: KeyboardEvent) {
    if (!alive) {
      if (e.key.toLowerCase() === "r") reset();
      return;
    }
    switch (e.key) {
      case "ArrowLeft":
      case "a":
        move(-1);
        break;
      case "ArrowRight":
      case "d":
        move(1);
        break;
      case "ArrowDown":
      case "s":
        softDrop();
        break;
      case "ArrowUp":
      case "w":
        rotate();
        break;
      case " ":
        hardDrop();
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  window.addEventListener("keydown", onKey);
  reset();
  const loop = createLoop(update, render);

  return {
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    restart: () => reset(),
    destroy: () => {
      loop.stop();
      window.removeEventListener("keydown", onKey);
    },
  };
};

export default tetris;
