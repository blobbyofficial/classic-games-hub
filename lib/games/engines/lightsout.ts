import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

const N = 5;
const CROSS = [
  [0, 0],
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

/** Lights Out: tap a cell to flip it and its neighbours; clear the board. Bulbs
 *  ease between lit/dark with a warm bloom, each press sends a cross-shaped
 *  ripple, and a solve pulses the whole grid. Mobile-first. */
const lightsout: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const size = Math.min(width, height) - 16;
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / N;

  let grid: boolean[][] = [];
  const bright: number[][] = []; // eased 0..1 per cell
  let moves = 0;
  let over = false;
  let winT = 0;
  let hoverR = -1;
  let hoverC = -1;
  const ripples: { r: number; c: number; t: number }[] = [];
  let raf = 0;
  let last = performance.now();

  function toggle(g: boolean[][], r: number, c: number) {
    for (const [dr, dc] of CROSS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) g[nr][nc] = !g[nr][nc];
    }
  }

  function reset() {
    grid = Array.from({ length: N }, () => Array<boolean>(N).fill(false));
    for (let i = 0; i < 10 + Math.floor(Math.random() * 8); i++) {
      toggle(grid, Math.floor(Math.random() * N), Math.floor(Math.random() * N));
    }
    if (grid.every((row) => row.every((v) => !v))) toggle(grid, 2, 2);
    bright.length = 0;
    for (let r = 0; r < N; r++) bright.push(grid[r].map((v) => (v ? 1 : 0)));
    ripples.length = 0;
    moves = 0;
    over = false;
    winT = 0;
    onScore(0);
    onStatus?.("Turn every light off");
  }

  function press(r: number, c: number) {
    if (over) {
      reset();
      return;
    }
    toggle(grid, r, c);
    ripples.push({ r, c, t: 0 });
    moves++;
    beep(280 + (r + c) * 24, 0.045, "triangle", 0.05);
    if (grid.every((row) => row.every((v) => !v))) {
      over = true;
      const score = Math.max(100, 2400 - moves * 60);
      onScore(score);
      onStatus?.(`Solved in ${moves} moves! Tap to replay`);
      onGameOver(score, moves);
      beep(660, 0.08, "sine", 0.05);
      setTimeout(() => beep(990, 0.12, "sine", 0.05), 100);
    }
  }

  function render(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (over) winT = Math.min(1, winT + dt);
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const goal = grid[r][c] ? 1 : 0;
        bright[r][c] += (goal - bright[r][c]) * Math.min(1, dt * 12);
      }
    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].t += dt * 2.6;
      if (ripples[i].t >= 1) ripples.splice(i, 1);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    roundRect(ctx, ox - 6, oy - 6, size + 12, size + 12, 16);
    ctx.fill();

    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const x = ox + c * cell + 5;
        const y = oy + r * cell + 5;
        const w = cell - 10;
        let b = bright[r][c];
        const pulse = over ? 0.5 + 0.5 * Math.sin(winT * 5 - (r + c) * 0.6) : 0;
        b = Math.max(b, pulse * (over ? 1 : 0));

        // dark base
        const grad = ctx.createLinearGradient(x, y, x, y + w);
        grad.addColorStop(0, `rgb(${20 + b * 235},${25 + b * 180},${45 + b * 20})`);
        grad.addColorStop(1, `rgb(${12 + b * 200},${16 + b * 130},${30 + b * 10})`);
        ctx.fillStyle = grad;
        if (b > 0.05) {
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 6 + b * 22;
        }
        roundRect(ctx, x, y, w, w, 12);
        ctx.fill();
        ctx.shadowBlur = 0;

        // filament dot when lit
        if (b > 0.1) {
          ctx.fillStyle = `rgba(255,255,255,${0.15 + b * 0.5})`;
          ctx.beginPath();
          ctx.arc(x + w / 2, y + w / 2, w * 0.14, 0, Math.PI * 2);
          ctx.fill();
        }

        // hover ring
        if (r === hoverR && c === hoverC && !over) {
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 2;
          roundRect(ctx, x, y, w, w, 12);
          ctx.stroke();
        }
      }

    // cross ripples
    ripples.forEach((rp) => {
      const alpha = (1 - rp.t) * 0.4;
      ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
      ctx.lineWidth = 3;
      CROSS.forEach(([dr, dc]) => {
        const nr = rp.r + dr;
        const nc = rp.c + dc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) return;
        const cx = ox + nc * cell + cell / 2;
        const cy = oy + nr * cell + cell / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, rp.t * cell * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      });
    });

    ctx.fillStyle = pal.muted;
    ctx.font = "600 14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`${moves} moves`, ox, oy - 14);

    raf = requestAnimationFrame(render);
  }

  function cellAt(e: PointerEvent): [number, number] | null {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return null;
    return [Math.floor(my / cell), Math.floor(mx / cell)];
  }

  const onDown = (e: PointerEvent) => {
    const cellPos = cellAt(e);
    if (!cellPos) {
      if (over) reset();
      return;
    }
    press(cellPos[0], cellPos[1]);
  };
  const onMove = (e: PointerEvent) => {
    const cellPos = cellAt(e);
    if (cellPos) [hoverR, hoverC] = cellPos;
    else hoverR = hoverC = -1;
  };
  const onLeave = () => {
    hoverR = hoverC = -1;
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  reset();
  raf = requestAnimationFrame(render);

  return {
    pause: () => cancelAnimationFrame(raf),
    resume: () => {
      last = performance.now();
      raf = requestAnimationFrame(render);
    },
    restart: () => reset(),
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    },
  };
};

export default lightsout;
