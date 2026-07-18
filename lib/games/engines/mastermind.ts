import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

const mastermind: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316"];
  const SLOTS = 4;
  const MAX = 10;
  let secret: number[] = [];
  let guesses: { code: number[]; black: number; white: number }[] = [];
  let current: number[] = [];
  let picker = 0;
  let over = false;
  let raf = 0;

  const rowH = (height - 60) / MAX;
  const pegR = Math.min(rowH * 0.32, width * 0.05);

  function reset() {
    secret = Array.from({ length: SLOTS }, () => Math.floor(Math.random() * COLORS.length));
    guesses = [];
    current = [];
    picker = 0;
    over = false;
    onScore(0);
    onStatus?.("Pick 4 colors, then submit");
  }

  function score(code: number[]) {
    const s = [...secret];
    const g = [...code];
    let black = 0;
    let white = 0;
    for (let i = 0; i < SLOTS; i++)
      if (g[i] === s[i]) {
        black++;
        s[i] = g[i] = -1;
      }
    for (let i = 0; i < SLOTS; i++) {
      if (g[i] === -1) continue;
      const j = s.indexOf(g[i]);
      if (j >= 0) {
        white++;
        s[j] = -1;
      }
    }
    return { black, white };
  }

  function submit() {
    if (current.length !== SLOTS || over) return;
    const r = score(current);
    guesses.push({ code: [...current], black: r.black, white: r.white });
    beep(r.black === SLOTS ? 880 : 440, 0.08);
    if (r.black === SLOTS) {
      over = true;
      const sc = (MAX - guesses.length + 1) * 100;
      onScore(sc);
      onStatus?.(`Cracked in ${guesses.length}!`);
      onGameOver(sc, guesses.length);
    } else if (guesses.length >= MAX) {
      over = true;
      onStatus?.("Out of guesses!");
      onGameOver(guesses.length * 10, guesses.length);
    }
    current = [];
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    // guessed rows (bottom up)
    for (let i = 0; i < MAX; i++) {
      const y = height - 60 - (i + 1) * rowH + rowH / 2;
      const g = guesses[i];
      const isCurrent = i === guesses.length && !over;
      for (let s = 0; s < SLOTS; s++) {
        const x = width * 0.12 + s * (width * 0.16);
        const code = g ? g.code[s] : isCurrent ? current[s] : undefined;
        ctx.fillStyle = code != null ? COLORS[code] : "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.arc(x, y, pegR, 0, Math.PI * 2);
        ctx.fill();
      }
      // feedback pegs
      if (g) {
        const fx = width * 0.72;
        for (let k = 0; k < SLOTS; k++) {
          const px = fx + (k % 2) * 14;
          const py = y - 8 + Math.floor(k / 2) * 14;
          ctx.fillStyle = k < g.black ? "#111827" : k < g.black + g.white ? "#e5e7eb" : "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // palette
    COLORS.forEach((c, i) => {
      const x = 20 + i * ((width - 40) / COLORS.length);
      ctx.fillStyle = c;
      const sel = picker === i;
      ctx.beginPath();
      ctx.arc(x + 14, height - 26, sel ? 16 : 13, 0, Math.PI * 2);
      ctx.fill();
      if (sel) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    void roundRect;
    raf = requestAnimationFrame(render);
  }

  const onDown = (e: PointerEvent) => {
    if (over) {
      reset();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    if (my > height - 46) {
      const i = Math.floor((mx - 6) / ((width - 40) / COLORS.length));
      if (i >= 0 && i < COLORS.length) {
        picker = i;
        if (current.length < SLOTS) {
          current.push(i);
          beep(400, 0.03);
          if (current.length === SLOTS) submit();
        }
      }
    } else {
      // tap a current peg to clear last
      if (current.length) current.pop();
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key >= "1" && e.key <= String(COLORS.length)) {
      const i = Number(e.key) - 1;
      picker = i;
      if (current.length < SLOTS) current.push(i);
      if (current.length === SLOTS) submit();
    } else if (e.key === "Enter") submit();
    else if (e.key === "Backspace") current.pop();
    else if (e.key.toLowerCase() === "r" && over) reset();
  };

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  reset();
  render();

  return {
    pause: () => {},
    resume: () => {},
    restart: () => reset(),
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    },
  };
};

export default mastermind;
