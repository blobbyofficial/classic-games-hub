import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

const N = 5;

const lightsout: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const size = Math.min(width, height);
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / N;
  let grid: boolean[][] = [];
  let moves = 0;
  let over = false;
  let raf = 0;

  function toggle(g: boolean[][], r: number, c: number) {
    [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) g[nr][nc] = !g[nr][nc];
    });
  }

  function reset() {
    grid = Array.from({ length: N }, () => Array<boolean>(N).fill(false));
    // scramble with random valid presses (guarantees solvable)
    for (let i = 0; i < 8 + Math.floor(Math.random() * 8); i++) {
      toggle(grid, Math.floor(Math.random() * N), Math.floor(Math.random() * N));
    }
    if (grid.every((row) => row.every((v) => !v))) toggle(grid, 2, 2);
    moves = 0;
    over = false;
    onScore(0);
    onStatus?.("Turn every light off");
  }

  function press(r: number, c: number) {
    if (over) {
      reset();
      return;
    }
    toggle(grid, r, c);
    moves++;
    beep(360, 0.04);
    if (grid.every((row) => row.every((v) => !v))) {
      over = true;
      const score = Math.max(100, 2000 - moves * 60);
      onScore(score);
      onStatus?.(`Solved in ${moves} moves!`);
      onGameOver(score, moves);
    }
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const x = ox + c * cell + 4;
        const y = oy + r * cell + 4;
        if (grid[r][c]) {
          ctx.fillStyle = pal.gold;
          ctx.shadowColor = pal.gold;
          ctx.shadowBlur = 16;
        } else {
          ctx.fillStyle = "#1e293b";
          ctx.shadowBlur = 0;
        }
        roundRect(ctx, x, y, cell - 8, cell - 8, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    raf = requestAnimationFrame(render);
  }

  const onDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) {
      if (over) reset();
      return;
    }
    press(Math.floor(my / cell), Math.floor(mx / cell));
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

export default lightsout;
