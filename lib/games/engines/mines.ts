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
    onStatus?.("Tap to reveal · long-press or right-click to flag");
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

  function toggleFlag(r: number, c: number) {
    if (over || !grid[r]?.[c] || grid[r][c].revealed) return;
    grid[r][c].flagged = !grid[r][c].flagged;
    beep(300, 0.03);
  }

  // Reveal on a quick tap/click; flag on a long-press (touch) or right-click
  // (mouse). Moving the pointer too far cancels the press (treated as a scroll).
  const LONG_PRESS_MS = 450;
  const MOVE_CANCEL_SQ = 100; // ~10px slop before the gesture is abandoned
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressCell: { r: number; c: number } | null = null;
  let downXY: { x: number; y: number } | null = null;
  let longFired = false;

  const clearTimer = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  const onDown = (e: PointerEvent) => {
    downXY = { x: e.clientX, y: e.clientY };
    longFired = false;
    clearTimer();
    if (over) return; // handled on pointer-up (tap to restart)
    const at = cellAt(e);
    pressCell = at;
    if (at) {
      pressTimer = setTimeout(() => {
        longFired = true;
        pressTimer = null;
        toggleFlag(at.r, at.c);
      }, LONG_PRESS_MS);
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!downXY) return;
    const dx = e.clientX - downXY.x;
    const dy = e.clientY - downXY.y;
    if (dx * dx + dy * dy > MOVE_CANCEL_SQ) {
      clearTimer();
      pressCell = null;
    }
  };

  const onUp = (e: PointerEvent) => {
    clearTimer();
    const wasDown = downXY !== null;
    downXY = null;
    if (over) {
      if (wasDown) reset();
      pressCell = null;
      longFired = false;
      return;
    }
    if (!longFired && pressCell) {
      const at = cellAt(e) ?? pressCell;
      if (at.r === pressCell.r && at.c === pressCell.c) reveal(at.r, at.c);
    }
    pressCell = null;
    longFired = false;
  };

  const onCancel = () => {
    clearTimer();
    downXY = null;
    pressCell = null;
    longFired = false;
  };

  const onContext = (e: MouseEvent) => {
    e.preventDefault();
    if (over) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return;
    toggleFlag(Math.floor(my / cell), Math.floor(mx / cell));
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("pointerleave", onCancel);
  canvas.addEventListener("contextmenu", onContext);
  reset();
  render();

  return {
    pause: () => {},
    resume: () => {},
    restart: () => reset(),
    destroy: () => {
      cancelAnimationFrame(raf);
      clearTimer();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("pointerleave", onCancel);
      canvas.removeEventListener("contextmenu", onContext);
    },
  };
};

export default mines;
