import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

const N = 4;
const COLORS: Record<number, string> = {
  2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563", 32: "#f67c5f",
  64: "#f65e3b", 128: "#edcf72", 256: "#edcc61", 512: "#edc850", 1024: "#edc53f",
  2048: "#edc22e",
};

const g2048: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const size = Math.min(width, height);
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const gap = size * 0.03;
  const cell = (size - gap * (N + 1)) / N;
  const pal = palette();

  let grid: number[][];
  let score = 0;
  let alive = true;
  let anim = 0;

  function reset() {
    grid = Array.from({ length: N }, () => Array<number>(N).fill(0));
    score = 0;
    alive = true;
    addTile();
    addTile();
    onScore(0);
    onStatus?.("");
  }

  function addTile() {
    const empty: [number, number][] = [];
    grid.forEach((row, y) => row.forEach((v, x) => v === 0 && empty.push([x, y])));
    if (empty.length === 0) return;
    const [x, y] = empty[Math.floor(Math.random() * empty.length)];
    grid[y][x] = Math.random() < 0.9 ? 2 : 4;
    anim = 1;
  }

  function slideRow(row: number[]): { row: number[]; gained: number } {
    const filtered = row.filter((v) => v);
    const result: number[] = [];
    let gained = 0;
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] === filtered[i + 1]) {
        result.push(filtered[i] * 2);
        gained += filtered[i] * 2;
        i++;
      } else {
        result.push(filtered[i]);
      }
    }
    while (result.length < N) result.push(0);
    return { row: result, gained };
  }

  function rotateCW(g: number[][]): number[][] {
    return g[0].map((_, i) => g.map((r) => r[i]).reverse());
  }

  function move(dir: number) {
    if (!alive) return;
    let g = grid.map((r) => [...r]);
    for (let i = 0; i < dir; i++) g = rotateCW(g);
    let moved = false;
    let gained = 0;
    g = g.map((row) => {
      const { row: nr, gained: gg } = slideRow(row);
      gained += gg;
      if (nr.some((v, i) => v !== row[i])) moved = true;
      return nr;
    });
    for (let i = 0; i < (4 - dir) % 4; i++) g = rotateCW(g);
    if (!moved) return;
    grid = g;
    score += gained;
    if (gained) beep(440 + Math.log2(gained) * 40, 0.05);
    onScore(score);
    addTile();
    if (!canMove()) {
      alive = false;
      onStatus?.("No moves left");
      onGameOver(score, 0);
    }
  }

  function canMove(): boolean {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (grid[y][x] === 0) return true;
        if (x < N - 1 && grid[y][x] === grid[y][x + 1]) return true;
        if (y < N - 1 && grid[y][x] === grid[y + 1][x]) return true;
      }
    return false;
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    roundRect(ctx, ox, oy, size, size, 8);
    ctx.fill();
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const px = ox + gap + x * (cell + gap);
        const py = oy + gap + y * (cell + gap);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        roundRect(ctx, px, py, cell, cell, 6);
        ctx.fill();
        const v = grid[y][x];
        if (v) {
          ctx.fillStyle = COLORS[v] ?? "#3c3a32";
          roundRect(ctx, px, py, cell, cell, 6);
          ctx.fill();
          ctx.fillStyle = v <= 4 ? "#776e65" : "#fff";
          ctx.font = `bold ${cell * (v >= 1024 ? 0.3 : 0.4)}px system-ui`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(v), px + cell / 2, py + cell / 2 + 2);
        }
      }
  }

  function onKey(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") move(1);
    else if (k === "arrowright" || k === "d") move(2);
    else if (k === "arrowdown" || k === "s") move(3);
    else if (k === "arrowleft" || k === "a") move(0);
    else if (k === "r") reset();
    else return;
    e.preventDefault();
  }

  let touch: { x: number; y: number } | null = null;
  const ts = (e: TouchEvent) => (touch = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const te = (e: TouchEvent) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 2 : 0);
    else move(dy > 0 ? 3 : 1);
    touch = null;
  };

  window.addEventListener("keydown", onKey);
  canvas.addEventListener("touchstart", ts, { passive: true });
  canvas.addEventListener("touchend", te, { passive: true });

  let raf = 0;
  const draw = () => {
    render();
    raf = requestAnimationFrame(draw);
  };
  reset();
  draw();

  return {
    pause: () => {},
    resume: () => {},
    restart: () => reset(),
    destroy: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("touchstart", ts);
      canvas.removeEventListener("touchend", te);
    },
  };
};

export default g2048;
