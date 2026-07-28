import type { GameEngineFactory } from "@/types";
import { beep, palette } from "../helpers";

const N = 8;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
// positional weights — corners are gold, the squares next to them are traps.
const WEIGHTS = [
  [120, -20, 20, 5, 5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20, 5, 5, 20, -20, 120],
];

type Owner = 0 | 1 | 2; // 1 = player (dark), 2 = ai (light)

/** Reversi / Othello with animated disc flips, a positional alpha-beta AI, live
 *  score bars, valid-move hints and a hover ghost — or online head-to-head
 *  inside a party (v1.5). Mobile-first, tap to place. */
const reversi: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus, net }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const size = Math.min(width, height) - 8;
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / N;

  let board: Owner[][] = [];
  // animation layer: rendered owner + flip progress (0..1) + placement pop
  let anim: { from: Owner; to: Owner; t: number; pop: number }[][] = [];
  let over = false;
  let busy = false;
  let hoverR = -1;
  let hoverC = -1;
  let lastMove: [number, number] | null = null;
  let raf = 0;
  let last = performance.now();

  // Online: seat 1 plays dark and moves first (as the local player does
  // offline), seat 2 plays light in the AI's place.
  const isNet = Boolean(net);
  const me: 1 | 2 = net?.seat === 2 ? 2 : 1;
  const foe: 1 | 2 = me === 1 ? 2 : 1;
  let turn: 1 | 2 = 1;

  function reset() {
    board = Array.from({ length: N }, () => Array<Owner>(N).fill(0));
    anim = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ from: 0 as Owner, to: 0 as Owner, t: 1, pop: 1 })));
    board[3][3] = board[4][4] = 2;
    board[3][4] = board[4][3] = 1;
    [[3, 3], [4, 4], [3, 4], [4, 3]].forEach(([r, c]) => (anim[r][c] = { from: board[r][c], to: board[r][c], t: 1, pop: 1 }));
    over = false;
    busy = false;
    lastMove = null;
    turn = 1;
    updateScore();
    if (isNet) {
      onStatus?.(
        `You are ${me === 1 ? "dark" : "light"} — ${turn === me ? "tap a highlighted square" : `${net!.opponentName} starts`}`,
      );
      return;
    }
    onStatus?.("You are dark — tap a highlighted square");
  }

  function flips(b: Owner[][], r: number, c: number, p: 1 | 2): [number, number][] {
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

  function validMoves(b: Owner[][], p: 1 | 2): [number, number][] {
    const moves: [number, number][] = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (flips(b, r, c, p).length) moves.push([r, c]);
    return moves;
  }

  function applyAnimated(r: number, c: number, p: 1 | 2) {
    const f = flips(board, r, c, p);
    if (!f.length) return false;
    board[r][c] = p;
    anim[r][c] = { from: p, to: p, t: 0, pop: 0 }; // pop-in
    f.forEach(([fr, fc], i) => {
      const prev = board[fr][fc];
      board[fr][fc] = p;
      // stagger flips outward for a cascade feel
      setTimeout(() => (anim[fr][fc] = { from: prev, to: p, t: 0, pop: 1 }), i * 45);
    });
    lastMove = [r, c];
    return true;
  }

  // simulate without animation for the AI search
  function applyPlain(b: Owner[][], r: number, c: number, p: 1 | 2): Owner[][] {
    const nb = b.map((row) => [...row]);
    nb[r][c] = p;
    for (const [dr, dc] of DIRS) {
      const line: [number, number][] = [];
      let nr = r + dr;
      let nc = c + dc;
      const opp = p === 1 ? 2 : 1;
      while (nr >= 0 && nr < N && nc >= 0 && nc < N && nb[nr][nc] === opp) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (line.length && nr >= 0 && nr < N && nc >= 0 && nc < N && nb[nr][nc] === p) line.forEach(([lr, lc]) => (nb[lr][lc] = p));
    }
    return nb;
  }

  function evaluate(b: Owner[][]): number {
    let pos = 0;
    let disc = 0;
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        if (b[r][c] === 2) {
          pos += WEIGHTS[r][c];
          disc++;
        } else if (b[r][c] === 1) {
          pos -= WEIGHTS[r][c];
          disc--;
        }
      }
    const mob = validMoves(b, 2).length - validMoves(b, 1).length;
    return pos + mob * 8 + disc; // positional + mobility, slight material bias
  }

  function search(b: Owner[][], p: 1 | 2, depth: number, alpha: number, beta: number): number {
    if (depth === 0) return evaluate(b);
    const moves = validMoves(b, p);
    if (!moves.length) {
      const other = p === 1 ? 2 : 1;
      if (!validMoves(b, other).length) return evaluate(b) + (evaluate(b) > 0 ? 1000 : -1000);
      return search(b, other, depth - 1, alpha, beta);
    }
    if (p === 2) {
      let val = -Infinity;
      for (const [r, c] of moves) {
        val = Math.max(val, search(applyPlain(b, r, c, 2), 1, depth - 1, alpha, beta));
        alpha = Math.max(alpha, val);
        if (alpha >= beta) break;
      }
      return val;
    }
    let val = Infinity;
    for (const [r, c] of moves) {
      val = Math.min(val, search(applyPlain(b, r, c, 1), 2, depth - 1, alpha, beta));
      beta = Math.min(beta, val);
      if (alpha >= beta) break;
    }
    return val;
  }

  function counts() {
    let a = 0;
    let b = 0;
    board.forEach((row) => row.forEach((v) => (v === 1 ? a++ : v === 2 ? b++ : 0)));
    return { dark: a, light: b };
  }

  function updateScore() {
    const { dark, light } = counts();
    onScore((me === 2 ? light : dark) * 10);
  }

  function endGame() {
    over = true;
    const { dark, light } = counts();

    if (isNet) {
      const mine = me === 1 ? dark : light;
      const theirs = me === 1 ? light : dark;
      const msg = mine > theirs ? "You win! 🎉" : mine < theirs ? `${net!.opponentName} wins` : "Draw";
      onStatus?.(`${msg} — ${mine}:${theirs}`);
      net!.onResult(mine > theirs ? "win" : mine < theirs ? "loss" : "draw");
      onGameOver(mine > theirs ? 500 + mine * 10 : mine * 10, 0);
      if (mine > theirs) {
        beep(660, 0.08, "sine", 0.05);
        setTimeout(() => beep(880, 0.12, "sine", 0.05), 90);
      } else beep(160, 0.25, "sawtooth", 0.05);
      return;
    }

    const msg = dark > light ? "You win! 🎉" : dark < light ? "AI wins" : "Draw";
    onStatus?.(`${msg} — ${dark}:${light} · tap to replay`);
    onGameOver(dark > light ? 500 + dark * 10 : dark * 10, 0);
    if (dark > light) {
      beep(660, 0.08, "sine", 0.05);
      setTimeout(() => beep(880, 0.12, "sine", 0.05), 90);
    } else beep(160, 0.25, "sawtooth", 0.05);
  }

  function nextTurn(justMoved: 1 | 2) {
    updateScore();
    const other = justMoved === 1 ? 2 : 1;

    if (isNet) {
      // Same pass rules as offline, but nobody is asked to think for the
      // opponent: the turn simply sits with whoever has a legal move.
      if (validMoves(board, other).length) {
        turn = other;
        onStatus?.(turn === me ? "Your move" : `${net!.opponentName}'s move`);
      } else if (validMoves(board, justMoved).length) {
        turn = justMoved;
        onStatus?.(
          turn === me ? `${net!.opponentName} passes — your move again` : `You pass — ${net!.opponentName} moves again`,
        );
      } else {
        endGame();
      }
      return;
    }

    if (validMoves(board, other).length) {
      if (other === 2) aiTurn();
      else onStatus?.("Your move");
    } else if (validMoves(board, justMoved).length) {
      if (justMoved === 2) aiTurn();
      else onStatus?.("AI passes — your move again");
    } else {
      endGame();
    }
  }

  function aiTurn() {
    busy = true;
    onStatus?.("AI thinking…");
    setTimeout(() => {
      const moves = validMoves(board, 2);
      if (moves.length) {
        const empties = board.flat().filter((v) => v === 0).length;
        const depth = empties <= 10 ? 6 : 4; // read to the end in the endgame
        let best = moves[0];
        let bestVal = -Infinity;
        for (const [r, c] of moves) {
          const val = search(applyPlain(board, r, c, 2), 1, depth - 1, -Infinity, Infinity);
          if (val > bestVal) {
            bestVal = val;
            best = [r, c];
          }
        }
        applyAnimated(best[0], best[1], 2);
        beep(300, 0.05, "triangle", 0.05);
      }
      busy = false;
      setTimeout(() => nextTurn(2), 320);
    }, 340);
  }

  function play(r: number, c: number) {
    if (isNet) {
      // No tap-to-restart online: rematches are the party leader's call.
      if (over || turn !== me || !applyAnimated(r, c, me)) return;
      beep(520, 0.05, "sine", 0.05);
      net!.send({ i: r * N + c });
      nextTurn(me);
      return;
    }
    if (over) {
      reset();
      return;
    }
    if (busy || !applyAnimated(r, c, 1)) return;
    beep(520, 0.05, "sine", 0.05);
    nextTurn(1);
  }

  function render(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const a = anim[r][c];
        if (a.t < 1) a.t = Math.min(1, a.t + dt * 5);
        if (a.pop < 1) a.pop = Math.min(1, a.pop + dt * 6);
      }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);

    // felt board
    const g = ctx.createLinearGradient(ox, oy, ox, oy + size);
    g.addColorStop(0, "#0f766e");
    g.addColorStop(1, "#065f46");
    ctx.fillStyle = g;
    ctx.fillRect(ox, oy, size, size);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= N; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * cell, oy);
      ctx.lineTo(ox + i * cell, oy + size);
      ctx.moveTo(ox, oy + i * cell);
      ctx.lineTo(ox + size, oy + i * cell);
      ctx.stroke();
    }

    const valid = over || busy || (isNet && turn !== me) ? [] : validMoves(board, me);
    const pulse = 0.5 + 0.5 * Math.sin(now / 300);

    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const cx = ox + c * cell + cell / 2;
        const cy = oy + r * cell + cell / 2;
        const a = anim[r][c];
        if (board[r][c] !== 0) {
          // flip: color switches at the midpoint, scaleX pinches to 0
          const flipping = a.t < 1 && a.from !== a.to;
          const shownOwner: Owner = flipping ? (a.t < 0.5 ? a.from : a.to) : board[r][c];
          const scaleX = flipping ? Math.abs(Math.cos(a.t * Math.PI)) : 1;
          const pop = a.from === a.to ? a.pop : 1; // pop only for freshly placed
          const rad = cell * 0.4 * (0.4 + 0.6 * pop);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(Math.max(0.05, scaleX), 1);
          const dg = ctx.createRadialGradient(-rad * 0.3, -rad * 0.3, rad * 0.15, 0, 0, rad);
          if (shownOwner === 1) {
            dg.addColorStop(0, "#475569");
            dg.addColorStop(1, "#0f172a");
          } else {
            dg.addColorStop(0, "#ffffff");
            dg.addColorStop(1, "#cbd5e1");
          }
          ctx.fillStyle = dg;
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (lastMove && lastMove[0] === r && lastMove[1] === c && !flipping) {
            ctx.strokeStyle = pal.gold;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, rad + 3, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (valid.some(([vr, vc]) => vr === r && vc === c)) {
          const hovered = hoverR === r && hoverC === c;
          ctx.fillStyle = hovered ? "rgba(255,255,255,0.4)" : `rgba(255,255,255,${0.1 + pulse * 0.12})`;
          ctx.beginPath();
          ctx.arc(cx, cy, cell * (hovered ? 0.36 : 0.14), 0, Math.PI * 2);
          ctx.fill();
        }
      }

    // score bar under the board
    const { dark, light } = counts();
    const total = dark + light || 1;
    const barY = oy + size + 8;
    const barH = 8;
    if (barY + barH < height) {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(ox, barY, (size * dark) / total, barH);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(ox + (size * dark) / total, barY, (size * light) / total, barH);
      ctx.fillStyle = pal.fg;
      ctx.font = "600 12px system-ui";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(`● ${dark}`, ox, barY + barH + 3);
      ctx.textAlign = "right";
      ctx.fillText(`${light} ○`, ox + size, barY + barH + 3);
    }

    raf = requestAnimationFrame(render);
  }

  function cellAt(e: PointerEvent): [number, number] | null {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return null;
    return [Math.floor(my / cell), Math.floor(mx / cell)];
  }

  const onDown = (e: PointerEvent) => {
    const pos = cellAt(e);
    if (!pos) {
      if (over && !isNet) reset();
      return;
    }
    play(pos[0], pos[1]);
  };
  const onMove = (e: PointerEvent) => {
    const pos = cellAt(e);
    if (pos) [hoverR, hoverC] = pos;
    else hoverR = hoverC = -1;
  };
  const onLeave = () => {
    hoverR = hoverC = -1;
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
    restart: () => reset(),
    applyRemoteMove: ({ i }) => {
      if (!isNet || over || turn !== foe) return;
      const r = Math.floor(i / N);
      const c = i % N;
      if (r < 0 || r >= N || c < 0 || c >= N || !applyAnimated(r, c, foe)) return;
      beep(300, 0.05, "triangle", 0.05);
      nextTurn(foe);
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    },
  };
};

export default reversi;
