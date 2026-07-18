import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette } from "../helpers";

const whack: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const GRID = 3;
  const holes = Array.from({ length: GRID * GRID }, (_, i) => ({
    cx: (width / GRID) * (i % GRID) + width / GRID / 2,
    cy: (height / GRID) * Math.floor(i / GRID) + height / GRID / 2,
    up: 0, // 0 = down, >0 = time remaining
    kind: "mole" as "mole" | "gold" | "bomb",
  }));
  let score = 0;
  let timeLeft = 45;
  let spawnAcc = 0;
  let running = true;
  let elapsed = 0;

  function reset() {
    holes.forEach((h) => (h.up = 0));
    score = 0;
    timeLeft = 45;
    spawnAcc = 0;
    elapsed = 0;
    running = true;
    onScore(0);
    onStatus?.("Whack the moles!");
  }

  function update(dt: number) {
    if (!running) return;
    timeLeft -= dt;
    elapsed += dt;
    if (timeLeft <= 0) {
      running = false;
      onStatus?.("Time!");
      onGameOver(score, Math.round(elapsed));
      return;
    }
    holes.forEach((h) => {
      if (h.up > 0) h.up -= dt;
    });
    spawnAcc += dt;
    const rate = Math.max(0.4, 0.9 - elapsed / 60);
    if (spawnAcc > rate) {
      spawnAcc = 0;
      const down = holes.filter((h) => h.up <= 0);
      if (down.length) {
        const h = down[Math.floor(Math.random() * down.length)];
        const roll = Math.random();
        h.kind = roll < 0.12 ? "gold" : roll < 0.28 ? "bomb" : "mole";
        h.up = Math.max(0.6, 1.2 - elapsed / 90);
      }
    }
  }

  function render() {
    ctx.fillStyle = "#14532d";
    ctx.fillRect(0, 0, width, height);
    holes.forEach((h) => {
      const r = Math.min(width, height) / GRID / 2.6;
      // hole
      ctx.fillStyle = "#052e16";
      ctx.beginPath();
      ctx.ellipse(h.cx, h.cy + r * 0.5, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (h.up > 0) {
        ctx.fillStyle = h.kind === "gold" ? pal.gold : h.kind === "bomb" ? "#111827" : "#a16207";
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, r * 0.8, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        // eyes
        ctx.fillStyle = h.kind === "bomb" ? pal.red : "#111";
        ctx.beginPath();
        ctx.arc(h.cx - r * 0.28, h.cy - r * 0.1, 4, 0, Math.PI * 2);
        ctx.arc(h.cx + r * 0.28, h.cy - r * 0.1, 4, 0, Math.PI * 2);
        ctx.fill();
        if (h.kind === "bomb") {
          ctx.fillStyle = pal.red;
          ctx.font = "bold 20px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("✦", h.cx, h.cy + r * 0.9);
        }
      }
    });
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`, 12, 26);
  }

  const onDown = (e: PointerEvent) => {
    if (!running) {
      reset();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    const r = Math.min(width, height) / GRID / 2.6;
    for (const h of holes) {
      if (h.up > 0 && Math.hypot(h.cx - mx, h.cy - my) < r) {
        if (h.kind === "bomb") {
          score = Math.max(0, score - 20);
          beep(120, 0.2, "sawtooth");
        } else {
          score += h.kind === "gold" ? 30 : 10;
          beep(h.kind === "gold" ? 880 : 520, 0.05);
        }
        h.up = 0;
        onScore(score);
        return;
      }
    }
  };

  canvas.addEventListener("pointerdown", onDown);
  reset();
  const loop = createLoop(update, render);

  return {
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    restart: () => reset(),
    destroy: () => {
      loop.stop();
      canvas.removeEventListener("pointerdown", onDown);
    },
  };
};

export default whack;
