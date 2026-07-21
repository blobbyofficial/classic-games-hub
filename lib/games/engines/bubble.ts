import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette } from "../helpers";

/** Bubble Pop: an aim-and-shoot bubble shooter on a hex grid. Glossy bubbles, a
 *  reflecting dotted trajectory preview, a satisfying pop-shatter, and detached
 *  clusters that fall away under gravity. Aim by moving, tap/click to fire.
 *  Mobile-first. */
const bubble: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const COLORS = ["#f87171", "#60a5fa", "#4ade80", "#fbbf24", "#c084fc"];
  const COLS = 10;
  const R = width / COLS / 2;
  const rowH = R * 1.72;
  const shooterY = height - R - 12;
  const dangerY = height - R * 3.4;

  type Cell = number | null;
  let grid: Cell[][] = [];
  let shooter = { color: 0, next: 0 };
  let flying: { x: number; y: number; vx: number; vy: number; color: number } | null = null;
  let pops: { x: number; y: number; vx: number; vy: number; color: number; life: number }[] = [];
  let drops: { x: number; y: number; vy: number; color: number }[] = [];
  let score = 0;
  let shots = 0;
  let alive = true;
  let aim = -Math.PI / 2;
  let bob = 0;
  const SPEED = 12;

  function randColor() {
    return Math.floor(Math.random() * COLORS.length);
  }

  function reset() {
    grid = [];
    for (let r = 0; r < 5; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < COLS - (r % 2); c++) row.push(Math.floor(Math.random() * 4));
      grid.push(row);
    }
    shooter = { color: randColor(), next: randColor() };
    flying = null;
    pops = [];
    drops = [];
    score = 0;
    shots = 0;
    alive = true;
    aim = -Math.PI / 2;
    onScore(0);
    onStatus?.("Match 3+ to pop");
  }

  function cellPos(r: number, c: number) {
    const offset = (r % 2) * R;
    return { x: offset + c * 2 * R + R, y: r * rowH + R + 10 };
  }

  function shoot() {
    if (flying || !alive) return;
    flying = { x: width / 2, y: shooterY, vx: Math.cos(aim) * SPEED, vy: Math.sin(aim) * SPEED, color: shooter.color };
    shooter.color = shooter.next;
    shooter.next = randColor();
    shots++;
    beep(520, 0.05, "square", 0.05);
  }

  function neighbors(r: number, c: number): [number, number][] {
    const even = r % 2 === 0;
    const deltas: [number, number][] = even
      ? [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]
      : [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
    return deltas
      .map(([dr, dc]) => [r + dr, c + dc] as [number, number])
      .filter(([nr, nc]) => grid[nr] && nc >= 0 && nc < grid[nr].length);
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

  function spawnPop(x: number, y: number, color: number, n = 7) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 3.5;
      pops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, color, life: 1 });
    }
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
          const p = cellPos(r, c);
          drops.push({ x: p.x, y: p.y, vy: 0, color: v });
          grid[r][c] = null;
          score += 20;
        }
      }),
    );
    onScore(score);
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
      cluster.forEach(([r, c]) => {
        const p = cellPos(r, c);
        spawnPop(p.x, p.y, grid[r][c]!);
        grid[r][c] = null;
      });
      score += cluster.length * 10 + Math.max(0, cluster.length - 3) * 15; // combo bonus
      onScore(score);
      beep(680 + cluster.length * 40, 0.09, "sine", 0.05);
      dropFloating();
    } else {
      beep(300, 0.04, "triangle", 0.04);
    }
    flying = null;

    if (grid.every((row) => row.every((x) => x == null))) {
      score += 300;
      onScore(score);
      onStatus?.("Board cleared! 🎉 Tap to replay");
      onGameOver(score, shots);
      alive = false;
      return;
    }
    const reached = grid.some((row, r) => row.some((x) => x != null) && cellPos(r, 0).y + R >= dangerY);
    if (reached || grid.length > 13) {
      alive = false;
      onStatus?.("Bubbles hit the line! Tap to retry");
      onGameOver(score, shots);
    }
  }

  function update(dt: number) {
    bob += dt * 3;
    if (flying) {
      // sub-step so fast bubbles don't tunnel through the wall/grid
      for (let s = 0; s < 3 && flying; s++) {
        flying.x += flying.vx / 3;
        flying.y += flying.vy / 3;
        if (flying.x < R) {
          flying.x = R;
          flying.vx *= -1;
        } else if (flying.x > width - R) {
          flying.x = width - R;
          flying.vx *= -1;
        }
        if (flying.y < R + 10) {
          snap();
          break;
        }
        let hit = false;
        for (let r = 0; r < grid.length && !hit; r++)
          for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] == null) continue;
            const p = cellPos(r, c);
            if (Math.hypot(p.x - flying.x, p.y - flying.y) < R * 1.8) {
              snap();
              hit = true;
              break;
            }
          }
      }
    }
    pops = pops.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.life -= dt * 2.2;
      return p.life > 0;
    });
    drops = drops.filter((d) => {
      d.vy += 0.6;
      d.y += d.vy;
      return d.y < height + R;
    });
  }

  function drawBubble(x: number, y: number, color: number, r = R - 1.5) {
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.85)");
    grad.addColorStop(0.25, COLORS[color]);
    grad.addColorStop(1, shade(COLORS[color], -0.35));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function shade(hex: string, amt: number) {
    const n = (i: number) => {
      const v = Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 + amt));
      return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
    };
    return `#${n(1)}${n(3)}${n(5)}`;
  }

  function drawTrajectory() {
    let x = width / 2;
    let y = shooterY;
    let vx = Math.cos(aim);
    let vy = Math.sin(aim);
    const step = R * 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 40; i++) {
      x += vx * step;
      y += vy * step;
      if (x < R || x > width - R) {
        vx *= -1;
        x = Math.max(R, Math.min(width - R, x));
      }
      if (y < R + 10) break;
      // stop the preview at the first grid contact
      let blocked = false;
      for (let r = 0; r < grid.length && !blocked; r++)
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] == null) continue;
          const p = cellPos(r, c);
          if (Math.hypot(p.x - x, p.y - y) < R * 1.7) {
            blocked = true;
            break;
          }
        }
      if (blocked) break;
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);

    // danger line
    ctx.strokeStyle = "rgba(248,113,113,0.35)";
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(width, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);

    grid.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v != null) {
          const p = cellPos(r, c);
          drawBubble(p.x, p.y, v);
        }
      }),
    );

    drops.forEach((d) => drawBubble(d.x, d.y, d.color));

    pops.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = COLORS[p.color];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5 * p.life + 1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (alive && !flying) drawTrajectory();
    if (flying) drawBubble(flying.x, flying.y, flying.color);

    // shooter dock
    const by = shooterY + Math.sin(bob) * 1.5;
    drawBubble(width / 2, by, shooter.color);
    ctx.fillStyle = pal.muted;
    ctx.font = "600 13px system-ui";
    ctx.textAlign = "right";
    ctx.fillText("next", width - R * 2 - 8, shooterY + 4);
    drawBubble(width - R - 6, shooterY, shooter.next, R * 0.72);
  }

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    let a = Math.atan2(my - shooterY, mx - width / 2);
    a = Math.max(-Math.PI + 0.22, Math.min(-0.22, a));
    aim = a;
  };
  const onDown = (e: PointerEvent) => {
    if (!alive) {
      reset();
      return;
    }
    onMove(e);
    shoot();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") aim = Math.max(-Math.PI + 0.22, aim - 0.06);
    else if (e.key === "ArrowRight") aim = Math.min(-0.22, aim + 0.06);
    else if (e.key === " ") {
      alive ? shoot() : reset();
      e.preventDefault();
    } else return;
    e.preventDefault();
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
