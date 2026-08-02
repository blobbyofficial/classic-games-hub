import type { GameEngineFactory } from "@/types";
import { beep, palette } from "../helpers";

/**
 * A playable 3x3 Rubik's cube, software-rendered on a 2D canvas.
 *
 * No 3D library. Every other engine here is canvas 2D, and 54 stickers is a
 * trivial amount of geometry to transform by hand - pulling in a WebGL runtime
 * would cost more bytes than the whole rest of the games bundle.
 *
 * The cube state is 54 stickers, each carrying a cubie coordinate, a face
 * normal and a colour. A face turn rotates those two integer vectors 90
 * degrees and the colour simply travels with the sticker, so there are no
 * permutation tables to get wrong and no floating-point drift to accumulate
 * over a long solve. "Solved" is then just: every sticker sharing a normal
 * shares a colour.
 */

type Vec3 = [number, number, number];

/** Axis index into a Vec3, for readability at the call sites below. */
const X = 0;
const Y = 1;
const Z = 2;

const FACES: { n: Vec3; colour: string; letter: string }[] = [
  { n: [0, 1, 0], colour: "#f1f5f9", letter: "U" },
  { n: [0, -1, 0], colour: "#facc15", letter: "D" },
  { n: [1, 0, 0], colour: "#ef4444", letter: "R" },
  { n: [-1, 0, 0], colour: "#fb923c", letter: "L" },
  { n: [0, 0, 1], colour: "#22c55e", letter: "F" },
  { n: [0, 0, -1], colour: "#3b82f6", letter: "B" },
];

/** Face letter -> the layer that turns, as [axis, coordinate on that axis]. */
const NOTATION: Record<string, [number, number]> = {
  u: [Y, 1],
  d: [Y, -1],
  r: [X, 1],
  l: [X, -1],
  f: [Z, 1],
  b: [Z, -1],
};

interface Sticker {
  /** Cubie coordinate, each component -1, 0 or 1. */
  c: Vec3;
  /** Outward face normal, one of the six axis vectors. */
  n: Vec3;
  colour: string;
}

/**
 * Exact 90-degree rotation about an axis. Integer in, integer out - which is
 * the whole reason the model stores vectors rather than a permutation.
 */
function turn(v: Vec3, axis: number, d: number): Vec3 {
  const [x, y, z] = v;
  if (axis === X) return [x, -d * z, d * y];
  if (axis === Y) return [d * z, y, -d * x];
  return [-d * y, d * x, z];
}

