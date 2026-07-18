import type { GameEngineFactory } from "@/types";
import { beep, clamp, createLoop, palette, roundRect } from "../helpers";

const invaders: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const player = { x: width / 2, w: 34, h: 14, y: height - 30 };
  let aliens: { x: number; y: number; alive: boolean }[] = [];
  let dir = 1;
  let bullets: { x: number; y: number }[] = [];
  let bombs: { x: number; y: number }[] = [];
  let score = 0;
  let lives = 3;
  let wave = 1;
  let alive = true;
  let stepAcc = 0;
  const keys = new Set<string>();
  const COLS = 8;
  const ROWS = 4;

  function buildWave() {
    aliens = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        aliens.push({ x: 40 + c * ((width - 80) / (COLS - 1)), y: 40 + r * 34, alive: true });
      }
    dir = 1;
  }

  function reset() {
    score = 0;
    lives = 3;
    wave = 1;
    alive = true;
    bullets = [];
    bombs = [];
    player.x = width / 2;
    buildWave();
    onScore(0);
    onStatus?.("");
  }

  function stepAliens() {
    const living = aliens.filter((a) => a.alive);
    if (living.length === 0) {
      wave++;
      buildWave();
      return;
    }
    const speed = 6 + (ROWS * COLS - living.length) * 0.4 + wave * 2;
    let hitEdge = false;
    living.forEach((a) => {
      a.x += dir * speed;
      if (a.x < 20 || a.x > width - 20) hitEdge = true;
    });
    if (hitEdge) {
      dir *= -1;
      living.forEach((a) => (a.y += 18));
    }
    beep(120 + living.length, 0.03);
    // random bomb
    if (Math.random() < 0.4 && living.length) {
      const shooter = living[Math.floor(Math.random() * living.length)];
      bombs.push({ x: shooter.x, y: shooter.y });
    }
    // reached bottom?
    if (living.some((a) => a.y > player.y - 20)) endGame();
  }

  function endGame() {
    alive = false;
    onStatus?.("Game over");
    onGameOver(score, wave);
  }

  function update(dt: number) {
    if (!alive) return;
    if (keys.has("arrowleft") || keys.has("a")) player.x -= 6;
    if (keys.has("arrowright") || keys.has("d")) player.x += 6;
    player.x = clamp(player.x, player.w / 2, width - player.w / 2);

    stepAcc += dt;
    if (stepAcc > 0.5) {
      stepAcc = 0;
      stepAliens();
    }

    bullets.forEach((b) => (b.y -= 9));
    bullets = bullets.filter((b) => b.y > -10);
    bombs.forEach((b) => (b.y += 4 + wave * 0.4));
    bombs = bombs.filter((b) => b.y < height + 10);

    // bullet hits
    for (const b of bullets) {
      for (const a of aliens) {
        if (a.alive && Math.abs(a.x - b.x) < 16 && Math.abs(a.y - b.y) < 14) {
          a.alive = false;
          b.y = -100;
          score += 20;
          onScore(score);
          beep(660, 0.05);
        }
      }
    }
    // bomb hits player
    for (const b of bombs) {
      if (Math.abs(b.x - player.x) < player.w / 2 && Math.abs(b.y - player.y) < 12) {
        b.y = height + 100;
        lives--;
        beep(150, 0.2, "sawtooth");
        if (lives <= 0) endGame();
      }
    }
    bombs = bombs.filter((b) => b.y < height + 10);
  }

  function drawAlien(x: number, y: number) {
    ctx.fillStyle = pal.green;
    roundRect(ctx, x - 12, y - 8, 24, 16, 4);
    ctx.fill();
    ctx.fillStyle = pal.bg;
    ctx.fillRect(x - 6, y - 2, 3, 4);
    ctx.fillRect(x + 3, y - 2, 3, 4);
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    aliens.forEach((a) => a.alive && drawAlien(a.x, a.y));
    ctx.fillStyle = pal.neon;
    bullets.forEach((b) => ctx.fillRect(b.x - 1.5, b.y - 8, 3, 10));
    ctx.fillStyle = pal.red;
    bombs.forEach((b) => ctx.fillRect(b.x - 1.5, b.y, 3, 10));
    // player
    ctx.fillStyle = pal.primary;
    roundRect(ctx, player.x - player.w / 2, player.y, player.w, player.h, 4);
    ctx.fill();
    ctx.fillRect(player.x - 2, player.y - 6, 4, 6);
    ctx.fillStyle = pal.muted;
    ctx.font = "14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("▲".repeat(Math.max(0, lives)) + `  Wave ${wave}`, 12, 22);
  }

  const kd = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === " ") {
      if (!alive) reset();
      else if (bullets.length < 3) {
        bullets.push({ x: player.x, y: player.y });
        beep(720, 0.04);
      }
      e.preventDefault();
      return;
    }
    if (["arrowleft", "arrowright", "a", "d"].includes(k)) {
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

export default invaders;
