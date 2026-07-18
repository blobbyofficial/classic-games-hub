/** Shared helpers for canvas game engines. */

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Read a CSS custom property as a color string (falls back if unavailable). */
export function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** The engine's palette, resolved from the current theme. */
export function palette() {
  return {
    fg: cssVar("--foreground", "#e5e5e5"),
    bg: cssVar("--card", "#1e1b2e"),
    primary: "#8b5cf6",
    accent: "#ec4899",
    neon: "#22d3ee",
    gold: "#fbbf24",
    green: "#34d399",
    red: "#f87171",
    muted: "#6b7280",
  };
}

/** Rounded-rect path helper. */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** A short beep using the Web Audio API (best-effort, silent on failure). */
let audioCtx: AudioContext | null = null;
export function beep(freq = 440, duration = 0.08, type: OscillatorType = "square", volume = 0.04) {
  if (typeof window === "undefined") return;
  try {
    audioCtx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    /* audio not available */
  }
}

/**
 * A fixed-timestep game loop. Calls `update(dt)` at a steady rate and `render()`
 * every animation frame. Returns a controller with pause/resume/stop.
 */
export function createLoop(update: (dt: number) => void, render: () => void, step = 1 / 60) {
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let running = true;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!running) {
      last = now;
      return;
    }
    let delta = (now - last) / 1000;
    last = now;
    if (delta > 0.25) delta = 0.25; // avoid spiral of death after tab-away
    acc += delta;
    while (acc >= step) {
      update(step);
      acc -= step;
    }
    render();
  };
  raf = requestAnimationFrame(frame);

  return {
    pause() {
      running = false;
    },
    resume() {
      running = true;
      last = performance.now();
    },
    stop() {
      cancelAnimationFrame(raf);
    },
    get running() {
      return running;
    },
  };
}
