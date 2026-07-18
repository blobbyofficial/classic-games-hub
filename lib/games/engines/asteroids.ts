import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette } from "../helpers";

interface Rock { x: number; y: number; vx: number; vy: number; r: number; verts: number[] }
interface Bullet { x: number; y: number; vx: number; vy: number; life: number }

const asteroids: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const ship = { x: width / 2, y: height / 2, angle: -Math.PI / 2, vx: 0, vy: 0, thrust: false };
  let rocks: Rock[] = [];
  let bullets: Bullet[] = [];
  let score = 0;
  let lives = 3;
  let alive = true;
  let invuln = 0;
  const keys = new Set<string>();

  function makeRock(x: number, y: number, r: number): Rock {
    const verts = Array.from({ length: 10 }, () => 0.7 + Math.random() * 0.5);
    const a = Math.random() * Math.PI * 2;
    const s = (Math.random() * 1 + 0.5) * (60 / r);
    return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r, verts };
  }

  function spawnWave(n: number) {
    for (let i = 0; i < n; i++) {
      const edge = Math.random() < 0.5;
      rocks.push(makeRock(edge ? 0 : width, Math.random() * height, 42));
    }
  }

  function reset() {
    ship.x = width / 2;
    ship.y = height / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    rocks = [];
    bullets = [];
    score = 0;
    lives = 3;
    alive = true;
    invuln = 60;
    spawnWave(4);
    onScore(0);
    onStatus?.("");
  }

  function wrap(o: { x: number; y: number }) {
    if (o.x < 0) o.x += width;
    if (o.x > width) o.x -= width;
    if (o.y < 0) o.y += height;
    if (o.y > height) o.y -= height;
  }

  function fire() {
    if (bullets.length > 5) return;
    bullets.push({
      x: ship.x + Math.cos(ship.angle) * 14,
      y: ship.y + Math.sin(ship.angle) * 14,
      vx: Math.cos(ship.angle) * 9 + ship.vx,
      vy: Math.sin(ship.angle) * 9 + ship.vy,
      life: 60,
    });
    beep(880, 0.04);
  }

  function update() {
    if (!alive) return;
    if (keys.has("arrowleft") || keys.has("a")) ship.angle -= 0.09;
    if (keys.has("arrowright") || keys.has("d")) ship.angle += 0.09;
    ship.thrust = keys.has("arrowup") || keys.has("w");
    if (ship.thrust) {
      ship.vx += Math.cos(ship.angle) * 0.18;
      ship.vy += Math.sin(ship.angle) * 0.18;
    }
    ship.vx *= 0.99;
    ship.vy *= 0.99;
    ship.x += ship.vx;
    ship.y += ship.vy;
    wrap(ship);
    if (invuln > 0) invuln--;

    bullets.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      wrap(b);
    });
    bullets = bullets.filter((b) => b.life > 0);

    rocks.forEach((r) => {
      r.x += r.vx;
      r.y += r.vy;
      wrap(r);
    });

    // bullet-rock
    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.hypot(r.x - b.x, r.y - b.y) < r.r) {
          bullets.splice(j, 1);
          rocks.splice(i, 1);
          score += Math.round(120 / r.r) * 10;
          onScore(score);
          beep(300, 0.06, "sawtooth");
          if (r.r > 18) {
            rocks.push(makeRock(r.x, r.y, r.r / 1.8), makeRock(r.x, r.y, r.r / 1.8));
          }
          break;
        }
      }
    }

    // ship-rock
    if (invuln <= 0) {
      for (const r of rocks) {
        if (Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 8) {
          lives--;
          invuln = 90;
          beep(120, 0.3, "sawtooth");
          ship.x = width / 2;
          ship.y = height / 2;
          ship.vx = 0;
          ship.vy = 0;
          if (lives <= 0) {
            alive = false;
            onStatus?.("Game over");
            onGameOver(score, 0);
          }
          break;
        }
      }
    }

    if (rocks.length === 0) spawnWave(4 + Math.floor(score / 1000));
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    rocks.forEach((r) => {
      ctx.beginPath();
      r.verts.forEach((v, k) => {
        const a = (k / r.verts.length) * Math.PI * 2;
        const px = r.x + Math.cos(a) * r.r * v;
        const py = r.y + Math.sin(a) * r.r * v;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    });

    ctx.fillStyle = "#fff";
    bullets.forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (alive) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.globalAlpha = invuln > 0 && Math.floor(invuln / 5) % 2 ? 0.4 : 1;
      ctx.strokeStyle = pal.neon;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.stroke();
      if (ship.thrust) {
        ctx.strokeStyle = pal.gold;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(-14, 0);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = pal.muted;
    ctx.font = "14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("▲".repeat(Math.max(0, lives)), 12, 22);
  }

  const kd = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === " ") {
      alive ? fire() : reset();
      e.preventDefault();
      return;
    }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
      keys.add(k);
      e.preventDefault();
    }
    if (k === "r" && !alive) reset();
  };
  const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());

  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  reset();
  const loop = createLoop(update, render);

  return {
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    restart: () => reset(),
    destroy: () => {
      loop.stop();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    },
  };
};

export default asteroids;
