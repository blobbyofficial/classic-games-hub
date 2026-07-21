import type { GameEngineFactory } from "@/types";
import { beep, palette, roundRect } from "../helpers";

/** 15-puzzle with buttery tile sliding. Tiles ease to their slots, solved tiles
 *  glow, and a win triggers a rainbow cascade. Tap a tile next to the gap, swipe,
 *  or use the arrow keys / D-pad. Mobile-first. */
const slide: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const N = 4;
  const size = Math.min(width, height) - 16;
  const ox = (width - size) / 2;
  const oy = (height - size) / 2;
  const cell = size / N;

  let tiles: number[] = []; // logical board, 0 = blank
  const anim = new Map<number, { x: number; y: number }>(); // value -> pixel pos
  let moves = 0;
  let elapsed = 0;
  let started = false;
  let solved = false;
  let winT = 0;
  let raf = 0;
  let last = performance.now();

  const slotXY = (i: number) => ({ x: ox + (i % N) * cell, y: oy + Math.floor(i / N) * cell });

  function isSolvable(arr: number[]) {
    let inv = 0;
    const flat = arr.filter((v) => v !== 0);
    for (let i = 0; i < flat.length; i++)
      for (let j = i + 1; j < flat.length; j++) if (flat[i] > flat[j]) inv++;
    const blankRow = Math.floor(arr.indexOf(0) / N);
    return (inv + (N - blankRow)) % 2 === 0;
  }

  function isSolved() {
    for (let i = 0; i < N * N - 1; i++) if (tiles[i] !== i + 1) return false;
    return tiles[N * N - 1] === 0;
  }

  function reset() {
    do {
      tiles = [...Array(N * N).keys()].sort(() => Math.random() - 0.5);
    } while (!isSolvable(tiles) || isSolved());
    anim.clear();
    tiles.forEach((v, i) => {
      if (v !== 0) anim.set(v, slotXY(i));
    });
    moves = 0;
    elapsed = 0;
    started = false;
    solved = false;
    winT = 0;
    onScore(0);
    onStatus?.("Slide 1–15 into order");
  }

  function move(i: number) {
    if (solved) return;
    const blank = tiles.indexOf(0);
    const br = Math.floor(blank / N);
    const bc = blank % N;
    const r = Math.floor(i / N);
    const c = i % N;
    const adjacent = (Math.abs(br - r) === 1 && bc === c) || (Math.abs(bc - c) === 1 && br === r);
    if (!adjacent) return;
    [tiles[blank], tiles[i]] = [tiles[i], tiles[blank]];
    moves++;
    started = true;
    beep(300 + Math.random() * 60, 0.03, "triangle", 0.05);
    if (isSolved()) {
      solved = true;
      const score = Math.max(100, 4000 - moves * 20 - Math.floor(elapsed) * 5);
      onScore(score);
      onStatus?.(`Solved in ${moves} moves · ${Math.floor(elapsed)}s 🎉`);
      onGameOver(score, Math.round(elapsed));
      beep(660, 0.08, "sine", 0.05);
      setTimeout(() => beep(880, 0.12, "sine", 0.05), 90);
    }
  }

  function slideDir(dr: number, dc: number) {
    const blank = tiles.indexOf(0);
    const r = Math.floor(blank / N) + dr;
    const c = (blank % N) + dc;
    if (r >= 0 && r < N && c >= 0 && c < N) move(r * N + c);
  }

  function render(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (started && !solved) elapsed += dt;
    if (solved) winT = Math.min(1, winT + dt);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);

    // tray
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    roundRect(ctx, ox - 6, oy - 6, size + 12, size + 12, 16);
    ctx.fill();

    const correct = (v: number, i: number) => v === i + 1;

    tiles.forEach((v, i) => {
      if (v === 0) return;
      const target = slotXY(i);
      const cur = anim.get(v)!;
      cur.x += (target.x - cur.x) * Math.min(1, dt * 18);
      cur.y += (target.y - cur.y) * Math.min(1, dt * 18);

      const x = cur.x + 4;
      const y = cur.y + 4;
      const w = cell - 8;
      const good = correct(v, i);
      const wave = solved ? 0.5 + 0.5 * Math.sin(winT * 6 - (i % N) - Math.floor(i / N)) : 0;

      const grad = ctx.createLinearGradient(x, y, x, y + w);
      if (solved) {
        const hue = (200 + i * 22 + winT * 120) % 360;
        grad.addColorStop(0, `hsl(${hue} 80% 62%)`);
        grad.addColorStop(1, `hsl(${(hue + 30) % 360} 75% 46%)`);
      } else if (good) {
        grad.addColorStop(0, "#34d399");
        grad.addColorStop(1, "#059669");
      } else {
        grad.addColorStop(0, "#a78bfa");
        grad.addColorStop(1, "#7c3aed");
      }
      ctx.fillStyle = grad;
      if (good && !solved) {
        ctx.shadowColor = "#34d399";
        ctx.shadowBlur = 12;
      } else if (solved) {
        ctx.shadowColor = `hsl(${(200 + i * 22) % 360} 80% 60%)`;
        ctx.shadowBlur = 10 + wave * 12;
      }
      roundRect(ctx, x, y, w, w, 12);
      ctx.fill();
      ctx.shadowBlur = 0;

      // top sheen
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      roundRect(ctx, x + 3, y + 3, w - 6, w * 0.36, 10);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = `bold ${cell * 0.34}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(v), x + w / 2, y + w / 2);
    });

    // HUD
    ctx.fillStyle = pal.muted;
    ctx.font = "600 14px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${moves} moves`, ox, oy - 14);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(elapsed)}s`, ox + size, oy - 14);

    raf = requestAnimationFrame(render);
  }

  // swipe support (games without dpad get swipe; slide has both)
  let sx0 = 0;
  let sy0 = 0;
  const onDown = (e: PointerEvent) => {
    sx0 = e.clientX;
    sy0 = e.clientY;
    if (solved) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width - ox;
    const my = ((e.clientY - rect.top) / rect.height) * height - oy;
    if (mx < 0 || my < 0 || mx > size || my > size) return;
    move(Math.floor(my / cell) * N + Math.floor(mx / cell));
  };
  const onUp = (e: PointerEvent) => {
    if (solved) {
      reset();
      return;
    }
    const dx = e.clientX - sx0;
    const dy = e.clientY - sy0;
    if (Math.hypot(dx, dy) < 24) return; // treated as a tap above
    if (Math.abs(dx) > Math.abs(dy)) slideDir(0, dx > 0 ? -1 : 1);
    else slideDir(dy > 0 ? -1 : 1, 0);
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
  canvas.addEventListener("pointerup", onUp);
  window.addEventListener("keydown", onKey);
  reset();
  raf = requestAnimationFrame(render);

  return {
    pause: () => cancelAnimationFrame(raf),
    resume: () => {
      last = performance.now();
      raf = requestAnimationFrame(render);
    },
    restart: () => reset(),
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    },
  };
};

export default slide;
