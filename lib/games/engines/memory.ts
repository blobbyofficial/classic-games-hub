import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

const memory: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const COLS = 4;
  const ROWS = 4;
  const EMOJI = ["🎮", "👾", "🕹️", "🎲", "🎯", "🏆", "⭐", "💎"];
  interface Card { sym: string; flipped: boolean; matched: boolean }
  let cards: Card[] = [];
  let first = -1;
  let second = -1;
  let lock = false;
  let moves = 0;
  let matched = 0;
  let raf = 0;

  const cw = width / COLS;
  const ch = height / ROWS;

  function reset() {
    const syms = [...EMOJI, ...EMOJI].sort(() => Math.random() - 0.5);
    cards = syms.map((sym) => ({ sym, flipped: false, matched: false }));
    first = second = -1;
    lock = false;
    moves = 0;
    matched = 0;
    onScore(0);
    onStatus?.("Match all pairs");
  }

  function flip(i: number) {
    if (lock || cards[i].flipped || cards[i].matched) return;
    cards[i].flipped = true;
    beep(440, 0.04);
    if (first === -1) {
      first = i;
    } else {
      second = i;
      moves++;
      lock = true;
      if (cards[first].sym === cards[second].sym) {
        setTimeout(() => {
          cards[first].matched = cards[second].matched = true;
          matched++;
          beep(660, 0.08);
          const score = Math.max(50, 1000 - moves * 40);
          onScore(score);
          first = second = -1;
          lock = false;
          if (matched === EMOJI.length) {
            onStatus?.(`Solved in ${moves} moves!`);
            onGameOver(score, moves);
          }
        }, 350);
      } else {
        setTimeout(() => {
          cards[first].flipped = cards[second].flipped = false;
          first = second = -1;
          lock = false;
        }, 750);
      }
    }
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    cards.forEach((c, i) => {
      const x = (i % COLS) * cw + 4;
      const y = Math.floor(i / COLS) * ch + 4;
      const w = cw - 8;
      const h = ch - 8;
      if (c.matched) {
        ctx.globalAlpha = 0.35;
      }
      ctx.fillStyle = c.flipped || c.matched ? pal.primary : "#334155";
      roundRect(ctx, x, y, w, h, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (c.flipped || c.matched) {
        ctx.font = `${Math.min(w, h) * 0.5}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.sym, x + w / 2, y + h / 2 + 2);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.font = `bold ${Math.min(w, h) * 0.4}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", x + w / 2, y + h / 2 + 2);
      }
    });
    raf = requestAnimationFrame(render);
  }

  const onDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    const i = Math.floor(my / ch) * COLS + Math.floor(mx / cw);
    if (i >= 0 && i < cards.length) flip(i);
  };

  canvas.addEventListener("pointerdown", onDown);
  reset();
  render();

  return {
    pause: () => {},
    resume: () => {},
    restart: () => reset(),
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
    },
  };
};

export default memory;
