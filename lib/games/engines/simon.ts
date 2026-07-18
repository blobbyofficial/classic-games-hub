import type { GameEngineFactory } from "@/types";
import { beep, palette } from "../helpers";

const simon: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) / 2 - 12;
  const COLORS = [
    { base: "#166534", lit: "#22c55e", freq: 330 },
    { base: "#991b1b", lit: "#ef4444", freq: 440 },
    { base: "#854d0e", lit: "#eab308", freq: 550 },
    { base: "#1e40af", lit: "#3b82f6", freq: 660 },
  ];
  let sequence: number[] = [];
  let userIdx = 0;
  let flashing = -1;
  let playing = false; // showing sequence
  let round = 0;
  let alive = true;
  let raf = 0;

  function reset() {
    sequence = [];
    userIdx = 0;
    round = 0;
    alive = true;
    onScore(0);
    nextRound();
  }

  function nextRound() {
    round++;
    onScore(round - 1);
    sequence.push(Math.floor(Math.random() * 4));
    userIdx = 0;
    onStatus?.(`Round ${round} — watch`);
    playSequence();
  }

  function playSequence() {
    playing = true;
    let i = 0;
    const showNext = () => {
      if (i >= sequence.length) {
        playing = false;
        flashing = -1;
        onStatus?.("Your turn");
        return;
      }
      flashing = sequence[i];
      beep(COLORS[flashing].freq, 0.25);
      setTimeout(() => {
        flashing = -1;
        setTimeout(() => {
          i++;
          showNext();
        }, 180);
      }, 380);
    };
    setTimeout(showNext, 500);
  }

  function press(idx: number) {
    if (playing || !alive) return;
    flashing = idx;
    beep(COLORS[idx].freq, 0.2);
    setTimeout(() => (flashing = -1), 200);
    if (sequence[userIdx] === idx) {
      userIdx++;
      if (userIdx === sequence.length) {
        setTimeout(nextRound, 600);
      }
    } else {
      alive = false;
      beep(120, 0.4, "sawtooth");
      onStatus?.(`Game over — round ${round}`);
      onGameOver((round - 1) * 100, round);
    }
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    COLORS.forEach((c, i) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, (i * Math.PI) / 2 - Math.PI, ((i + 1) * Math.PI) / 2 - Math.PI);
      ctx.closePath();
      ctx.fillStyle = flashing === i ? c.lit : c.base;
      ctx.fill();
    });
    ctx.fillStyle = pal.bg;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.fg;
    ctx.font = "bold 22px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(round), cx, cy);
    raf = requestAnimationFrame(render);
  }

  const quadFor = (mx: number, my: number) => {
    const dx = mx - cx;
    const dy = my - cy;
    if (Math.hypot(dx, dy) > R || Math.hypot(dx, dy) < R * 0.32) return -1;
    // quadrants: TL=0, TR=1, BR=2? map to our arc layout starting at -PI
    if (dx < 0 && dy < 0) return 0;
    if (dx >= 0 && dy < 0) return 1;
    if (dx >= 0 && dy >= 0) return 2;
    return 3;
  };

  const onDown = (e: PointerEvent) => {
    if (!alive) {
      reset();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    const q = quadFor(mx, my);
    if (q >= 0) press(q);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key >= "1" && e.key <= "4") press(Number(e.key) - 1);
    else if (e.key.toLowerCase() === "r" && !alive) reset();
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

export default simon;
