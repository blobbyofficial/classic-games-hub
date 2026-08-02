import type { GameEngineFactory } from "@/types";
import { beep } from "../helpers";
import { renderScene, quad, type Camera, type Face, type Rgb } from "../engine3d";

/**
 * Labyrinth: a first-person maze, and the arcade's first true-3D title.
 *
 * Turbo Horizon faked depth with scanline scaling and Cube rendered a solid
 * object from outside. This is the first engine with the camera *inside* the
 * scene: free look, real wall geometry, lighting fixed to the world and fog
 * doing the depth cueing. All of that lives in lib/games/engine3d.ts so the
 * next 3D title starts from a renderer rather than from trigonometry.
 *
 * Three mazes of rising size make a run. There is no fail state - a maze you
 * cannot lose is still tense when you cannot see round the corner.
 */

const CELL = 2;
const WALL_H = 2;
const EYE = 1.05;
const RADIUS = 0.38;
const SIZES = [6, 8, 10];

const FOG: Rgb = [0.043, 0.039, 0.071]; // matches the near-black card background
const WALL_A: Rgb = [0.42, 0.33, 0.72];
const WALL_B: Rgb = [0.32, 0.26, 0.6];
const FLOOR_A: Rgb = [0.13, 0.12, 0.2];
const FLOOR_B: Rgb = [0.1, 0.09, 0.16];
const EXIT_C: Rgb = [0.2, 0.95, 0.75];

