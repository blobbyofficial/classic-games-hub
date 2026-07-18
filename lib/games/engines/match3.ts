import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

const match3: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const N = 8;
  const size = Math.min(width, height);
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / N;
  const GEMS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#06b6d4"];
  let grid: number[][] = [];
  let sel: { r: number; c: number } | null = null;
  let score = 0;
  let timeLeft = 90;
  let running = true;
  let last = performance.now();
  let raf = 0;

  function fill() {
    grid = Array.from({ length: N }, () => Array.from({ length: N }, () => Math.floor(Math.random() * GEMS.length)));
    while (findMatches().size) {
      findMatches().forEach((k) => {
        const [r, c] = k.split(",").map(Number);
        grid[r][c] = Math.floor(Math.random() * GEMS.length);
      });
    }
  }

  function reset() {
    fill();
    sel = null;
    score = 0;
    timeLeft = 90;
    running = true;
    last = performance.now();
    onScore(0);
    onStatus?.("Swap gems to match 3+");
  }

  function findMatches(): Set<string> {
    const m = new Set<string>();
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N - 2; c++)
        if (grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2])
          [c, c + 1, c + 2].forEach((cc) => m.add(`${r},${cc}`));
    for (let c = 0; c < N; c++)
      for (let r = 0; r < N - 2; r++)
        if (grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c])
          [r, r + 1, r + 2].forEach((rr) => m.add(`${rr},${c}`));
    return m;
  }

  function resolve() {
    let combo = 0;
    const tick = () => {
      const m = findMatches();
      if (!m.size) return;
      combo++;
      score += m.size * 10 * combo;
      onScore(score);
      beep(440 + combo * 80, 0.05);
      m.forEach((k) => {
        const [r, c] = k.split(",").map(Number);
        grid[r][c] = -1;
      });
      // gravity
      for (let c = 0; c < N; c++) {
        const col = [];
        for (let r = N - 1; r >= 0; r--) if (grid[r][c] !== -1) col.push(grid[r][c]);
        for (let r = N - 1; r >= 0; r--) grid[r][c] = col[N - 1 - r] ?? Math.floor(Math.random() * GEMS.length);
      }
      setTimeout(tick, 140);
    };
    tick();
  }

  function trySwap(a: { r: number; c: number }, b: { r: number; c: number }) {
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return;
    [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
    if (findMatches().size) {
      resolve();
    } else {
      [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
      beep(180, 0.06, "sawtooth");
    }
  }

  function render() {
    const now = performance.now();
    if (running) {
      timeLeft -= (now - last) / 1000;
      if (timeLeft <= 0) {
        timeLeft = 0;
        running = false;
        onStatus?.("Time!");
        onGameOver(score, 0);
      }
    }
    last = now;

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        if (grid[r][c] < 0) continue;
        const x = ox + c * cell;
        const y = oy + r * cell;
        const isSel = sel && sel.r === r && sel.c === c;
        ctx.fillStyle = GEMS[grid[r][c]];
        ctx.save();
        if (isSel) {
          ctx.shadowColor = "#fff";
          ctx.shadowBlur = 14;
        }
        roundRect(ctx, x + cell * 0.12, y + cell * 0.12, cell * 0.76, cell * 0.76, cell * 0.2);
        ctx.fill();
        ctx.restore();
      }
    ctx.fillStyle = pal.fg;
    ctx.font = "bold 15px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`, ox, oy - 6 < 12 ? 18 : oy - 6);
    raf = requestAnimationFrame(render);
  }

  const onDown = (e: PointerEvent) => {
    if (!running) {
      reset();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return;
    const c = Math.floor(mx / cell);
    const r = Math.floor(my / cell);
    if (!sel) sel = { r, c };
    else {
      trySwap(sel, { r, c });
      sel = null;
    }
  };

  canvas.addEventListener("pointerdown", onDown);
  reset();
  render();

  return {
    pause: () => {},
    resume: () => {},
    restart: () => reset(),
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
    },
  };
};

export default match3;
