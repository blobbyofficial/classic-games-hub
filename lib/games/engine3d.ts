/**
 * A small software 3D renderer, shared by the arcade's true-3D titles.
 *
 * Cube got away with hand-rolled maths because 54 flat stickers never cross the
 * camera plane and never need lighting. Anything with a camera *inside* the
 * scene does: walls pass through the near plane, and a scene with no shading
 * reads as flat colour no matter how correct the geometry is. This module is
 * the missing half - a real pipeline, still on a 2D canvas.
 *
 * Deliberately not WebGL. v1.4.1 spent a release taking an animation runtime
 * and a query cache out of the bundle, and a 3D library would put more back
 * than every engine here weighs combined. A few hundred polygons is nothing to
 * transform in JavaScript, and `fill()` on a convex polygon is hardware
 * accelerated in every browser that matters.
 *
 * Coordinates are right-handed with +y up. The camera looks down **+z** at
 * yaw 0, which makes the view transform read forwards rather than inside out.
 */

export type Vec3 = [number, number, number];
/** Linear 0..1 rgb, so shading can scale it without parsing a colour string. */
export type Rgb = [number, number, number];

export interface Camera {
  x: number;
  y: number;
  z: number;
  /** Radians, around +y. 0 looks down +z. */
  yaw: number;
  /** Radians, around +x. Positive looks up. */
  pitch: number;
  /** Vertical field of view, radians. */
  fov: number;
}

export interface Face {
  /** Convex polygon, wound anticlockwise when seen from the front. */
  pts: Vec3[];
  colour: Rgb;
  /** Ignores lighting and fog. For glowing markers. */
  emissive?: boolean;
  /** Drawn on both sides rather than backface-culled. */
  twoSided?: boolean;
}

export interface SceneOptions {
  /** Direction the light travels *towards*; normalised internally. */
  light?: Vec3;
  /** Floor level of brightness an unlit face still gets. */
  ambient?: number;
  /** Colour distant geometry fades into. Usually the canvas background. */
  fog?: Rgb;
  fogStart?: number;
  fogEnd?: number;
  /**
   * Outline every polygon in a darker shade of its own colour, 0 to 1.
   *
   * Flat shading alone leaves two adjoining surfaces of similar brightness
   * indistinguishable, and a camera pressed against one wall sees a single
   * flat rectangle with no cue at all about what it is looking at. Edges are
   * what make low-poly geometry legible, and the fill path is already built,
   * so they cost one extra stroke per face.
   */
  edge?: number;
}

const NEAR = 0.08;

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function normalise(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** World space -> camera space. Translate by -camera, then unyaw, then unpitch. */
export function toView(p: Vec3, cam: Camera): Vec3 {
  const x = p[0] - cam.x;
  const y = p[1] - cam.y;
  const z = p[2] - cam.z;
  const cy = Math.cos(-cam.yaw);
  const sy = Math.sin(-cam.yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(-cam.pitch);
  const sp = Math.sin(-cam.pitch);
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}

/**
 * Clip a convex polygon against the near plane (Sutherland-Hodgman, one plane).
 *
 * Without this, a wall the camera is standing next to divides by a z at or
 * behind the eye and flings its corners across the screen. It is the single
 * thing that separates a first-person camera from a diorama.
 */
function clipNear(poly: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const aIn = a[2] >= NEAR;
    const bIn = b[2] >= NEAR;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  return out;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Draw a scene. Faces are given in world space and are transformed, culled,
 * clipped, sorted and shaded here.
 *
 * Depth sorting is per-face by centroid (painter's algorithm) rather than a
 * z-buffer: a z-buffer in JavaScript means per-pixel work and giving up
 * `fill()`, which is where all the speed is. The tradeoff is that large
 * interpenetrating faces can sort wrongly - fine for axis-aligned level
 * geometry, which is what the 3D titles here are built from.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cam: Camera,
  faces: Face[],
  opts: SceneOptions = {},
) {
  const light = normalise(opts.light ?? [-0.4, -1, 0.35]);
  const ambient = opts.ambient ?? 0.35;
  const fog = opts.fog;
  const fogStart = opts.fogStart ?? 6;
  const fogEnd = opts.fogEnd ?? 18;

  const focal = height / 2 / Math.tan(cam.fov / 2);
  const cx = width / 2;
  const cy = height / 2;

  interface Ready {
    screen: [number, number][];
    depth: number;
    r: number;
    g: number;
    b: number;
  }
  const ready: Ready[] = [];

  for (const face of faces) {
    // The normal is taken in world space, before the view transform, so
    // lighting stays fixed to the world as the camera moves - a light that
    // swings with the head is the classic giveaway of a fake 3D scene.
    const normal = normalise(cross(sub(face.pts[1], face.pts[0]), sub(face.pts[2], face.pts[0])));

    const view = face.pts.map((p) => toView(p, cam));
    const clipped = clipNear(view);
    if (clipped.length < 3) continue;

    // Backface cull in screen space after clipping: the sign of the projected
    // area tells us which way the polygon is wound from here.
    const screen: [number, number][] = clipped.map((p) => [
      cx + (p[0] * focal) / p[2],
      cy - (p[1] * focal) / p[2],
    ]);
    let area = 0;
    for (let i = 0; i < screen.length; i++) {
      const a = screen[i];
      const b = screen[(i + 1) % screen.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    if (!face.twoSided && area >= 0) continue;
    if (Math.abs(area) < 0.5) continue; // edge-on, nothing to draw

    let depth = 0;
    for (const p of clipped) depth += p[2];
    depth /= clipped.length;

    let [r, g, b] = face.colour;
    if (!face.emissive) {
      // Two-sided Lambert: a wall lit from behind is dim, not black, which is
      // what a single-sided term gives on interior geometry.
      const lambert = Math.abs(dot(normal, light));
      const shade = ambient + (1 - ambient) * lambert;
      r *= shade;
      g *= shade;
      b *= shade;
      if (fog) {
        const t = clamp01((depth - fogStart) / (fogEnd - fogStart));
        r += (fog[0] - r) * t;
        g += (fog[1] - g) * t;
        b += (fog[2] - b) * t;
      }
    }
    ready.push({ screen, depth, r, g, b });
  }

  ready.sort((a, b) => b.depth - a.depth);

  const edge = opts.edge ?? 0;
  if (edge > 0) {
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
  }

  for (const f of ready) {
    ctx.fillStyle = `rgb(${Math.round(clamp01(f.r) * 255)},${Math.round(clamp01(f.g) * 255)},${Math.round(clamp01(f.b) * 255)})`;
    ctx.beginPath();
    ctx.moveTo(f.screen[0][0], f.screen[0][1]);
    for (let i = 1; i < f.screen.length; i++) ctx.lineTo(f.screen[i][0], f.screen[i][1]);
    ctx.closePath();
    ctx.fill();
    if (edge > 0) {
      const k = 1 - edge;
      ctx.strokeStyle = `rgb(${Math.round(clamp01(f.r * k) * 255)},${Math.round(clamp01(f.g * k) * 255)},${Math.round(clamp01(f.b * k) * 255)})`;
      ctx.stroke();
    }
  }
}

/** An axis-aligned quad, wound so its front face points along +normal. */
export function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, colour: Rgb, extra: Partial<Face> = {}): Face {
  return { pts: [a, b, c, d], colour, ...extra };
}
