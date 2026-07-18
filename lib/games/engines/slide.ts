import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

const slide: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const N = 4;
  const size = Math.min(width, height);
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / N;
  let tiles: number[] = []; // 0 = blank
  let moves = 0;
  let solved = false;
  let raf = 0;

  function isSolvable(arr: number[]) {
    let inv = 0;
    const flat = arr.filter((v) => v !== 0);
    for (let i = 0; i < flat.length; i++)
      for (let j = i + 1; j < flat.length; j++) if (flat[i] > flat[j]) inv++;
    const blankRow = Math.floor(arr.indexOf(0) / N);
    return (inv + (N - blankRow)) % 2 === 0;
  }

  function reset() {
    do {
      tiles = [...Array(N * N).keys()].sort(() => Math.random() - 0.5);
    } while (!isSolvable(tiles) || isSolved());
    moves = 0;
    solved = false;
    onScore(0);
    onStatus?.("Arrange 1–15 in order");
  }

  function isSolved() {
    for (let i = 0; i < N * N - 1; i++) if (tiles[i] !== i + 1) return false;
    return tiles[N * N - 1] === 0;
  }

  function move(i: number) {
    if (solved) return;
    const blank = tiles.indexOf(0);
    const br = Math.floor(blank / N);
    const bc = blank % N;
    const r = Math.floor(i / N);
    const c = i % N;
    if ((Math.abs(br - r) === 1 && bc === c) || (Math.abs(bc - c) === 1 && br === r)) {
      [tiles[blank], tiles[i]] = [tiles[i], tiles[blank]];
      moves++;
      beep(400, 0.03);
      if (isSolved()) {
        solved = true;
        const score = Math.max(100, 3000 - moves * 20);
        onScore(score);
        onStatus?.(`Solved in ${moves} moves!`);
        onGameOver(score, moves);
      }
    }
  }

  function slideDir(dr: number, dc: number) {
    const blank = tiles.indexOf(0);
    const r = Math.floor(blank / N) + dr;
    const c = (blank % N) + dc;
    if (r >= 0 && r < N && c >= 0 && c < N) move(r * N + c);
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    roundRect(ctx, ox, oy, size, size, 10);
    ctx.fill();
    tiles.forEach((v, i) => {
      if (v === 0) return;
      const x = ox + (i % N) * cell + 4;
      const y = oy + Math.floor(i / N) * cell + 4;
      ctx.fillStyle = solved ? pal.green : pal.primary;
      roundRect(ctx, x, y, cell - 8, cell - 8, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${cell * 0.36}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(v), x + (cell - 8) / 2, y + (cell - 8) / 2);
    });
    raf = requestAnimationFrame(render);
  }

  const onDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return;
    move(Math.floor(my / cell) * N + Math.floor(mx / cell));
  };
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") slideDir(1, 0);
    else if (k === "arrowdown" || k === "s") slideDir(-1, 0);
    else if (k === "arrowleft" || k === "a") slideDir(0, 1);
    else if (k === "arrowright" || k === "d") slideDir(0, -1);
    else if (k === "r") reset();
    else return;
    e.preventDefault();
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

export default slide;