/** The same rotation at an arbitrary angle, for the in-between frames. */
function spin(v: Vec3, axis: number, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const [x, y, z] = v;
  if (axis === X) return [x, y * c - z * s, y * s + z * c];
  if (axis === Y) return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** The two in-plane axes of a face, used to build sticker corners. */
function basis(n: Vec3): [Vec3, Vec3] {
  if (n[X] !== 0) return [[0, 1, 0], [0, 0, 1]];
  if (n[Y] !== 0) return [[1, 0, 0], [0, 0, 1]];
  return [[1, 0, 0], [0, 1, 0]];
}

const CUBE = 0.5; // half-width of a cubie face
const STICKER = 0.41; // half-width of the coloured sticker inset into it
const DIST = 7.2; // camera distance along -z
const TURN_TIME = 0.16; // seconds per 90-degree turn

const rubiks: GameEngineFactory = ({
  canvas,
  width,
  height,
  onScore,
  onGameOver,
  onStatus,
  reducedMotion,
}) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const cx = width / 2;
  const cy = height / 2 + 8;
  // Sized so the cube fills roughly two thirds of the shorter edge - enough
  // margin that a corner never clips as the view is orbited.
  const focal = Math.min(width, height) * 1.15;

  let stickers: Sticker[] = [];
  let moves = 0;
  let elapsed = 0;
  let running = false; // the timer only runs once the player has touched it
  let solved = false;
  let scrambling = false;

  // The turn currently animating, if any. Queued turns land here in order so a
  // fast player (or the scramble) never loses a move.
  let anim: { axis: number; layer: number; d: number; t: number } | null = null;
  const queue: { axis: number; layer: number; d: number }[] = [];

  // View orientation. Dragging empty space orbits the cube; dragging a sticker
  // turns a layer.
  let yaw = -0.62;
  let pitch = -0.5;

  let raf = 0;
  let last = performance.now();

  /** Projected sticker quads from the last frame, for hit-testing. */
  let hits: { s: Sticker; poly: [number, number][]; centre: [number, number] }[] = [];

  function reset(scramble = true) {
    stickers = [];
    for (const f of FACES) {
      const [u, v] = basis(f.n);
      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) {
          const c: Vec3 = [
            f.n[X] + u[X] * a + v[X] * b,
            f.n[Y] + u[Y] * a + v[Y] * b,
            f.n[Z] + u[Z] * a + v[Z] * b,
          ];
          stickers.push({ c, n: [...f.n] as Vec3, colour: f.colour });
        }
      }
    }
    queue.length = 0;
    anim = null;
    moves = 0;
    elapsed = 0;
    running = false;
    solved = false;
    onScore(0);

    if (scramble) {
      scrambling = true;
      // 22 quarter-turns, never undoing the previous one, which would leave a
      // visibly easier cube than the move count suggests.
      let prevAxis = -1;
      for (let i = 0; i < 22; i++) {
        let axis = Math.floor(Math.random() * 3);
        if (axis === prevAxis) axis = (axis + 1 + Math.floor(Math.random() * 2)) % 3;
        prevAxis = axis;
        const layer = Math.random() < 0.5 ? -1 : 1;
        const d = Math.random() < 0.5 ? -1 : 1;
        queue.push({ axis, layer, d });
      }
      onStatus?.("Scrambling...");
    } else {
      scrambling = false;
      onStatus?.("Drag a sticker to turn a layer");
    }
  }

  function applyTurn(axis: number, layer: number, d: number) {
    for (const s of stickers) {
      if (s.c[axis] !== layer) continue;
      s.c = turn(s.c, axis, d);
      s.n = turn(s.n, axis, d);
    }
  }

  function isSolved(): boolean {
    const seen = new Map<string, string>();
    for (const s of stickers) {
      const key = s.n.join(",");
      const known = seen.get(key);
      if (known === undefined) seen.set(key, s.colour);
      else if (known !== s.colour) return false;
    }
    return true;
  }

  function pushTurn(axis: number, layer: number, d: number) {
    if (solved) return;
    queue.push({ axis, layer, d });
  }

  /** Called once a turn's animation finishes and the model has been updated. */
  function afterTurn() {
    if (scrambling) {
      if (queue.length === 0 && !anim) {
        scrambling = false;
        // A scramble can, very rarely, land back on a solved cube.
        if (isSolved()) {
          reset(true);
          return;
        }
        onStatus?.("Drag a sticker to turn a layer");
      }
      return;
    }

    moves++;
    running = true;
    beep(200 + (moves % 7) * 18, 0.03, "triangle", 0.035);

    if (isSolved()) {
      solved = true;
      running = false;
      const seconds = Math.max(1, Math.round(elapsed));
      const score = Math.max(250, 8000 - moves * 40 - seconds * 12);
      onScore(score);
      onStatus?.(`Solved in ${moves} moves and ${seconds}s! Press R to scramble again`);
      onGameOver(score, seconds);
      beep(523, 0.09, "sine", 0.05);
      setTimeout(() => beep(659, 0.09, "sine", 0.05), 90);
      setTimeout(() => beep(784, 0.16, "sine", 0.05), 180);
    } else {
      onScore(moves);
    }
  }

  function step(dt: number) {
    if (running && !solved) elapsed += dt;

    if (!anim && queue.length > 0) {
      const next = queue.shift()!;
      // The scramble plays out much faster than a hand turn, and reduced
      // motion skips the in-between frames entirely.
      const instant = reducedMotion || (scrambling && queue.length > 2);
      if (instant) {
        applyTurn(next.axis, next.layer, next.d);
        afterTurn();
      } else {
        anim = { ...next, t: 0 };
      }
    }

    if (anim) {
      anim.t += dt / (scrambling ? TURN_TIME * 0.45 : TURN_TIME);
      if (anim.t >= 1) {
        applyTurn(anim.axis, anim.layer, anim.d);
        anim = null;
        afterTurn();
      }
    }
  }

  function project(v: Vec3): [number, number] {
    const z = v[Z] + DIST;
    return [cx + (v[X] * focal) / z, cy - (v[Y] * focal) / z];
  }

  /** Model space -> view space: yaw about Y, then pitch about X. */
  function view(v: Vec3): Vec3 {
    return spin(spin(v, Y, yaw), X, pitch);
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);

    const angle = anim ? anim.t * anim.d * (Math.PI / 2) : 0;
    const quads: { poly: [number, number][]; inner: [number, number][]; s: Sticker; depth: number }[] = [];

    for (const s of stickers) {
      const moving = anim && s.c[anim.axis] === anim.layer;
      const [u, v] = basis(s.n);

      // The sticker sits on the outer plane of its cubie: cubie centre pushed
      // half a unit along the face normal.
      const centre: Vec3 = [
        s.c[X] + s.n[X] * CUBE,
        s.c[Y] + s.n[Y] * CUBE,
        s.c[Z] + s.n[Z] * CUBE,
      ];

      const corner = (su: number, sv: number, size: number): Vec3 => {
        let p: Vec3 = [
          centre[X] + u[X] * su * size + v[X] * sv * size,
          centre[Y] + u[Y] * su * size + v[Y] * sv * size,
          centre[Z] + u[Z] * su * size + v[Z] * sv * size,
        ];
        if (moving) p = spin(p, anim!.axis, angle);
        return view(p);
      };

      let normal = s.n as Vec3;
      if (moving) normal = spin(normal, anim!.axis, angle);
      normal = view(normal);
      if (normal[Z] > -0.02) continue; // facing away from the camera

      const outer: Vec3[] = [
        corner(-1, -1, CUBE),
        corner(1, -1, CUBE),
        corner(1, 1, CUBE),
        corner(-1, 1, CUBE),
      ];
      const inner: Vec3[] = [
        corner(-1, -1, STICKER),
        corner(1, -1, STICKER),
        corner(1, 1, STICKER),
        corner(-1, 1, STICKER),
      ];

      quads.push({
        poly: outer.map(project) as [number, number][],
        inner: inner.map(project) as [number, number][],
        s,
        depth: outer.reduce((acc, p) => acc + p[Z], 0) / 4,
      });
    }

    // Far to near. Back faces are already culled, so this only matters for the
    // frames where a turning layer swings over the still body of the cube.
    quads.sort((a, b) => b.depth - a.depth);

    const trace = (poly: [number, number][]) => {
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
    };

    for (const q of quads) {
      ctx.fillStyle = "#0b0a12";
      trace(q.poly);
      ctx.fill();

      ctx.fillStyle = q.s.colour;
      trace(q.inner);
      ctx.fill();
    }

    hits = quads.map((q) => ({
      s: q.s,
      poly: q.poly,
      centre: [
        (q.poly[0][0] + q.poly[2][0]) / 2,
        (q.poly[0][1] + q.poly[2][1]) / 2,
      ] as [number, number],
    }));

    // HUD
    ctx.fillStyle = pal.muted;
    ctx.font = "600 14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`${moves} moves`, 14, 24);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(elapsed)}s`, width - 14, 24);

    if (solved) {
      ctx.textAlign = "center";
      ctx.fillStyle = pal.gold;
      ctx.font = "700 18px system-ui";
      ctx.fillText("Solved", cx, height - 18);
    }
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    render();
  }

  function pointInPoly(px: number, py: number, poly: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function toCanvas(e: PointerEvent): [number, number] {
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * width,
      ((e.clientY - rect.top) / rect.height) * height,
    ];
  }

  let drag: {
    from: [number, number];
    sticker: Sticker | null;
    /** Screen direction of each in-plane axis, paired with its model vector. */
    axes: { dir: [number, number]; vec: Vec3 }[];
    done: boolean;
  } | null = null;

  const onDown = (e: PointerEvent) => {
    const [px, py] = toCanvas(e);
    canvas.setPointerCapture?.(e.pointerId);

    // `hits` is ordered far to near for painting, so search it backwards -
    // during a turn the near layer can sit over a face behind it.
    let hit: (typeof hits)[number] | undefined;
    for (let i = hits.length - 1; i >= 0; i--) {
      if (pointInPoly(px, py, hits[i].poly)) {
        hit = hits[i];
        break;
      }
    }
    if (!hit || anim || scrambling) {
      drag = { from: [px, py], sticker: null, axes: [], done: false };
      return;
    }

    // Work out where each in-plane axis of this face points on screen, so a
    // drag can be matched against the four directions the player might mean.
    const [u, v] = basis(hit.s.n);
    const centre: Vec3 = [
      hit.s.c[X] + hit.s.n[X] * CUBE,
      hit.s.c[Y] + hit.s.n[Y] * CUBE,
      hit.s.c[Z] + hit.s.n[Z] * CUBE,
    ];
    const base = project(view(centre));
    const axes: { dir: [number, number]; vec: Vec3 }[] = [];
    for (const vec of [u, v]) {
      const tip = project(
        view([centre[X] + vec[X] * 0.4, centre[Y] + vec[Y] * 0.4, centre[Z] + vec[Z] * 0.4]),
      );
      const dir: [number, number] = [tip[0] - base[0], tip[1] - base[1]];
      axes.push({ dir, vec });
      axes.push({ dir: [-dir[0], -dir[1]], vec: [-vec[X], -vec[Y], -vec[Z]] as Vec3 });
    }
    drag = { from: [px, py], sticker: hit.s, axes, done: false };
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || drag.done) return;
    const [px, py] = toCanvas(e);
    const dx = px - drag.from[0];
    const dy = py - drag.from[1];

    if (!drag.sticker) {
      // Orbit. Pitch is clamped short of the poles so the cube never flips.
      yaw += dx * 0.009;
      pitch = Math.max(-1.35, Math.min(1.35, pitch + dy * 0.009));
      drag.from = [px, py];
      return;
    }

    const len = Math.hypot(dx, dy);
    if (len < 16) return; // below this a drag is really a tap

    // Whichever in-plane direction the drag best matches is the direction the
    // sticker is being pushed; the layer that turns is perpendicular to both
    // that direction and the face normal.
    let best = drag.axes[0];
    let bestDot = -Infinity;
    for (const a of drag.axes) {
      const al = Math.hypot(a.dir[0], a.dir[1]) || 1;
      const dot = (a.dir[0] * dx + a.dir[1] * dy) / al;
      if (dot > bestDot) {
        bestDot = dot;
        best = a;
      }
    }

    // Rotating about (normal x push) by +90 degrees moves the face in the
    // push direction, which is exactly the gesture the player just made.
    const axisVec = cross(drag.sticker.n, best.vec);
    const axis = axisVec.findIndex((c) => c !== 0);
    if (axis === -1) return;
    const d = axisVec[axis] > 0 ? 1 : -1;
    pushTurn(axis, drag.sticker.c[axis], d);
    drag.done = true;
  };

  const onUp = () => {
    drag = null;
  };

  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "r") {
      reset(true);
      return;
    }
    const face = NOTATION[k];
    if (!face) return;
    e.preventDefault();
    const [axis, layer] = face;
    // A face turns clockwise when viewed from outside, so a layer on the
    // negative side of its axis turns the opposite way for the same notation.
    const base = layer > 0 ? -1 : 1;
    pushTurn(axis, layer, e.shiftKey ? -base : base);
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKey);

  reset(true);
  raf = requestAnimationFrame(frame);

  return {
    pause: () => cancelAnimationFrame(raf),
    resume: () => {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    restart: () => reset(true),
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    },
  };
};

export default rubiks;
