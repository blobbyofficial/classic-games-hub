import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

type Mark = null | "X" | "O";

/** Polished tic-tac-toe: animated placement, an animated winning strike, hover
 *  feedback and a near-unbeatable minimax AI - plus a local two-player
 *  pass-and-play mode (roadmap v1.4) and online head-to-head against another
 *  member of your party (v1.5). Mobile-first. */
const tictactoe: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus, net }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const size = Math.min(width, height) * 0.92;
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / 3;
  const pad = cell * 0.12;

  let board: Mark[] = [];
  const anim: number[] = []; // per-cell placement progress 0..1
  let streak = 0;
  let over = false;
  let busy = false;
  let winLine: number[] | null = null;
  let winT = 0; // winning-strike progress 0..1
  let hover = -1;
  let shakeT = 0;
  // An online match is decided by the host, not by the mode pill - seat 1
  // plays X and moves first, so both clients agree without negotiating.
  let mode: "ai" | "2p" | "net" = net ? "net" : "ai";
  const myMark: "X" | "O" = net?.seat === 2 ? "O" : "X";
  let turn: "X" | "O" = "X";
  let raf = 0;
  let last = performance.now();

  function turnStatus() {
    if (mode !== "net") return;
    onStatus?.(turn === myMark ? "Your turn" : `${net!.opponentName}'s turn`);
  }

  function reset() {
    board = Array(9).fill(null);
    anim.length = 0;
    for (let i = 0; i < 9; i++) anim[i] = 0;
    over = false;
    busy = false;
    winLine = null;
    winT = 0;
    shakeT = 0;
    turn = "X";
    onScore(streak * 100);
    if (mode === "net") {
      onStatus?.(`You are ${myMark} - ${turn === myMark ? "your move" : `${net!.opponentName} starts`}`);
      return;
    }
    onStatus?.(mode === "ai" ? "You are X - your move" : "Pass & play - X starts");
  }

  function winnerOf(b: Mark[]): { who: "X" | "O"; line: number[] } | "draw" | null {
    for (const line of LINES) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a]!, line };
    }
    return b.every((v) => v) ? "draw" : null;
  }

  function minimax(b: Mark[], player: "X" | "O", depth: number): { score: number; move: number } {
    const w = winnerOf(b);
    if (w === "draw") return { score: 0, move: -1 };
    if (w && w.who === "O") return { score: 10 - depth, move: -1 };
    if (w && w.who === "X") return { score: depth - 10, move: -1 };
    let best = { score: player === "O" ? -Infinity : Infinity, move: -1 };
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = player;
      const res = minimax(b, player === "O" ? "X" : "O", depth + 1);
      b[i] = null;
      if (player === "O" ? res.score > best.score : res.score < best.score) best = { score: res.score, move: i };
    }
    return best;
  }

  function finish() {
    const w = winnerOf(board);
    if (!w) return;
    over = true;

    // Online: the result is reported from this seat's point of view, and the
    // score that gets submitted is the same for both players' clients.
    if (mode === "net") {
      if (w === "draw") {
        onStatus?.("Draw!");
        net!.onResult("draw");
        onGameOver(40, 0);
        beep(300, 0.1, "triangle");
        return;
      }
      winLine = w.line;
      const won = w.who === myMark;
      onStatus?.(won ? "You win! 🎉" : `${net!.opponentName} wins`);
      net!.onResult(won ? "win" : "loss");
      onGameOver(won ? 100 : 0, 0);
      if (won) {
        beep(660, 0.08);
        setTimeout(() => beep(880, 0.12), 90);
      } else {
        shakeT = 1;
        beep(160, 0.25, "sawtooth");
      }
      return;
    }

    if (w === "draw") {
      onStatus?.(mode === "2p" ? "Draw - tap for a rematch" : "Draw - tap to play again");
      onGameOver(mode === "2p" ? 30 : streak * 100 + 20, mode === "2p" ? 0 : streak);
      beep(300, 0.1, "triangle");
      return;
    }
    winLine = w.line;
    if (mode === "2p") {
      onStatus?.(`${w.who} wins! Tap for a rematch`);
      onGameOver(60, 0);
      beep(660, 0.08);
      setTimeout(() => beep(880, 0.12), 90);
      return;
    }
    if (w.who === "X") {
      streak++;
      onScore(streak * 100);
      onStatus?.(`You win! Streak ${streak} 🎉`);
      onGameOver(streak * 100, streak);
      beep(660, 0.08);
      setTimeout(() => beep(880, 0.12), 90);
    } else {
      streak = 0;
      shakeT = 1;
      onStatus?.("AI wins - tap to retry");
      onGameOver(0, 0);
      beep(160, 0.25, "sawtooth");
    }
  }

  function aiMove() {
    busy = true;
    setTimeout(() => {
      const empties = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      // A touch of randomness so it's a fun challenge, not a brick wall.
      const move =
        Math.random() < 0.12
          ? empties[Math.floor(Math.random() * empties.length)]
          : minimax([...board], "O", 0).move;
      if (move >= 0) {
        board[move] = "O";
        anim[move] = 0.001;
        beep(330, 0.05);
      }
      busy = false;
      finish();
    }, 320);
  }

  function play(i: number) {
    if (mode === "net") {
      // No tap-to-restart online: rematches are the party leader's call.
      if (over || board[i] || turn !== myMark) return;
      board[i] = myMark;
      anim[i] = 0.001;
      beep(myMark === "X" ? 540 : 330, 0.05);
      net!.send({ i });
      finish();
      if (!over) {
        turn = myMark === "X" ? "O" : "X";
        turnStatus();
      }
      return;
    }
    if (over) return reset();
    if (board[i] || busy) return;
    if (mode === "2p") {
      board[i] = turn;
      anim[i] = 0.001;
      beep(turn === "X" ? 540 : 330, 0.05);
      finish();
      if (!over) {
        turn = turn === "X" ? "O" : "X";
        onStatus?.(`${turn}'s turn`);
      }
      return;
    }
    board[i] = "X";
    anim[i] = 0.001;
    beep(540, 0.05);
    finish();
    if (!over) aiMove();
  }

  // Mode pill (top-right): switch between vs-AI and local pass-and-play.
  const pill = { w: 92, h: 24, x: width - 100, y: 6 };
  function drawModePill() {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, pill.x, pill.y, pill.w, pill.h, 12);
    ctx.fill();
    const half = pill.w / 2;
    ctx.fillStyle = pal.primary;
    roundRect(ctx, mode === "ai" ? pill.x : pill.x + half, pill.y, half, pill.h, 12);
    ctx.fill();
    ctx.font = "bold 11px ui-sans-serif, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = mode === "ai" ? "#fff" : "rgba(255,255,255,0.6)";
    ctx.fillText("VS AI", pill.x + half / 2, pill.y + pill.h / 2 + 0.5);
    ctx.fillStyle = mode === "2p" ? "#fff" : "rgba(255,255,255,0.6)";
    ctx.fillText("2P", pill.x + half + half / 2, pill.y + pill.h / 2 + 0.5);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  function pillHit(e: PointerEvent): boolean {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const my = ((e.clientY - rect.top) / rect.height) * height;
    return mx >= pill.x && mx <= pill.x + pill.w && my >= pill.y && my <= pill.y + pill.h;
  }

  function cellRect(i: number) {
    return { x: ox + (i % 3) * cell, y: oy + Math.floor(i / 3) * cell };
  }

  function drawMark(i: number, mark: "X" | "O", p: number) {
    const { x, y } = cellRect(i);
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    const r = cell * 0.28;
    const ease = 1 - Math.pow(1 - p, 3);
    ctx.lineWidth = cell * 0.09;
    ctx.lineCap = "round";
    if (mark === "X") {
      ctx.strokeStyle = pal.neon;
      ctx.shadowColor = pal.neon;
      ctx.shadowBlur = 12 * ease;
      const a = Math.min(1, ease * 2);
      const b = Math.max(0, ease * 2 - 1);
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r);
      ctx.lineTo(cx - r + 2 * r * a, cy - r + 2 * r * a);
      ctx.stroke();
      if (b > 0) {
        ctx.beginPath();
        ctx.moveTo(cx + r, cy - r);
        ctx.lineTo(cx + r - 2 * r * b, cy - r + 2 * r * b);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = pal.accent;
      ctx.shadowColor = pal.accent;
      ctx.shadowBlur = 12 * ease;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ease);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function render(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let i = 0; i < 9; i++) if (anim[i] > 0 && anim[i] < 1) anim[i] = Math.min(1, anim[i] + dt * 4);
    if (winLine) winT = Math.min(1, winT + dt * 2.5);
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt * 3);

    const sx = shakeT > 0 ? Math.sin(now / 18) * 6 * shakeT : 0;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(sx, 0);

    for (let i = 0; i < 9; i++) {
      const { x, y } = cellRect(i);
      const isHover = hover === i && !board[i] && !over && !busy;
      ctx.fillStyle = isHover ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)";
      roundRect(ctx, x + pad, y + pad, cell - pad * 2, cell - pad * 2, cell * 0.14);
      ctx.fill();
      const v = board[i];
      if (v) drawMark(i, v, anim[i] || 1);
    }

    if (winLine && winT > 0) {
      const a = cellRect(winLine[0]);
      const b = cellRect(winLine[2]);
      const ax = a.x + cell / 2;
      const ay = a.y + cell / 2;
      const bx = b.x + cell / 2 - ax;
      const by = b.y + cell / 2 - ay;
      ctx.strokeStyle = pal.gold ?? "#fbbf24";
      ctx.lineWidth = cell * 0.06;
      ctx.lineCap = "round";
      ctx.shadowColor = pal.gold ?? "#fbbf24";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + bx * winT, ay + by * winT);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
    if (mode !== "net") drawModePill();
    raf = requestAnimationFrame(render);
  }

  function at(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return -1;
    return Math.floor(my / cell) * 3 + Math.floor(mx / cell);
  }

  const onDown = (e: PointerEvent) => {
    if (mode !== "net" && pillHit(e)) {
      mode = mode === "ai" ? "2p" : "ai";
      if (mode === "2p") streak = 0;
      reset();
      return;
    }
    const i = at(e);
    if (mode === "net") return i >= 0 ? play(i) : undefined;
    if (over) return reset();
    if (i >= 0) play(i);
  };
  const onMove = (e: PointerEvent) => {
    hover = at(e);
  };
  const onLeave = () => {
    hover = -1;
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  reset();
  raf = requestAnimationFrame(render);

  return {
    pause: () => cancelAnimationFrame(raf),
    resume: () => {
      last = performance.now();
      raf = requestAnimationFrame(render);
    },
    restart: () => {
      streak = 0;
      reset();
    },
    applyRemoteMove: ({ i }) => {
      if (mode !== "net" || over || turn === myMark) return;
      if (i < 0 || i > 8 || board[i]) return;
      board[i] = turn;
      anim[i] = 0.001;
      beep(turn === "X" ? 540 : 330, 0.05);
      finish();
      if (!over) {
        turn = myMark;
        turnStatus();
      }
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    },
  };
};

export default tictactoe;
