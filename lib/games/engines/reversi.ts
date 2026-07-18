import type { GameEngineFactory } from "@/types";
import { beep, palette } from "../helpers";

const N = 8;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

const reversi: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const size = Math.min(width, height);
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / N;
  let board: (0 | 1 | 2)[][] = []; // 1 = player (black), 2 = ai (white)
  let over = false;
  let busy = false;
  let raf = 0;

  function reset() {
    board = Array.from({ length: N }, () => Array<0 | 1 | 2>(N).fill(0));
    board[3][3] = board[4][4] = 2;
    board[3][4] = board[4][3] = 1;
    over = false;
    busy = false;
    updateScore();
    onStatus?.("You are black");
  }

  function flips(b: (0 | 1 | 2)[][], r: number, c: number, p: 1 | 2): [number, number][] {
    if (b[r][c] !== 0) return [];
    const opp = p === 1 ? 2 : 1;
    const out: [number, number][] = [];
    for (const [dr, dc] of DIRS) {
      const line: [number, number][] = [];
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < N && nc >= 0 && nc < N && b[nr][nc] === opp) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (line.length && nr >= 0 && nr < N && nc >= 0 && nc < N && b[nr][nc] === p) out.push(...line);
    }
    return out;
  }

  function validMoves(b: (0 | 1 | 2)[][], p: 1 | 2): [number, number][] {
    const moves: [number, number][] = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (flips(b, r, c, p).length) moves.push([r, c]);
    return moves;
  }

  function apply(r: number, c: number, p: 1 | 2) {
    const f = flips(board, r, c, p);
    if (!f.length) return false;
    board[r][c] = p;
    f.forEach(([fr, fc]) => (board[fr][fc] = p));
    return true;
  }

  function counts() {
    let a = 0;
    let b = 0;
    board.forEach((row) => row.forEach((v) => (v === 1 ? a++ : v === 2 ? b++ : 0)));
    return { black: a, white: b };
  }

  function updateScore() {
    onScore(counts().black * 10);
  }

  function endGame() {
    over = true;
    const { black, white } = counts();
    const msg = black > white ? "You win! 🎉" : black < white ? "AI wins" : "Draw";
    onStatus?.(`${msg} — ${black}:${white}`);
    onGameOver(black > white ? 500 + black * 10 : black * 10, 0);
  }

  function nextTurn(justMoved: 1 | 2) {
    updateScore();
    const other = justMoved === 1 ? 2 : 1;
    if (validMoves(board, other).length) {
      if (other === 2) aiTurn();
    } else if (validMoves(board, justMoved).length) {
      if (justMoved === 2) aiTurn();
      else onStatus?.("AI has no moves — your turn again");
    } else {
      endGame();
    }
  }

  function aiTurn() {
    busy = true;
    setTimeout(() => {
      const moves = validMoves(board, 2);
      if (moves.length) {
        // greedy: maximize flips, prefer corners
        let best = moves[0];
        let bestScore = -1;
        for (const [r, c] of moves) {
          let s = flips(board, r, c, 2).length;
          if ((r === 0 || r === N - 1) && (c === 0 || c === N - 1)) s += 10;
          if (s > bestScore) {
            bestScore = s;
            best = [r, c];
          }
        }
        apply(best[0], best[1], 2);
        beep(300, 0.05);
      }
      busy = false;
      nextTurn(2);
    }, 400);
  }

  function play(r: number, c: number) {
    if (over) {
      reset();
      return;
    }
    if (busy || !apply(r, c, 1)) return;
    beep(520, 0.05);
    nextTurn(1);
  }

  function render() {
    ctx.fillStyle = "#065f46";
    ctx.fillRect(ox, oy, size, size);
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    for (let i = 0; i <= N; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * cell, oy);
      ctx.lineTo(ox + i * cell, oy + size);
      ctx.moveTo(ox, oy + i * cell);
      ctx.lineTo(ox + size, oy + i * cell);
      ctx.stroke();
    }
    const valid = over || busy ? [] : validMoves(board, 1);
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const cx = ox + c * cell + cell / 2;
        const cy = oy + r * cell + cell / 2;
        if (board[r][c]) {
          ctx.fillStyle = board[r][c] === 1 ? "#0f172a" : "#f8fafc";
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (valid.some(([vr, vc]) => vr === r && vc === c)) {
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    raf = requestAnimationFrame(render);
  }

  const onDown = (e: PointerEvent) => {
    if (over) {
      reset();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return;
    play(Math.floor(my / cell), Math.floor(mx / cell));
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

export default reversi;
