import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette, roundRect, tune } from "../helpers";

const snake: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus, difficulty }) => {
  const ctx = canvas.getContext("2d")!;
  const cols = 24;
  const rows = Math.round((cols * height) / width);
  const cell = width / cols;
  const pal = palette();

  let body: { x: number; y: number }[] = [];
  let dir = { x: 1, y: 0 };
  let nextDir = dir;
  let food = { x: 0, y: 0 };
  let score = 0;
  // Cells per second. Both the start and the ceiling move, so easy is not just
  // a slower opening that ends up at the same place a minute later.
  const BASE = tune(difficulty, { easy: 6, regular: 8, hard: 11 });
  const CAP = tune(difficulty, { easy: 14, regular: 20, hard: 26 });
  let speed = BASE;
  let acc = 0;
  let alive = true;
  let started = false;

  function reset() {
    body = [
      { x: 6, y: rows >> 1 },
      { x: 5, y: rows >> 1 },
      { x: 4, y: rows >> 1 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    speed = BASE;
    alive = true;
    started = false;
    placeFood();
    onScore(0);
    onStatus?.("Press an arrow key or swipe to start");
  }

  function placeFood() {
    do {
      food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (body.some((s) => s.x === food.x && s.y === food.y));
  }

  function step() {
    if (!alive || !started) return;
    dir = nextDir;
    const head = { x: (body[0].x + dir.x + cols) % cols, y: (body[0].y + dir.y + rows) % rows };
    if (body.some((s) => s.x === head.x && s.y === head.y)) {
      alive = false;
      beep(140, 0.25, "sawtooth");
      onStatus?.("Game over");
      onGameOver(score, Math.round(body.length));
      return;
    }
    body.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      onScore(score);
      speed = Math.min(CAP, BASE + score / 60);
      beep(660, 0.06);
      placeFood();
    } else {
      body.pop();
    }
  }

  function update(dt: number) {
    if (!started || !alive) return;
    acc += dt;
    const interval = 1 / speed;
    while (acc >= interval) {
      step();
      acc -= interval;
    }
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    // subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell, 0);
      ctx.lineTo(x * cell, height);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell);
      ctx.lineTo(width, y * cell);
      ctx.stroke();
    }
    // food
    ctx.fillStyle = pal.accent;
    ctx.shadowColor = pal.accent;
    ctx.shadowBlur = 12;
    roundRect(ctx, food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    // snake
    body.forEach((s, i) => {
      const t = 1 - i / body.length;
      ctx.fillStyle = i === 0 ? pal.neon : `color-mix(in oklch, ${pal.primary}, ${pal.neon} ${t * 40}%)`;
      roundRect(ctx, s.x * cell + 1.5, s.y * cell + 1.5, cell - 3, cell - 3, 5);
      ctx.fill();
    });
  }

  function turn(x: number, y: number) {
    if (!started) {
      started = true;
      onStatus?.("");
    }
    // disallow reversing
    if (x === -dir.x && y === -dir.y) return;
    nextDir = { x, y };
  }

  function onKey(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") turn(0, -1);
    else if (k === "arrowdown" || k === "s") turn(0, 1);
    else if (k === "arrowleft" || k === "a") turn(-1, 0);
    else if (k === "arrowright" || k === "d") turn(1, 0);
    else if (k === "r" && !alive) reset();
    else return;
    e.preventDefault();
  }

  let touchStart: { x: number; y: number } | null = null;
  function onTouchStart(e: TouchEvent) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchMove(e: TouchEvent) {
    if (!touchStart) return;
    const dx = e.touches[0].clientX - touchStart.x;
    const dy = e.touches[0].clientY - touchStart.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0);
    else turn(0, Math.sign(dy));
    touchStart = null;
    e.preventDefault();
  }

  window.addEventListener("keydown", onKey);
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });

  reset();
  const loop = createLoop(update, render);

  return {
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    restart: () => reset(),
    destroy: () => {
      loop.stop();
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
    },
  };
};

export default snake;
