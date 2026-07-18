import type { GameEngineFactory } from "@/types";
import { beep, palette } from "../helpers";

const COLS = 7;
const ROWS = 6;

const connect4: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const size = Math.min(width / COLS, height / (ROWS + 1));
  const boardW = size * COLS;
  const boardH = size * ROWS;
  const ox = (width - boardW) / 2;
  const oy = (height - boardH) / 2 + size * 0.4;
  let board: (0 | 1 | 2)[][] = [];
  let wins = 0;
  let over = false;
  let busy = false;
  let hoverCol = 3;
  let raf = 0;

  function reset() {
    board = Array.from({ length: ROWS }, () => Array<0 | 1 | 2>(COLS).fill(0));
    over = false;
    busy = false;
    onScore(wins);
    onStatus?.("You are red — drop a disc");
  }

  function drop(col: number, player: 1 | 2): number {
    for (let r = ROWS - 1; r >= 0; r--)
      if (board[r][col] === 0) {
        board[r][col] = player;
        return r;
      }
    return -1;
  }

  function checkWin(p: 1 | 2): boolean {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] !== p) continue;
        for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          let k = 1;
          while (k < 4) {
            const nr = r + dr * k;
            const nc = c + dc * k;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== p) break;
            k++;
          }
          if (k === 4) return true;
        }
      }
    return false;
  }

  function full() {
    return board[0].every((v) => v !== 0);
  }

  function aiMove() {
    busy = true;
    setTimeout(() => {
      let col = pickAi();
      const r = drop(col, 2);
      beep(300, 0.06);
      if (r < 0) col = board[0].findIndex((v) => v === 0);
      busy = false;
      if (checkWin(2)) end("AI wins — tap to retry", false);
      else if (full()) end("Draw — tap to retry", false, true);
    }, 350);
  }

  function pickAi(): number {
    // win if possible, else block, else center-biased
    for (const p of [2, 1] as const)
      for (let c = 0; c < COLS; c++) {
        const r = firstFree(c);
        if (r < 0) continue;
        board[r][c] = p;
        const won = checkWin(p);
        board[r][c] = 0;
        if (won) return c;
      }
    const order = [3, 2, 4, 1, 5, 0, 6];
    return order.find((c) => firstFree(c) >= 0) ?? 0;
  }

  function firstFree(col: number): number {
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === 0) return r;
    return -1;
  }

  function end(msg: string, playerWon: boolean, draw = false) {
    over = true;
    if (playerWon) {
      wins++;
      onScore(wins * 100);
    }
    onStatus?.(msg);
    onGameOver(wins * 100 + (draw ? 20 : 0), wins);
  }

  function play(col: number) {
    if (over) {
      reset();
      return;
    }
    if (busy || firstFree(col) < 0) return;
    drop(col, 1);
    beep(520, 0.06);
    if (checkWin(1)) return end("You win! 🎉", true);
    if (full()) return end("Draw — tap to retry", false, true);
    aiMove();
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    // hover disc
    if (!over) {
      ctx.fillStyle = "#ef4444";
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(ox + hoverCol * size + size / 2, oy - size * 0.5, size * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // board
    ctx.fillStyle = "#1e40af";
    ctx.beginPath();
    ctx.roundRect(ox - 4, oy - 4, boardW + 8, boardH + 8, 12);
    ctx.fill();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cx = ox + c * size + size / 2;
        const cy = oy + r * size + size / 2;
        const v = board[r][c];
        ctx.fillStyle = v === 1 ? "#ef4444" : v === 2 ? "#fbbf24" : "#0f172a";
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
    raf = requestAnimationFrame(render);
  }

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    hoverCol = Math.max(0, Math.min(COLS - 1, Math.floor(mx / size)));
  };
  const onDown = (e: PointerEvent) => {
    onMove(e);
    play(hoverCol);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key >= "1" && e.key <= "7") play(Number(e.key) - 1);
    else if (e.key === "ArrowLeft") hoverCol = Math.max(0, hoverCol - 1);
    else if (e.key === "ArrowRight") hoverCol = Math.min(COLS - 1, hoverCol + 1);
    else if (e.key === " ") play(hoverCol);
    else if (e.key.toLowerCase() === "r" && over) reset();
  };

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
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
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    },
  };
};

export default connect4;
