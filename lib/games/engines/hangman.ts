import type { GameEngineFactory } from "@/types";
import { beep, palette, tune } from "../helpers";

const WORDS = [
  "ARCADE", "JOYSTICK", "PIXEL", "CONSOLE", "AVATAR", "LEVELUP", "RESPAWN",
  "POWERUP", "CHECKPOINT", "HIGHSCORE", "MULTIPLAYER", "SANDBOX", "PLATFORMER",
  "ROGUELIKE", "SPEEDRUN", "COMBO", "BOSSFIGHT", "INVENTORY", "ACHIEVEMENT", "LEADERBOARD",
];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const hangman: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus, difficulty }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  let word = "";
  let guessed = new Set<string>();
  let wrong = 0;
  // Wrong guesses allowed. The clearest difficulty knob this game has: the word
  // list and the letters stay the same, only the room for error changes.
  const MAX = tune(difficulty, { easy: 10, regular: 8, hard: 6 });
  let over = false;
  let raf = 0;

  function reset() {
    word = WORDS[Math.floor(Math.random() * WORDS.length)];
    guessed = new Set();
    wrong = 0;
    over = false;
    onScore(0);
    onStatus?.("Guess the word");
  }

  function guess(letter: string) {
    if (over || guessed.has(letter)) return;
    guessed.add(letter);
    if (word.includes(letter)) {
      beep(600, 0.05);
      if ([...word].every((c) => guessed.has(c))) {
        over = true;
        const sc = Math.max(100, (MAX - wrong) * 150);
        onScore(sc);
        onStatus?.("You got it! 🎉");
        onGameOver(sc, wrong);
      }
    } else {
      wrong++;
      beep(200, 0.08, "sawtooth");
      if (wrong >= MAX) {
        over = true;
        onStatus?.(`The word was ${word}`);
        onGameOver(0, wrong);
      }
    }
  }

  function drawGallows() {
    const cx = width * 0.28;
    const cy = height * 0.14;
    ctx.strokeStyle = pal.fg;
    ctx.lineWidth = 3;
    ctx.beginPath();
    // base + pole
    ctx.moveTo(cx - 50, cy + 200);
    ctx.lineTo(cx + 50, cy + 200);
    ctx.moveTo(cx - 20, cy + 200);
    ctx.lineTo(cx - 20, cy);
    ctx.lineTo(cx + 40, cy);
    ctx.lineTo(cx + 40, cy + 24);
    ctx.stroke();
    const parts = [
      () => ctx.arc(cx + 40, cy + 40, 16, 0, Math.PI * 2), // head
      () => {
        ctx.moveTo(cx + 40, cy + 56);
        ctx.lineTo(cx + 40, cy + 110);
      }, // body
      () => {
        ctx.moveTo(cx + 40, cy + 70);
        ctx.lineTo(cx + 18, cy + 92);
      },
      () => {
        ctx.moveTo(cx + 40, cy + 70);
        ctx.lineTo(cx + 62, cy + 92);
      },
      () => {
        ctx.moveTo(cx + 40, cy + 110);
        ctx.lineTo(cx + 20, cy + 145);
      },
      () => {
        ctx.moveTo(cx + 40, cy + 110);
        ctx.lineTo(cx + 60, cy + 145);
      },
      () => {
        ctx.moveTo(cx + 34, cy + 36);
        ctx.lineTo(cx + 38, cy + 40);
      },
      () => {
        ctx.moveTo(cx + 46, cy + 36);
        ctx.lineTo(cx + 42, cy + 40);
      },
    ];
    ctx.strokeStyle = pal.red;
    for (let i = 0; i < Math.min(wrong, parts.length); i++) {
      ctx.beginPath();
      parts[i]();
      ctx.stroke();
    }
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    drawGallows();

    // word
    ctx.fillStyle = pal.fg;
    ctx.font = `bold ${Math.min(width / (word.length + 2), 34)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const display = [...word].map((c) => (guessed.has(c) || over ? c : "_")).join(" ");
    ctx.fillText(display, width * 0.62, height * 0.32);

    // keyboard
    const perRow = 9;
    const kw = width / (perRow + 1);
    ALPHABET.forEach((ltr, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = kw * 0.6 + col * kw;
      const y = height * 0.55 + row * (kw * 0.9);
      const used = guessed.has(ltr);
      ctx.fillStyle = used ? (word.includes(ltr) ? pal.green : "#475569") : pal.primary;
      ctx.globalAlpha = used ? 0.6 : 1;
      ctx.beginPath();
      ctx.roundRect(x, y, kw * 0.8, kw * 0.7, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${kw * 0.34}px system-ui`;
      ctx.fillText(ltr, x + kw * 0.4, y + kw * 0.37);
    });
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
    const perRow = 9;
    const kw = width / (perRow + 1);
    ALPHABET.forEach((ltr, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = kw * 0.6 + col * kw;
      const y = height * 0.55 + row * (kw * 0.9);
      if (mx > x && mx < x + kw * 0.8 && my > y && my < y + kw * 0.7) guess(ltr);
    });
  };
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toUpperCase();
    if (over && k === "R") reset();
    else if (ALPHABET.includes(k)) guess(k);
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

export default hangman;
