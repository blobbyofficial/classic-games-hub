import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

const mines: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const N = 9;
  const MINES = 10;
  const size = Math.min(width, height);
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / N;
  const NUM_COLORS = ["", "#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#f59e0b", "#06b6d4", "#e5e5e5", "#94a3b8"];

  interface Cell { mine: boolean; revealed: boolean; flagged: boolean; adj: number }
  let grid: Cell[][] = [];
  let started = false;
  let over = false;
  let revealed = 0;
  let raf = 0;

  function reset() {
    grid = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 })),
    );
    started = false;
    over = false;
    revealed = 0;
    onScore(0);
    onStatus?.("Left-click reveal · right-click flag");
  }

  function place(safeR: number, safeC: number) {
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * N);
      const c = Math.floor(Math.random() * N);
      if (grid[r][c].mine || (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) continue;
      grid[r][c].mine = true;
      placed++;
    }
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && grid[nr][nc].mine) n++;
          }
        grid[r][c].adj = n;
      }
  }

  function flood(r: number, c: number) {
    if (r < 0 || r >= N || c < 0 || c >= N) return;
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged || cell.mine) return;
    cell.revealed = true;
    revealed++;
    if (cell.adj === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(r + dr, c + dc);
    }
  }

  function reveal(r: number, c: number) {
    if (over) return;
    if (!started) {
      place(r, c);
      started = true;
    }
    const cell = grid[r][c];
    if (cell.flagged || cell.revealed) return;
    if (cell.mine) {
      cell.revealed = true;
      over = true;
      grid.forEach((row) => row.forEach((x) => x.mine && (x.revealed = true)));
      beep(120, 0.4, "sawtooth");
      onStatus?.("Boom! Game over");
      onGameOver(revealed * 10, 0);
      return;
    }
    flood(r, c);
    beep(400, 0.03);
    onScore(revealed * 10);
    if (revealed === N * N - MINES) {
      over = true;
      onStatus?.("Cleared! 🎉");
      onGameOver(1000 + revealed * 10, 0);
    }
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const gc = grid[r][c];
        const px = ox + c * cell;
        const py = oy + r * cell;
        ctx.fillStyle = gc.revealed ? "rgba(255,255,255,0.06)" : "#475569";
        roundRect(ctx, px + 1.5, py + 1.5, cell - 3, cell - 3, 4);
        ctx.fill();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${cell * 0.45}px system-ui`;
        if (gc.revealed && gc.mine) {
          ctx.fillText("💣", px + cell / 2, py + cell / 2);
        } else if (gc.revealed && gc.adj > 0) {
          ctx.fillStyle = NUM_COLORS[gc.adj];
          ctx.fillText(String(gc.adj), px + cell / 2, py + cell / 2 + 1);
        } else if (!gc.revealed && gc.flagged) {
          ctx.fillText("🚩", px + cell / 2, py + cell / 2);
        }
      }
    raf = requestAnimationFrame(render);
  }

  function cellAt(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return null;
    return { r: Math.floor(my / cell), c: Math.floor(mx / cell) };
  }

  const onDown = (e: PointerEvent) => {
    if (over) {
      reset();
      return;
    }
    const at = cellAt(e);
    if (at) reveal(at.r, at.c);
  };
  const onContext = (e: MouseEvent) => {
    e.preventDefault();
    if (over) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return;
    const r = Math.floor(my / cell);
    const c = Math.floor(mx / cell);
    if (!grid[r][c].revealed) {
      grid[r][c].flagged = !grid[r][c].flagged;
      beep(300, 0.03);
    }
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("contextmenu", onContext);
  reset();
  render();

  return {
    pause: () => {},
    resume: () => {},
    restart: () => reset(),
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("contextmenu", onContext);
    },
  };
};

export default mines;
