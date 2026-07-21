import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette } from "../helpers";

interface Tgt {
  x: number;
  y: number;
  r: number;
  born: number;
  life: number;
  gold: boolean;
  spawn: number; // scale-in 0..1
}

/** Target Rush: a 60-second reflex test. Targets bloom in, shrink as they age,
 *  and burst into shards when tapped. Chain hits for a rising combo; the rare
 *  gold target is worth double. Mobile-first, tap to shoot. */
const target: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  let targets: Tgt[] = [];
  let bursts: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  let ring: { x: number; y: number; t: number; color: string }[] = [];
  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  let hits = 0;
  let attempts = 0;
  let timeLeft = 60;
  let spawnAcc = 0;
  let running = true;
  let elapsed = 0;
  let flash = 0; // red miss flash

  function reset() {
    targets = [];
    bursts = [];
    ring = [];
    score = 0;
    combo = 0;
    bestCombo = 0;
    hits = 0;
    attempts = 0;
    timeLeft = 60;
    spawnAcc = 0;
    elapsed = 0;
    running = true;
    flash = 0;
    onScore(0);
    onStatus?.("Tap the targets!");
  }

  function spawn() {
    const gold = Math.random() < 0.09;
    const r = (gold ? 16 : 18) + Math.random() * 20;
    targets.push({
      x: r + Math.random() * (width - 2 * r),
      y: r + Math.random() * (height - 2 * r),
      r,
      born: elapsed,
      life: (gold ? 0.9 : 1.15) + Math.random() * 0.55,
      gold,
      spawn: 0,
    });
  }

  function burst(x: number, y: number, color: string, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4;
      bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
    }
    ring.push({ x, y, t: 0, color });
  }

  function update(dt: number) {
    if (flash > 0) flash = Math.max(0, flash - dt * 3);
    bursts = bursts.filter((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.15;
      b.life -= dt * 2.2;
      return b.life > 0;
    });
    ring = ring.filter((rg) => (rg.t += dt * 2.6) < 1);
    if (!running) return;

    timeLeft -= dt;
    elapsed += dt;
    if (timeLeft <= 0) {
      running = false;
      onStatus?.(`Time! Score ${score} · best combo ${bestCombo}x`);
      onGameOver(score, Math.round(elapsed));
      return;
    }
    for (const t of targets) t.spawn = Math.min(1, t.spawn + dt * 6);
    spawnAcc += dt;
    const rate = Math.max(0.3, 0.85 - elapsed / 110);
    if (spawnAcc > rate) {
      spawnAcc = 0;
      spawn();
    }
    targets = targets.filter((t) => {
      if (elapsed - t.born > t.life) {
        combo = 0; // an expired target breaks the chain
        return false;
      }
      return true;
    });
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    if (flash > 0) {
      ctx.fillStyle = `rgba(248,113,113,${flash * 0.18})`;
      ctx.fillRect(0, 0, width, height);
    }

    targets.forEach((t) => {
      const age = (elapsed - t.born) / t.life;
      const ease = 1 - Math.pow(1 - t.spawn, 3);
      const r = t.r * (1 - age * 0.4) * ease;
      const ringColor = t.gold ? "#fbbf24" : "#f87171";
      if (t.gold) {
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 16;
      }
      // concentric rings
      ctx.fillStyle = ringColor;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(t.x, t.y, r * 0.66, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ringColor;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r * 0.33, 0, Math.PI * 2);
      ctx.fill();
    });

    ring.forEach((rg) => {
      ctx.strokeStyle = rg.color;
      ctx.globalAlpha = 1 - rg.t;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(rg.x, rg.y, 6 + rg.t * 46, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    bursts.forEach((b) => {
      ctx.globalAlpha = Math.max(0, b.life);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3 * b.life + 1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // HUD: time bar
    const barW = width - 24;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(12, 10, barW, 6);
    ctx.fillStyle = timeLeft < 10 ? pal.red : pal.neon;
    ctx.fillRect(12, 10, barW * Math.max(0, timeLeft / 60), 6);

    ctx.fillStyle = pal.fg;
    ctx.font = "bold 18px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(String(score), 12, 24);
    ctx.textAlign = "right";
    ctx.fillStyle = combo > 2 ? pal.gold : pal.muted;
    ctx.fillText(combo > 1 ? `${combo}x` : "", width - 12, 24);
  }

  const onDown = (e: PointerEvent) => {
    if (!running) {
      reset();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    attempts++;
    let hitIdx = -1;
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      if (Math.hypot(t.x - mx, t.y - my) < t.r) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx >= 0) {
      const t = targets[hitIdx];
      targets.splice(hitIdx, 1);
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      hits++;
      const base = 10 + Math.round(30 - t.r);
      const pts = Math.round(base * Math.min(combo, 8) * (t.gold ? 2 : 1));
      score += pts;
      onScore(score);
      burst(t.x, t.y, t.gold ? "#fbbf24" : "#f87171", t.gold ? 16 : 10);
      beep((t.gold ? 660 : 440) + combo * 36, 0.05, "square", 0.05);
    } else {
      combo = 0;
      flash = 1;
      score = Math.max(0, score - 5);
      onScore(score);
      beep(150, 0.06, "sawtooth", 0.04);
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