const maze3d: GameEngineFactory = ({
  canvas,
  width,
  height,
  onScore,
  onGameOver,
  onStatus,
  reducedMotion,
}) => {
  const ctx = canvas.getContext("2d")!;

  let level = 0;
  let grid = SIZES[0];
  /** Wall on the north edge of cell (x, y). Rows 0..grid inclusive. */
  let hWalls: boolean[][] = [];
  /** Wall on the west edge of cell (x, y). Columns 0..grid inclusive. */
  let vWalls: boolean[][] = [];
  let visited: boolean[][] = [];
  let faces: Face[] = [];
  let exitX = 0;
  let exitZ = 0;

  const cam: Camera = { x: 0, y: EYE, z: 0, yaw: 0, pitch: 0, fov: 1.35 };
  let total = 0;
  let elapsed = 0;
  let running = false;
  let done = false;
  let bob = 0;

  const keys = new Set<string>();
  let raf = 0;
  let last = performance.now();

  function carve() {
    hWalls = Array.from({ length: grid + 1 }, () => Array<boolean>(grid).fill(true));
    vWalls = Array.from({ length: grid }, () => Array<boolean>(grid + 1).fill(true));
    visited = Array.from({ length: grid }, () => Array<boolean>(grid).fill(false));

    // Recursive backtracker, iterative so a big maze cannot blow the stack.
    const seen = Array.from({ length: grid }, () => Array<boolean>(grid).fill(false));
    const stack: [number, number][] = [[0, 0]];
    seen[0][0] = true;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const options: [number, number, () => void][] = [];
      if (y > 0 && !seen[y - 1][x]) options.push([x, y - 1, () => (hWalls[y][x] = false)]);
      if (y < grid - 1 && !seen[y + 1][x]) options.push([x, y + 1, () => (hWalls[y + 1][x] = false)]);
      if (x > 0 && !seen[y][x - 1]) options.push([x - 1, y, () => (vWalls[y][x] = false)]);
      if (x < grid - 1 && !seen[y][x + 1]) options.push([x + 1, y, () => (vWalls[y][x + 1] = false)]);
      if (!options.length) {
        stack.pop();
        continue;
      }
      const [nx, ny, knock] = options[Math.floor(Math.random() * options.length)];
      knock();
      seen[ny][nx] = true;
      stack.push([nx, ny]);
    }
  }

  /**
   * A wall between two ground points, as a 2x2 grid of panels rather than one
   * quad. A single flat quad gives a camera standing against it a screen of
   * uniform colour with nothing to read; panelling costs three extra polygons
   * and means there is always a seam and a shade change in view.
   */
  function pushWall(ax: number, az: number, bx: number, bz: number, base: Rgb) {
    const PANES = 2;
    for (let i = 0; i < PANES; i++) {
      for (let j = 0; j < PANES; j++) {
        const t0 = i / PANES;
        const t1 = (i + 1) / PANES;
        const y0 = (j / PANES) * WALL_H;
        const y1 = ((j + 1) / PANES) * WALL_H;
        const p0x = ax + (bx - ax) * t0;
        const p0z = az + (bz - az) * t0;
        const p1x = ax + (bx - ax) * t1;
        const p1z = az + (bz - az) * t1;
        // Deterministic per-panel shade, so a wall has grain but never flickers.
        const k = 0.88 + (((i * 3 + j * 5 + Math.round(ax + az)) % 4) / 4) * 0.24;
        faces.push(
          quad(
            [p0x, y0, p0z],
            [p1x, y0, p1z],
            [p1x, y1, p1z],
            [p0x, y1, p0z],
            [base[0] * k, base[1] * k, base[2] * k],
            { twoSided: true },
          ),
        );
      }
    }
  }

  function build() {
    faces = [];
    for (let y = 0; y <= grid; y++) {
      for (let x = 0; x < grid; x++) {
        if (!hWalls[y][x]) continue;
        const z = y * CELL;
        pushWall(x * CELL, z, (x + 1) * CELL, z, (x + y) % 2 ? WALL_A : WALL_B);
      }
    }
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x <= grid; x++) {
        if (!vWalls[y][x]) continue;
        const px = x * CELL;
        pushWall(px, y * CELL, px, (y + 1) * CELL, (x + y) % 2 ? WALL_B : WALL_A);
      }
    }
    // Floor tiles. One quad per cell rather than one big plane, so the fog
    // gradient has something to grade across.
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const x0 = x * CELL;
        const z0 = y * CELL;
        faces.push(
          quad(
            [x0, 0, z0],
            [x0 + CELL, 0, z0],
            [x0 + CELL, 0, z0 + CELL],
            [x0, 0, z0 + CELL],
            (x + y) % 2 ? FLOOR_A : FLOOR_B,
            { twoSided: true },
          ),
        );
      }
    }
    // The exit: a glowing post, readable from the far end of a corridor.
    const ex = exitX * CELL + CELL / 2;
    const ez = exitZ * CELL + CELL / 2;
    const w = 0.22;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as [number, number][]) {
      const px = ex + dx * w;
      const pz = ez + dz * w;
      const sx = dz * w;
      const sz = dx * w;
      faces.push(
        quad(
          [px - sx, 0.05, pz - sz],
          [px + sx, 0.05, pz + sz],
          [px + sx, 1.5, pz + sz],
          [px - sx, 1.5, pz - sz],
          EXIT_C,
          { emissive: true, twoSided: true },
        ),
      );
    }
  }

  function startLevel() {
    grid = SIZES[level];
    carve();
    exitX = grid - 1;
    exitZ = grid - 1;
    build();
    cam.x = CELL / 2;
    cam.z = CELL / 2;
    // Face whichever way is actually open. Spawning nose-first into a wall
    // shows the player a flat rectangle and tells them nothing about where
    // they are - a maze has to open in front of you.
    cam.yaw = hWalls[1][0] ? Math.PI / 2 : 0;
    cam.pitch = 0;
    visited[0][0] = true;
    onStatus?.(`Maze ${level + 1} of ${SIZES.length} - find the green post`);
  }

  function reset() {
    level = 0;
    total = 0;
    elapsed = 0;
    running = false;
    done = false;
    onScore(0);
    startLevel();
  }

  function collide(px: number, pz: number): [number, number] {
    const cx = Math.max(0, Math.min(grid - 1, Math.floor(px / CELL)));
    const cz = Math.max(0, Math.min(grid - 1, Math.floor(pz / CELL)));
    if (vWalls[cz][cx] && px < cx * CELL + RADIUS) px = cx * CELL + RADIUS;
    if (vWalls[cz][cx + 1] && px > (cx + 1) * CELL - RADIUS) px = (cx + 1) * CELL - RADIUS;
    if (hWalls[cz][cx] && pz < cz * CELL + RADIUS) pz = cz * CELL + RADIUS;
    if (hWalls[cz + 1][cx] && pz > (cz + 1) * CELL - RADIUS) pz = (cz + 1) * CELL - RADIUS;
    return [px, pz];
  }

  /** Drag state: the left half of the canvas walks, the right half looks. */
  let walkDrag: { id: number; x: number; y: number } | null = null;
  let lookDrag: { id: number; x: number; y: number } | null = null;
  let walkVec: [number, number] = [0, 0];

  function step(dt: number) {
    if (done) return;

    let forward = 0;
    let strafe = 0;
    let turn = 0;
    if (keys.has("w") || keys.has("arrowup")) forward += 1;
    if (keys.has("s") || keys.has("arrowdown")) forward -= 1;
    if (keys.has("a")) strafe -= 1;
    if (keys.has("d")) strafe += 1;
    if (keys.has("arrowleft")) turn -= 1;
    if (keys.has("arrowright")) turn += 1;

    forward += walkVec[1];
    strafe += walkVec[0];

    cam.yaw += turn * 2.1 * dt;

    const speed = 3.1;
    if (forward || strafe) {
      if (!running) running = true;
      const sin = Math.sin(cam.yaw);
      const cos = Math.cos(cam.yaw);
      // yaw 0 faces +z, so forward is (sin, cos) and right is (cos, -sin).
      const dx = (sin * forward + cos * strafe) * speed * dt;
      const dz = (cos * forward - sin * strafe) * speed * dt;
      const [nx, nz] = collide(cam.x + dx, cam.z + dz);
      cam.x = nx;
      cam.z = nz;
      if (!reducedMotion) bob += dt * 9;
    }

    if (running) elapsed += dt;

    const cx = Math.floor(cam.x / CELL);
    const cz = Math.floor(cam.z / CELL);
    if (cz >= 0 && cz < grid && cx >= 0 && cx < grid) visited[cz][cx] = true;

    if (cx === exitX && cz === exitZ) {
      const seconds = Math.max(1, Math.round(elapsed));
      total += Math.max(200, 4000 - seconds * 45);
      onScore(total);
      beep(560, 0.08, "sine", 0.05);
      setTimeout(() => beep(760, 0.12, "sine", 0.05), 90);
      level++;
      if (level >= SIZES.length) {
        done = true;
        running = false;
        onStatus?.(`All ${SIZES.length} mazes cleared in ${seconds}s! Press R to play again`);
        onGameOver(total, Math.max(1, Math.round(elapsed)));
      } else {
        startLevel();
      }
    }
  }

  function drawMinimap() {
    const size = Math.min(96, width * 0.28);
    const pad = 10;
    const ox = width - size - pad;
    const oy = pad;
    const s = size / grid;

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(ox - 4, oy - 4, size + 8, size + 8);

    // Only cells the player has stood in, so the map is a record rather than
    // a solution.
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        if (visited[y][x]) ctx.fillRect(ox + x * s, oy + y * s, s, s);
      }
    }

    ctx.strokeStyle = "rgba(167,139,250,0.75)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= grid; y++) {
      for (let x = 0; x < grid; x++) {
        if (!hWalls[y][x]) continue;
        if (!(visited[Math.min(y, grid - 1)]?.[x] || visited[Math.max(0, y - 1)]?.[x])) continue;
        ctx.moveTo(ox + x * s, oy + y * s);
        ctx.lineTo(ox + (x + 1) * s, oy + y * s);
      }
    }
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x <= grid; x++) {
        if (!vWalls[y][x]) continue;
        if (!(visited[y]?.[Math.min(x, grid - 1)] || visited[y]?.[Math.max(0, x - 1)])) continue;
        ctx.moveTo(ox + x * s, oy + y * s);
        ctx.lineTo(ox + x * s, oy + (y + 1) * s);
      }
    }
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.fillRect(ox + exitX * s + s * 0.3, oy + exitZ * s + s * 0.3, s * 0.4, s * 0.4);

    const px = ox + (cam.x / CELL) * s;
    const py = oy + (cam.z / CELL) * s;
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.arc(px, py, Math.max(2, s * 0.18), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f472b6";
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.sin(cam.yaw) * s * 0.5, py + Math.cos(cam.yaw) * s * 0.5);
    ctx.stroke();
  }

  function render() {
    ctx.fillStyle = `rgb(${FOG[0] * 255},${FOG[1] * 255},${FOG[2] * 255})`;
    ctx.fillRect(0, 0, width, height);

    const eye = { ...cam, y: EYE + (reducedMotion ? 0 : Math.sin(bob) * 0.035) };
    renderScene(ctx, width, height, eye, faces, {
      light: [-0.35, -1, 0.3],
      ambient: 0.42,
      fog: FOG,
      fogStart: 2.5,
      fogEnd: CELL * grid * 0.75,
      edge: 0.45,
    });

    drawMinimap();

    ctx.fillStyle = "rgba(229,231,235,0.75)";
    ctx.font = "600 14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`Maze ${Math.min(level + 1, SIZES.length)}/${SIZES.length}`, 14, 24);
    ctx.fillText(`${Math.floor(elapsed)}s`, 14, 42);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    render();
  }

  function at(e: PointerEvent): [number, number] {
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * width,
      ((e.clientY - rect.top) / rect.height) * height,
    ];
  }

  const onDown = (e: PointerEvent) => {
    const [x, y] = at(e);
    canvas.setPointerCapture?.(e.pointerId);
    if (done) {
      reset();
      return;
    }
    if (x < width / 2) walkDrag = { id: e.pointerId, x, y };
    else lookDrag = { id: e.pointerId, x, y };
  };

  const onMove = (e: PointerEvent) => {
    const [x, y] = at(e);
    if (walkDrag && walkDrag.id === e.pointerId) {
      // Offset from where the thumb went down, as a small analogue stick.
      const dx = x - walkDrag.x;
      const dy = y - walkDrag.y;
      const r = 48;
      walkVec = [
        Math.max(-1, Math.min(1, dx / r)),
        Math.max(-1, Math.min(1, -dy / r)),
      ];
    }
    if (lookDrag && lookDrag.id === e.pointerId) {
      cam.yaw += (x - lookDrag.x) * 0.006;
      cam.pitch = Math.max(-0.7, Math.min(0.7, cam.pitch - (y - lookDrag.y) * 0.005));
      lookDrag.x = x;
      lookDrag.y = y;
    }
  };

  const onUp = (e: PointerEvent) => {
    if (walkDrag?.id === e.pointerId) {
      walkDrag = null;
      walkVec = [0, 0];
    }
    if (lookDrag?.id === e.pointerId) lookDrag = null;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "r") {
      reset();
      return;
    }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      e.preventDefault();
      keys.add(k);
    }
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  const onBlur = () => keys.clear();

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  reset();
  raf = requestAnimationFrame(frame);

  return {
    pause: () => cancelAnimationFrame(raf),
    resume: () => {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    restart: () => reset(),
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
};

export default maze3d;
