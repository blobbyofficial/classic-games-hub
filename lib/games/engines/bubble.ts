import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette } from "../helpers";

const bubble: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"];
  const COLS = 10;
  const R = width / COLS / 2;
  const rowH = R * 1.7;
  let grid: (number | null)[][] = [];
  let shooter = { color: 0, next: 0, angle: -Math.PI / 2 };
  let flying: { x: number; y: number; vx: number; vy: number; color: number } | null = null;
  let score = 0;
  let alive = true;
  let aim = -Math.PI / 2;

  function reset() {
    grid = [];
    for (let r = 0; r < 5; r++) {
      const row: (number | null)[] = [];
      for (let c = 0; c < COLS - (r % 2); c++) row.push(Math.floor(Math.random() * 3));
      grid.push(row);
    }
    shooter = { color: Math.floor(Math.random() * COLORS.length), next: Math.floor(Math.random() * COLORS.length), angle: -Math.PI / 2 };
    flying = null;
    score = 0;
    alive = true;
    onScore(0);
    onStatus?.("Aim and fire");
  }

  function cellPos(r: number, c: number) {
    const offset = (r % 2) * R;
    return { x: offset + c * 2 * R + R, y: r * rowH + R + 10 };
  }

  function shoot() {
    if (flying || !alive) return;
    flying = { x: width / 2, y: height - 30, vx: Math.cos(aim) * 9, vy: Math.sin(aim) * 9, color: shooter.color };
    shooter.color = shooter.next;
    shooter.next = Math.floor(Math.random() * COLORS.length);
    beep(500, 0.05);
  }

  function snap() {
    if (!flying) return;
    let bestR = 0;
    let bestC = 0;
    let bestD = Infinity;
    const maxR = grid.length + 1;
    for (let r = 0; r < maxR; r++) {
      const cols = COLS - (r % 2);
      for (let c = 0; c < cols; c++) {
        if (grid[r] && grid[r][c] != null) continue;
        const p = cellPos(r, c);
        const d = Math.hypot(p.x - flying.x, p.y - flying.y);
        if (d < bestD) {
          bestD = d;
          bestR = r;
          bestC = c;
        }
      }
    }
    while (grid.length <= bestR) grid.push(Array(COLS - (grid.length % 2)).fill(null));
    grid[bestR][bestC] = flying.color;
    const cluster = findCluster(bestR, bestC, flying.color);
    if (cluster.length >= 3) {
      cluster.forEach(([r, c]) => (grid[r][c] = null));
      score += cluster.length * 10;
      onScore(score);
      beep(700, 0.08);
      dropFloating();
    }
    flying = null;
    if (grid.length > 12 || grid.some((row, r) => cellPos(r, 0).y > height - 60 && row.some((x) => x != null))) {
      alive = false;
      onStatus?.("The bubbles reached the bottom!");
      onGameOver(score, 0);
    }
    if (grid.every((row) => row.every((x) => x == null))) {
      score += 200;
      onScore(score);
      onStatus?.("Cleared!");
      onGameOver(score, 0);
      alive = false;
    }
  }

  function neighbors(r: number, c: number): [number, number][] {
    const even = r % 2 === 0;
    const deltas: [number, number][] = even
      ? [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]
      : [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
    return deltas.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(([nr, nc]) => grid[nr] && nc >= 0 && nc < grid[nr].length);
  }

  function findCluster(r: number, c: number, color: number): [number, number][] {
    const seen = new Set<string>();
    const stack: [number, number][] = [[r, c]];
    const out: [number, number][] = [];
    while (stack.length) {
      const [cr, cc] = stack.pop()!;
      const key = `${cr},${cc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (grid[cr]?.[cc] !== color) continue;
      out.push([cr, cc]);
      neighbors(cr, cc).forEach((n) => stack.push(n));
    }
    return out;
  }

  function dropFloating() {
    const connected = new Set<string>();
    const stack: [number, number][] = [];
    (grid[0] ?? []).forEach((v, c) => v != null && stack.push([0, c]));
    while (stack.length) {
      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;
      if (connected.has(key) || grid[r]?.[c] == null) continue;
      connected.add(key);
      neighbors(r, c).forEach((n) => stack.push(n));
    }
    grid.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v != null && !connected.has(`${r},${c}`)) {
          grid[r][c] = null;
          score += 20;
        }
      }),
    );
    onScore(score);
  }

  function update() {
    if (!flying) return;
    flying.x += flying.vx;
    flying.y += flying.vy;
    if (flying.x < R || flying.x > width - R) flying.vx *= -1;
    if (flying.y < R + 10) {
      snap();
      return;
    }
    // collide with grid
    for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] == null) continue;
        const p = cellPos(r, c);
        if (Math.hypot(p.x - flying.x, p.y - flying.y) < R * 1.8) {
          snap();
          return;
        }
      }
  }

  function drawBubble(x: number, y: number, color: number) {
    ctx.fillStyle = COLORS[color];
    ctx.beginPath();
    ctx.arc(x, y, R - 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(x - R * 0.3, y - R * 0.3, R * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    grid.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v != null) {
          const p = cellPos(r, c);
          drawBubble(p.x, p.y, v);
        }
      }),
    );
    // aim line
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(width / 2, height - 30);
    ctx.lineTo(width / 2 + Math.cos(aim) * 120, height - 30 + Math.sin(aim) * 120);
    ctx.stroke();
    ctx.setLineDash([]);
    if (flying) drawBubble(flying.x, flying.y, flying.color);
    drawBubble(width / 2, height - 30, shooter.color);
    drawBubble(width - R - 6, height - 24, shooter.next);
  }

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    aim = Math.atan2(my - (height - 30), mx - width / 2);
    aim = Math.max(-Math.PI + 0.3, Math.min(-0.3, aim));
  };
  const onDown = () => (alive ? shoot() : reset());
  const onKey = (e: KeyboardEvent) => {
    if (e.key === " ") {
      alive ? shoot() : reset();
      e.preventDefault();
    }
  };

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  reset();
  const loop = createLoop(update, render);

  return {
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    restart: () => reset(),
    destroy: () => {
      loop.stop();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    },
  };
};

export default bubble;
