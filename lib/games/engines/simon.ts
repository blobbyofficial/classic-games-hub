import type { GameEngineFactory } from "@/types";
import { beep, palette } from "../helpers";

type Pad = { base: string; lit: string; freq: number };

/** Simon: a glowing four-pad memory game. Animated flashes with bloom, a press
 *  ripple, a pulsing centre core, and a shake on a wrong tap. Mobile-first -
 *  tap a quadrant (or press 1–4). */
const simon: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) / 2 - 14;
  const rInner = R * 0.34;
  const gap = 0.045; // radial gap between pads

  const PADS: Pad[] = [
    { base: "#0f5132", lit: "#4ade80", freq: 329.63 }, // top-left  (E4)
    { base: "#7f1d1d", lit: "#f87171", freq: 440.0 }, //  top-right (A4)
    { base: "#854d0e", lit: "#fbbf24", freq: 554.37 }, // bottom-right (C#5)
    { base: "#1e3a8a", lit: "#60a5fa", freq: 659.25 }, // bottom-left (E5)
  ];

  let sequence: number[] = [];
  let userIdx = 0;
  let round = 0;
  let best = 0;
  let showing = false; // replaying the sequence
  let alive = true;

  // animation state
  const glow = [0, 0, 0, 0]; // per-pad brightness 0..1
  const ripple: { pad: number; t: number }[] = [];
  let corePulse = 0;
  let shakeT = 0;
  let flashOk = 0; // green success flash on the core
  let raf = 0;
  let last = performance.now();
  const timers: ReturnType<typeof setTimeout>[] = [];

  const after = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };
  const clearTimers = () => {
    while (timers.length) clearTimeout(timers.pop()!);
  };

  function reset() {
    clearTimers();
    sequence = [];
    userIdx = 0;
    round = 0;
    alive = true;
    for (let i = 0; i < 4; i++) glow[i] = 0;
    ripple.length = 0;
    onScore(0);
    after(400, nextRound);
  }

  function nextRound() {
    round++;
    onScore(round - 1);
    if (round - 1 > best) best = round - 1;
    sequence.push(Math.floor(Math.random() * 4));
    userIdx = 0;
    onStatus?.(`Round ${round} - watch`);
    replay();
  }

  function light(pad: number, ms: number) {
    glow[pad] = 1;
    beep(PADS[pad].freq, ms / 1000, "sine", 0.06);
    after(ms, () => {
      // let render ease it back down
      glow[pad] = 0.999;
    });
  }

  function replay() {
    showing = true;
    const speed = Math.max(230, 560 - round * 22); // gets snappier as it grows
    let i = 0;
    const step = () => {
      if (i >= sequence.length) {
        showing = false;
        onStatus?.("Your turn - repeat it");
        return;
      }
      light(sequence[i], speed * 0.6);
      after(speed, () => {
        i++;
        step();
      });
    };
    after(500, step);
  }

  function press(pad: number) {
    if (showing || !alive) return;
    glow[pad] = 1;
    ripple.push({ pad, t: 0 });
    beep(PADS[pad].freq, 0.18, "sine", 0.07);
    after(150, () => (glow[pad] = 0.999));

    if (sequence[userIdx] === pad) {
      userIdx++;
      if (userIdx === sequence.length) {
        flashOk = 1;
        onStatus?.(`Round ${round} clear!`);
        beep(880, 0.09, "sine", 0.05);
        after(90, () => beep(1174, 0.12, "sine", 0.05));
        after(620, nextRound);
      }
    } else {
      alive = false;
      shakeT = 1;
      beep(150, 0.35, "sawtooth", 0.06);
      onStatus?.(`Wrong! Reached round ${round} - tap to retry`);
      onGameOver((round - 1) * 100, round);
    }
  }

  function padPath(i: number) {
    // arc layout starts at -PI (left), each pad a quarter turn clockwise
    const a0 = i * (Math.PI / 2) - Math.PI + gap;
    const a1 = (i + 1) * (Math.PI / 2) - Math.PI - gap;
    ctx.beginPath();
    ctx.arc(cx, cy, R, a0, a1);
    ctx.arc(cx, cy, rInner + 6, a1, a0, true);
    ctx.closePath();
  }

  function mix(base: string, lit: string, t: number) {
    const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const [r1, g1, b1] = p(base);
    const [r2, g2, b2] = p(lit);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
  }

  function render(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    corePulse += dt * (showing ? 4 : 2.2);
    if (flashOk > 0) flashOk = Math.max(0, flashOk - dt * 2);
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt * 2.4);
    for (let i = 0; i < 4; i++) if (glow[i] > 0 && glow[i] >= 0.999) glow[i] = Math.max(0, glow[i] - dt * 4);
    for (let i = ripple.length - 1; i >= 0; i--) {
      ripple[i].t += dt * 2.2;
      if (ripple[i].t >= 1) ripple.splice(i, 1);
    }

    const sx = shakeT > 0 ? Math.sin(now / 22) * 7 * shakeT : 0;
    const sy = shakeT > 0 ? Math.cos(now / 26) * 5 * shakeT : 0;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(sx, sy);

    PADS.forEach((pad, i) => {
      const g = glow[i];
      padPath(i);
      ctx.fillStyle = mix(pad.base, pad.lit, g);
      if (g > 0.02) {
        ctx.shadowColor = pad.lit;
        ctx.shadowBlur = 30 * g;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      // subtle inner sheen
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + g * 0.25})`;
      ctx.lineWidth = 2;
      padPath(i);
      ctx.stroke();
    });

    // press ripples (radial ring inside the tapped pad)
    ripple.forEach((rp) => {
      const midA = rp.pad * (Math.PI / 2) - Math.PI + Math.PI / 4;
      const rr = rInner + 6 + (R - rInner - 6) * 0.5;
      const px = cx + Math.cos(midA) * rr;
      const py = cy + Math.sin(midA) * rr;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - rp.t) * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 6 + rp.t * R * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    });

    // centre core
    const beat = 1 + Math.sin(corePulse) * 0.03;
    ctx.beginPath();
    ctx.arc(cx, cy, rInner * beat, 0, Math.PI * 2);
    const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rInner);
    const ok = flashOk;
    coreGrad.addColorStop(0, ok > 0 ? `rgba(52,211,153,${0.5 + ok * 0.5})` : "rgba(139,92,246,0.35)");
    coreGrad.addColorStop(1, pal.bg);
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.strokeStyle = ok > 0 ? pal.green : "rgba(139,92,246,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = pal.fg;
    ctx.font = `bold ${rInner * 0.55}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(alive ? String(round) : "✕", cx, cy - rInner * 0.12);
    ctx.font = `${rInner * 0.2}px system-ui`;
    ctx.fillStyle = pal.muted;
    ctx.fillText(best > 0 ? `best ${best}` : "SIMON", cx, cy + rInner * 0.42);

    ctx.restore();
    raf = requestAnimationFrame(render);
  }

  function quadAt(mx: number, my: number): number {
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > R || dist < rInner + 6) return -1;
    let a = Math.atan2(dy, dx); // -PI..PI
    if (a < -Math.PI) a += Math.PI * 2;
    // pads span [-PI,-PI/2), [-PI/2,0), [0,PI/2), [PI/2,PI)
    return Math.floor((a + Math.PI) / (Math.PI / 2)) % 4;
  }

  const onDown = (e: PointerEvent) => {
    if (!alive) {
      reset();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    const q = quadAt(mx, my);
    if (q >= 0) press(q);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key >= "1" && e.key <= "4") press(Number(e.key) - 1);
    else if (e.key.toLowerCase() === "r" && !alive) reset();
  };

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  reset();
  raf = requestAnimationFrame(render);

  return {
    pause: () => cancelAnimationFrame(raf),
    resume: () => {
      last = performance.now();
      raf = requestAnimationFrame(render);
    },
    restart: () => {
      best = 0;
      reset();
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      clearTimers();
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    },
  };
};

export default simon;
