import type { GameEngineFactory } from "@/types";
import { beep, palette } from "../helpers";

const COLS = 7;
const ROWS = 6;
const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

type Cell = 0 | 1 | 2; // 0 empty, 1 player(red), 2 ai(yellow)

/** Connect Four with gravity-drop animation, an animated win highlight, a hover
 *  ghost disc and an alpha-beta minimax AI. Mobile-first (tap a column). */
const connect4: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const cell = Math.min(width / COLS, height / (ROWS + 1));
  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const ox = (width - boardW) / 2;
  const oy = (height - boardH) / 2 + cell * 0.45;
  const rad = cell * 0.4;

  let board: Cell[][] = [];
  let wins = 0;
  let over = false;
  let busy = false;
  let hoverCol = 3;
  let winCells: [number, number][] | null = null;
  let winPulse = 0;
  let falling: { col: number; row: number; player: 1 | 2; y: number; vy: number } | null = null;
  let raf = 0;
  let last = performance.now();

  const RED = "#f87171";
  const YELLOW = pal.gold;

  function reset() {
    board = Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
    over = false;
    busy = false;
    falling = null;
    winCells = null;
    winPulse = 0;
    onScore(wins * 100);
    onStatus?.("You are red — tap a column");
  }

  function landingRow(b: Cell[][], col: number): number {
    for (let r = ROWS - 1; r >= 0; r--) if (b[r][col] === 0) return r;
    return -1;
  }

  function winningCells(b: Cell[][], p: 1 | 2): [number, number][] | null {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] !== p) continue;
        for (const [dr, dc] of DIRS) {
          const line: [number, number][] = [[r, c]];
          for (let k = 1; k < 4; k++) {
            const nr = r + dr * k;
            const nc = c + dc * k;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== p) break;
            line.push([nr, nc]);
          }
          if (line.length === 4) return line;
        }
      }
    return null;
  }

  function isFull(b: Cell[][]): boolean {
    return b[0].every((v) => v !== 0);
  }

  // Heuristic: score all 4-length windows from the AI's perspective (player 2).
  function evaluate(b: Cell[][]): number {
    const windowScore = (cells: Cell[]) => {
      const ai = cells.filter((v) => v === 2).length;
      const me = cells.filter((v) => v === 1).length;
      if (ai > 0 && me > 0) return 0;
      if (ai === 3) return 50;
      if (ai === 2) return 10;
      if (me === 3) return -80;
      if (me === 2) return -10;
      return 0;
    };
    let score = 0;
    for (let r = 0; r < ROWS; r++) score += b[r][3] === 2 ? 6 : b[r][3] === 1 ? -6 : 0; // centre bias
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        for (const [dr, dc] of DIRS) {
          if (r + dr * 3 < 0 || r + dr * 3 >= ROWS || c + dc * 3 < 0 || c + dc * 3 >= COLS) continue;
          score += windowScore([0, 1, 2, 3].map((k) => b[r + dr * k][c + dc * k]));
        }
    return score;
  }

  function place(b: Cell[][], col: number, p: 1 | 2): Cell[][] {
    const nb = b.map((row) => [...row]);
    nb[landingRow(nb, col)][col] = p;
    return nb;
  }

  function minimax(b: Cell[][], depth: number, alpha: number, beta: number, maxing: boolean): number {
    if (winningCells(b, 2)) return 100000 + depth;
    if (winningCells(b, 1)) return -100000 - depth;
    if (depth === 0 || isFull(b)) return evaluate(b);
    const cols = [3, 2, 4, 1, 5, 0, 6].filter((c) => landingRow(b, c) >= 0);
    if (maxing) {
      let val = -Infinity;
      for (const c of cols) {
        val = Math.max(val, minimax(place(b, c, 2), depth - 1, alpha, beta, false));
        alpha = Math.max(alpha, val);
        if (alpha >= beta) break;
      }
      return val;
    }
    let val = Infinity;
    for (const c of cols) {
      val = Math.min(val, minimax(place(b, c, 1), depth - 1, alpha, beta, true));
      beta = Math.min(beta, val);
      if (alpha >= beta) break;
    }
    return val;
  }

  function bestAiCol(): number {
    const cols = [3, 2, 4, 1, 5, 0, 6].filter((c) => landingRow(board, c) >= 0);
    let bestCol = cols[0];
    let bestVal = -Infinity;
    for (const c of cols) {
      const val = minimax(place(board, c, 2), 5, -Infinity, Infinity, false);
      if (val > bestVal) {
        bestVal = val;
        bestCol = c;
      }
    }
    return bestCol;
  }

  function startDrop(col: number, player: 1 | 2) {
    const row = landingRow(board, col);
    if (row < 0) return;
    busy = true;
    falling = { col, row, player, y: oy - cell, vy: 0 };
    beep(player === 1 ? 520 : 360, 0.04);
  }

  function land() {
    if (!falling) return;
    const { col, row, player } = falling;
    board[row][col] = player;
    falling = null;
    const w = winningCells(board, player);
    if (w) {
      winCells = w;
      over = true;
      if (player === 1) {
        wins++;
        onScore(wins * 100);
        onStatus?.(`Four in a row! Streak ${wins} 🎉`);
        onGameOver(wins * 100, wins);
        beep(660, 0.08);
        setTimeout(() => beep(880, 0.12), 90);
      } else {
        wins = 0;
        onStatus?.("AI got four — tap to retry");
        onGameOver(0, 0);
        beep(150, 0.25, "sawtooth");
      }
      return;
    }
    if (isFull(board)) {
      over = true;
      onStatus?.("Board full — draw. Tap to retry");
      onGameOver(20, 0);
      return;
    }
    if (player === 1) {
      setTimeout(() => startDrop(bestAiCol(), 2), 250);
    } else {
      busy = false;
    }
  }

  function discCenter(r: number, c: number) {
    return { x: ox + c * cell + cell / 2, y: oy + r * cell + cell / 2 };
  }

  function roundRectPath(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function render(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (falling) {
      falling.vy += 2600 * dt;
      falling.y += falling.vy * dt;
      const targetY = oy + falling.row * cell + cell / 2;
      if (falling.y >= targetY) {
        falling.y = targetY;
        land();
      }
    }
    if (winCells) winPulse = (winPulse + dt * 3) % (Math.PI * 2);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);

    if (!over && !busy && landingRow(board, hoverCol) >= 0) {
      const cx = ox + hoverCol * cell + cell / 2;
      ctx.fillStyle = "rgba(248,113,113,0.35)";
      ctx.beginPath();
      ctx.arc(cx, oy - cell / 2, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#3730a3";
    roundRectPath(ox - 6, oy - 6, boardW + 12, boardH + 12, 16);
    ctx.fill();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const { x, y } = discCenter(r, c);
        const v = board[r][c];
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fillStyle = v === 0 ? pal.bg : v === 1 ? RED : YELLOW;
        ctx.fill();
        if (winCells?.some(([wr, wc]) => wr === r && wc === c)) {
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(winPulse);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

    if (falling) {
      const cx = ox + falling.col * cell + cell / 2;
      ctx.beginPath();
      ctx.arc(cx, falling.y, rad, 0, Math.PI * 2);
      ctx.fillStyle = falling.player === 1 ? RED : YELLOW;
      ctx.fill();
    }

    raf = requestAnimationFrame(render);
  }

  function colAt(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    return Math.max(0, Math.min(COLS - 1, Math.floor(mx / cell)));
  }

  const onDown = (e: PointerEvent) => {
    if (over) return reset();
    if (busy) return;
    startDrop(colAt(e), 1);
  };
  const onMove = (e: PointerEvent) => {
    hoverCol = colAt(e);
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  reset();
  raf = requestAnimationFrame(render);

  return {
    pause: () => cancelAnimationFrame(raf),
    resume: () => {
      last = performance.now();
      raf = requestAnimationFrame(render);
    },
    restart: () => {
      wins = 0;
      reset();
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
    },
  };
};

export default connect4;
