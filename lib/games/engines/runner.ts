import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette, roundRect } from "../helpers";

const runner: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const groundY = height - 40;
  const player = { x: 70, y: groundY, vy: 0, w: 26, h: 34, ducking: false };
  let obstacles: { x: number; y: number; w: number; h: number; air: boolean }[] = [];
  let speed = 6;
  let dist = 0;
  let score = 0;
  let spawnTimer = 0;
  let alive = true;
  const GRAVITY = 0.9;

  function reset() {
    player.y = groundY;
    player.vy = 0;
    player.ducking = false;
    obstacles = [];
    speed = 6;
    dist = 0;
    score = 0;
    spawnTimer = 40;
    alive = true;
    onScore(0);
    onStatus?.("");
  }

  function jump() {
    if (!alive) {
      reset();
      return;
    }
    if (player.y >= groundY - 1) {
      player.vy = -15;
      beep(520, 0.06);
    }
  }

  function update() {
    if (!alive) return;
    dist += speed;
    score = Math.floor(dist / 10);
    onScore(score);
    speed = 6 + dist / 2500;

    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.y > groundY) {
      player.y = groundY;
      player.vy = 0;
    }
    const ph = player.ducking && player.y >= groundY ? player.h * 0.55 : player.h;

    spawnTimer--;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(45, 90 - dist / 400) + Math.random() * 40;
      const air = Math.random() < 0.3;
      obstacles.push(
        air
          ? { x: width, y: groundY - 46, w: 30, h: 18, air: true }
          : { x: width, y: groundY, w: 18 + Math.random() * 20, h: 26 + Math.random() * 24, air: false },
      );
    }

    obstacles.forEach((o) => (o.x -= speed));
    obstacles = obstacles.filter((o) => o.x + o.w > -10);

    const py = player.y - ph;
    for (const o of obstacles) {
      const oy = o.air ? o.y : o.y - o.h;
      if (player.x + player.w > o.x && player.x < o.x + o.w && py + ph > oy && py < oy + o.h) {
        alive = false;
        beep(140, 0.3, "sawtooth");
        onStatus?.("Crashed!");
        onGameOver(score, 0);
      }
    }
  }

  function render() {
    const grd = ctx.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, pal.bg);
    grd.addColorStop(1, "#0b1220");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    // ground
    ctx.strokeStyle = pal.neon;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 2);
    ctx.lineTo(width, groundY + 2);
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    for (let x = -(dist % 40); x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 2);
      ctx.lineTo(x + 20, height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // player
    const ph = player.ducking && player.y >= groundY ? player.h * 0.55 : player.h;
    ctx.fillStyle = pal.primary;
    roundRect(ctx, player.x, player.y - ph, player.w, ph, 5);
    ctx.fill();

    ctx.fillStyle = pal.accent;
    obstacles.forEach((o) => {
      const oy = o.air ? o.y : o.y - o.h;
      roundRect(ctx, o.x, oy, o.w, o.h, 4);
      ctx.fill();
    });
  }

  const kd = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === " " || k === "arrowup" || k === "w") {
      jump();
      e.preventDefault();
    } else if (k === "arrowdown" || k === "s") {
      player.ducking = true;
      e.preventDefault();
    } else if (k === "r" && !alive) reset();
  };
  const ku = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "arrowdown" || k === "s") player.ducking = false;
  };
  const pd = () => jump();

  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  canvas.addEventListener("pointerdown", pd);
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
      canvas.removeEventListener("pointerdown", pd);
    },
  };
};

export default runner;
