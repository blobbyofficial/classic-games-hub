import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette } from "../helpers";

const target: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  interface T { x: number; y: number; r: number; born: number; life: number }
  let targets: T[] = [];
  let score = 0;
  let combo = 0;
  let timeLeft = 60;
  let spawnAcc = 0;
  let running = true;
  let elapsed = 0;

  function reset() {
    targets = [];
    score = 0;
    combo = 0;
    timeLeft = 60;
    spawnAcc = 0;
    elapsed = 0;
    running = true;
    onScore(0);
    onStatus?.("Click the targets!");
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
    spawnAcc += dt;
    const rate = Math.max(0.35, 0.9 - elapsed / 120);
    if (spawnAcc > rate) {
      spawnAcc = 0;
      const r = 18 + Math.random() * 22;
      targets.push({
        x: r + Math.random() * (width - 2 * r),
        y: r + Math.random() * (height - 2 * r),
        r,
        born: elapsed,
        life: 1.1 + Math.random() * 0.6,
      });
    }
    targets = targets.filter((t) => {
      if (elapsed - t.born > t.life) {
        combo = 0;
        return false;
      }
      return true;
    });
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    targets.forEach((t) => {
      const age = (elapsed - t.born) / t.life;
      const r = t.r * (1 - age * 0.4);
      ctx.fillStyle = pal.red;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(t.x, t.y, r * 0.66, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.red;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r * 0.33, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = pal.fg;
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`, 12, 26);
    ctx.textAlign = "right";
    ctx.fillStyle = combo > 2 ? pal.gold : pal.muted;
    ctx.fillText(combo > 1 ? `${combo}x combo` : "", width - 12, 26);
  }

  const onDown = (e: PointerEvent) => {
    if (!running) {
      reset();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    let hit = false;
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      if (Math.hypot(t.x - mx, t.y - my) < t.r) {
        targets.splice(i, 1);
        combo++;
        const pts = Math.round((10 + (30 - t.r)) * Math.min(combo, 8));
        score += pts;
        onScore(score);
        beep(440 + combo * 40, 0.05);
        hit = true;
        break;
      }
    }
    if (!hit) {
      combo = 0;
      score = Math.max(0, score - 5);
      onScore(score);
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

export default target;
