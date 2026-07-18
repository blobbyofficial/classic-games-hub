import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette, roundRect } from "../helpers";

const frogger: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const ROWS = 13;
  const rh = height / ROWS;
  const cw = width / 13;
  let frog = { col: 6, row: ROWS - 1 };
  let best = ROWS - 1;
  let score = 0;
  let lives = 3;
  let alive = true;

  // lanes: rows 1-5 river (logs), rows 7-11 road (cars); 0 = goal, 6 & 12 safe
  interface Lane { row: number; type: "car" | "log"; speed: number; items: number[]; len: number; color: string }
  let lanes: Lane[] = [];

  function buildLanes() {
    lanes = [];
    const laneRows = [
      { row: 1, type: "log", speed: 1.4, len: 3, color: "#a16207" },
      { row: 2, type: "log", speed: -1.9, len: 2, color: "#92400e" },
      { row: 3, type: "log", speed: 1.1, len: 4, color: "#a16207" },
      { row: 4, type: "log", speed: -1.6, len: 2, color: "#92400e" },
      { row: 5, type: "log", speed: 2.1, len: 3, color: "#a16207" },
      { row: 7, type: "car", speed: -2.4, len: 1, color: "#ef4444" },
      { row: 8, type: "car", speed: 1.7, len: 1, color: "#f59e0b" },
      { row: 9, type: "car", speed: -1.4, len: 2, color: "#38bdf8" },
      { row: 10, type: "car", speed: 2.6, len: 1, color: "#a78bfa" },
      { row: 11, type: "car", speed: -1.9, len: 1, color: "#f472b6" },
    ] as const;
    laneRows.forEach((l) => {
      const items: number[] = [];
      for (let i = 0; i < 4; i++) items.push((i * 4 + Math.random() * 2) * cw);
      lanes.push({ ...l, items });
    });
  }

  function reset() {
    frog = { col: 6, row: ROWS - 1 };
    best = ROWS - 1;
    score = 0;
    lives = 3;
    alive = true;
    buildLanes();
    onScore(0);
    onStatus?.("");
  }

  function die() {
    lives--;
    beep(140, 0.25, "sawtooth");
    frog = { col: 6, row: ROWS - 1 };
    best = ROWS - 1;
    if (lives <= 0) {
      alive = false;
      onStatus?.("Game over");
      onGameOver(score, 0);
    }
  }

  function hop(dc: number, dr: number) {
    if (!alive) return;
    frog.col = Math.max(0, Math.min(12, frog.col + dc));
    frog.row = Math.max(0, Math.min(ROWS - 1, frog.row + dr));
    beep(520, 0.04);
    if (frog.row < best) {
      best = frog.row;
      score += 10;
      onScore(score);
    }
    if (frog.row === 0) {
      score += 100;
      onScore(score);
      beep(880, 0.15);
      frog = { col: 6, row: ROWS - 1 };
      best = ROWS - 1;
    }
  }

  function update() {
    if (!alive) return;
    lanes.forEach((lane) => {
      lane.items = lane.items.map((x) => {
        let nx = x + lane.speed;
        if (nx > width + lane.len * cw) nx = -lane.len * cw;
        if (nx < -lane.len * cw) nx = width + lane.len * cw;
        return nx;
      });
    });

    const lane = lanes.find((l) => l.row === frog.row);
    const fx = frog.col * cw + cw / 2;
    if (lane) {
      const onItem = lane.items.some((x) => fx > x && fx < x + lane.len * cw);
      if (lane.type === "car" && onItem) die();
      else if (lane.type === "log") {
        if (!onItem) die();
        else {
          frog.col += lane.speed / cw;
          if (frog.col < 0 || frog.col > 12) die();
        }
      }
    }
  }

  function render() {
    // zones
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(0, rh, width, rh * 5);
    ctx.fillStyle = "#15803d";
    ctx.fillRect(0, 0, width, rh);
    ctx.fillRect(0, rh * 6, width, rh);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, rh * 7, width, rh * 5);
    ctx.fillStyle = "#065f46";
    ctx.fillRect(0, rh * 12, width, rh);

    lanes.forEach((lane) => {
      ctx.fillStyle = lane.color;
      lane.items.forEach((x) => {
        roundRect(ctx, x, lane.row * rh + rh * 0.15, lane.len * cw, rh * 0.7, 6);
        ctx.fill();
      });
    });

    // frog
    ctx.fillStyle = pal.green;
    const fx = frog.col * cw;
    roundRect(ctx, fx + cw * 0.15, frog.row * rh + rh * 0.15, cw * 0.7, rh * 0.7, 8);
    ctx.fill();
    ctx.fillStyle = "#052e16";
    ctx.fillRect(fx + cw * 0.3, frog.row * rh + rh * 0.28, 4, 4);
    ctx.fillRect(fx + cw * 0.55, frog.row * rh + rh * 0.28, 4, 4);

    ctx.fillStyle = "#fff";
    ctx.font = "14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("♥".repeat(Math.max(0, lives)), 12, rh * 0.7);
  }

  const kd = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") hop(0, -1);
    else if (k === "arrowdown" || k === "s") hop(0, 1);
    else if (k === "arrowleft" || k === "a") hop(-1, 0);
    else if (k === "arrowright" || k === "d") hop(1, 0);
    else if (k === "r" && !alive) reset();
    else return;
    e.preventDefault();
  };

  window.addEventListener("keydown", kd);
  reset();
  const loop = createLoop(update, render);

  return {
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    restart: () => reset(),
    destroy: () => {
      loop.stop();
      window.removeEventListener("keydown", kd);
    },
  };
};

export default frogger;
