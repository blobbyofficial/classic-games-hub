import type { GameEngineFactory } from "@/types";
import { beep, palette } from "../helpers";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const tictactoe: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const size = Math.min(width, height);
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / 3;
  let board: (null | "X" | "O")[] = [];
  let wins = 0;
  let over = false;
  let busy = false;
  let raf = 0;

  function reset() {
    board = Array(9).fill(null);
    over = false;
    busy = false;
    onScore(wins);
    onStatus?.("You are X — tap a square");
  }

  function winner(b: (null | "X" | "O")[]): "X" | "O" | "draw" | null {
    for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    return b.every((v) => v) ? "draw" : null;
  }

  function minimax(b: (null | "X" | "O")[], player: "X" | "O"): { score: number; move: number } {
    const w = winner(b);
    if (w === "O") return { score: 10, move: -1 };
    if (w === "X") return { score: -10, move: -1 };
    if (w === "draw") return { score: 0, move: -1 };
    let best = { score: player === "O" ? -Infinity : Infinity, move: -1 };
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = player;
      const res = minimax(b, player === "O" ? "X" : "O");
      b[i] = null;
      if (player === "O" ? res.score > best.score : res.score < best.score) best = { score: res.score, move: i };
    }
    return best;
  }

  function aiMove() {
    busy = true;
    setTimeout(() => {
      // 15% random for beatability
      const empties = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      const move = Math.random() < 0.15 ? empties[Math.floor(Math.random() * empties.length)] : minimax([...board], "O").move;
      if (move >= 0) board[move] = "O";
      beep(330, 0.05);
      busy = false;
      check();
    }, 350);
  }

  function check() {
    const w = winner(board);
    if (!w) return;
    over = true;
    if (w === "X") {
      wins++;
      onScore(wins * 100);
      onStatus?.("You win! 🎉");
      onGameOver(wins * 100, wins);
    } else if (w === "O") {
      onStatus?.("AI wins — tap to retry");
      onGameOver(wins * 100, wins);
    } else {
      onStatus?.("Draw — tap to retry");
      onGameOver(wins * 100 + 20, wins);
    }
  }

  function play(i: number) {
    if (over) {
      reset();
      return;
    }
    if (board[i] || busy) return;
    board[i] = "X";
    beep(520, 0.05);
    check();
    if (!over) aiMove();
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 4;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * cell, oy + 10);
      ctx.lineTo(ox + i * cell, oy + size - 10);
      ctx.moveTo(ox + 10, oy + i * cell);
      ctx.lineTo(ox + size - 10, oy + i * cell);
      ctx.stroke();
    }
    board.forEach((v, i) => {
      if (!v) return;
      const cx = ox + (i % 3) * cell + cell / 2;
      const cy = oy + Math.floor(i / 3) * cell + cell / 2;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      if (v === "X") {
        ctx.strokeStyle = pal.neon;
        const r = cell * 0.26;
        ctx.beginPath();
        ctx.moveTo(cx - r, cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.moveTo(cx + r, cy - r);
        ctx.lineTo(cx - r, cy + r);
        ctx.stroke();
      } else {
        ctx.strokeStyle = pal.accent;
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.28, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    raf = requestAnimationFrame(render);
  }

  const onDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (over) {
      reset();
      return;
    }
    if (mx < 0 || my < 0 || mx > size || my > size) return;
    play(Math.floor(my / cell) * 3 + Math.floor(mx / cell));
  };

  canvas.addEventListener("pointerdown", onDown);
  reset();
  render();

  return {
    pause: () => {},
    resume: () => {},
    restart: () => {
      wins = 0;
      reset();
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
    },
  };
};

export default tictactoe;
