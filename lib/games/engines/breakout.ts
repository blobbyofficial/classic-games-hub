import type { GameEngineFactory } from "@/types";
import { beep, clamp, createLoop, palette, roundRect } from "../helpers";

const breakout: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const COLORS = ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#22d3ee"];

  let paddleX = width / 2;
  const paddleW = width * 0.18;
  const paddleH = 12;
  const paddleY = height - 30;
  let ball = { x: width / 2, y: paddleY - 12, vx: 0, vy: 0, r: 7 };
  let bricks: { x: number; y: number; w: number; h: number; color: string; hp: number }[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let launched = false;
  let alive = true;

  function buildLevel() {
    bricks = [];
    const cols = 9;
    const rows = 4 + Math.min(level, 3);
    const bw = (width - 40) / cols;
    const bh = 20;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: 20 + c * bw,
          y: 50 + r * (bh + 6),
          w: bw - 4,
          h: bh,
          color: COLORS[r % COLORS.length],
          hp: 1 + (r < 2 ? 1 : 0),
        });
      }
  }

  function resetBall() {
    ball = { x: paddleX, y: paddleY - 12, vx: 0, vy: 0, r: 7 };
    launched = false;
    onStatus?.("Click or press Space to launch");
  }

  function reset() {
    score = 0;
    lives = 3;
    level = 1;
    alive = true;
    onScore(0);
    buildLevel();
    resetBall();
  }

  function launch() {
    if (launched || !alive) return;
    launched = true;
    const speed = 6;
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 0.6;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    onStatus?.("");
  }

  function update() {
    if (!alive) return;
    if (!launched) {
      ball.x = paddleX;
      return;
    }
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x < ball.r || ball.x > width - ball.r) {
      ball.vx *= -1;
      ball.x = clamp(ball.x, ball.r, width - ball.r);
      beep(300, 0.03);
    }
    if (ball.y < ball.r) {
      ball.vy *= -1;
      ball.y = ball.r;
      beep(300, 0.03);
    }

    // paddle
    if (
      ball.y + ball.r >= paddleY &&
      ball.y - ball.r <= paddleY + paddleH &&
      ball.x >= paddleX - paddleW / 2 &&
      ball.x <= paddleX + paddleW / 2 &&
      ball.vy > 0
    ) {
      const rel = (ball.x - paddleX) / (paddleW / 2);
      const speed = Math.min(11, Math.hypot(ball.vx, ball.vy) + 0.15);
      const angle = (-Math.PI / 2) + rel * (Math.PI / 3);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      beep(440, 0.04);
    }

    // bricks
    for (let i = bricks.length - 1; i >= 0; i--) {
      const b = bricks[i];
      if (ball.x > b.x && ball.x < b.x + b.w && ball.y - ball.r < b.y + b.h && ball.y + ball.r > b.y) {
        ball.vy *= -1;
        b.hp--;
        score += 10;
        onScore(score);
        beep(520 + b.hp * 60, 0.04);
        if (b.hp <= 0) bricks.splice(i, 1);
        break;
      }
    }

    if (bricks.length === 0) {
      level++;
      buildLevel();
      resetBall();
    }

    if (ball.y > height + 20) {
      lives--;
      beep(180, 0.2, "sawtooth");
      if (lives <= 0) {
        alive = false;
        onStatus?.("Game over");
        onGameOver(score, level);
      } else {
        resetBall();
      }
    }
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    bricks.forEach((b) => {
      ctx.fillStyle = b.color;
      if (b.hp > 1) ctx.globalAlpha = 1;
      roundRect(ctx, b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    // paddle
    ctx.fillStyle = pal.neon;
    roundRect(ctx, paddleX - paddleW / 2, paddleY, paddleW, paddleH, 6);
    ctx.fill();
    // ball
    ctx.fillStyle = "#fff";
    ctx.shadowColor = pal.neon;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // HUD
    ctx.fillStyle = pal.muted;
    ctx.font = "14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`Lives: ${"♥".repeat(Math.max(0, lives))}`, 12, 24);
  }

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    paddleX = clamp(((e.clientX - rect.left) / rect.width) * width, paddleW / 2, width - paddleW / 2);
  };
  const onDown = () => (alive ? launch() : reset());
  const onKey = (e: KeyboardEvent) => {
    if (e.key === " ") {
      alive ? launch() : reset();
      e.preventDefault();
    } else if (e.key === "ArrowLeft") paddleX = clamp(paddleX - 30, paddleW / 2, width - paddleW / 2);
    else if (e.key === "ArrowRight") paddleX = clamp(paddleX + 30, paddleW / 2, width - paddleW / 2);
    else if (e.key.toLowerCase() === "r") reset();
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

export default breakout;
