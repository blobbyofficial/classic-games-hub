import type { GameEngineFactory } from "@/types";
import { beep, clamp, createLoop, palette, roundRect } from "../helpers";

/**
 * Turbo Horizon — an OutRun-style pseudo-3D racer (roadmap v1.4 "3D games").
 * A segmented road with curves and hills is perspective-projected onto the
 * canvas; steer through traffic, stay on the tarmac, and rack up distance and
 * overtakes. First of the "new dimensions" titles.
 */

const SEG_LEN = 180; // world units per road segment
const ROAD_W = 1100; // half-width of the road in world units
const DRAW_SEGS = 90; // how many segments to draw ahead
const CAM_H = 520;
const CAM_DEPTH = 0.84; // 1 / tan(fov/2)

interface Segment {
  curve: number;
  y: number; // world height of the far edge
  color: 0 | 1;
  /** Roadside pylons: -1 left, 1 right, 0 none. */
  scenery: number;
}

interface Car {
  z: number; // world z position
  offset: number; // -1..1 across the road
  speed: number;
  hue: number;
  passed: boolean;
}

const racer: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus, reducedMotion }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();

  let segments: Segment[] = [];
  let cars: Car[] = [];
  let playerX = 0; // -1..1 across the road
  let position = 0; // world z of the camera
  let speed = 0;
  let steer = 0; // -1 | 0 | 1 from input
  let score = 0;
  let overtakes = 0;
  let crashTimer = 0;
  let alive = true;
  let startedAt = 0;
  let time = 0;

  const MAX_SPEED = 8200; // units/second
  const ACCEL = 2400;
  const OFFROAD_DECEL = 5200;

  function buildTrack() {
    segments = [];
    let y = 0;
    const addSection = (count: number, curve: number, hill: number) => {
      for (let i = 0; i < count; i++) {
        y += hill;
        segments.push({
          curve,
          y,
          color: (segments.length >> 2) % 2 === 0 ? 0 : 1,
          scenery: segments.length % 9 === 0 ? (segments.length % 18 === 0 ? -1 : 1) : 0,
        });
      }
    };
    addSection(60, 0, 0);
    addSection(60, 2.4, 0);
    addSection(40, 0, 12);
    addSection(70, -3.2, -8);
    addSection(50, 0, 0);
    addSection(70, 3.6, 10);
    addSection(40, -1.6, -14);
    addSection(60, 0, 6);
    addSection(80, -3.8, 0);
    addSection(50, 1.8, -6);
  }

  function trackLength() {
    return segments.length * SEG_LEN;
  }

  function segmentAt(z: number): Segment {
    return segments[Math.floor(z / SEG_LEN) % segments.length];
  }

  function spawnCar(aheadZ: number) {
    cars.push({
      z: (position + aheadZ) % trackLength(),
      offset: (Math.random() * 1.4 - 0.7) * 0.8,
      speed: MAX_SPEED * (0.35 + Math.random() * 0.3),
      hue: [200, 330, 40, 130][Math.floor(Math.random() * 4)],
      passed: false,
    });
  }

  function reset() {
    buildTrack();
    cars = [];
    for (let i = 1; i <= 8; i++) spawnCar(i * 2600);
    playerX = 0;
    position = 0;
    speed = 0;
    score = 0;
    overtakes = 0;
    crashTimer = 0;
    time = 0;
    alive = true;
    startedAt = performance.now();
    onScore(0);
    onStatus?.("");
  }

  function crash() {
    if (!alive) return;
    alive = false;
    beep(120, 0.4, "sawtooth", 0.06);
    onStatus?.("Crashed! Tap or press R to race again");
    onGameOver(score, Math.round((performance.now() - startedAt) / 1000));
  }

  function update(dt: number) {
    if (!alive) return;
    time += dt;

    const seg = segmentAt(position);
    const onRoad = Math.abs(playerX) < 1.05;

    // Throttle is automatic; off-road scrubs speed hard.
    speed += (onRoad ? ACCEL : speed > MAX_SPEED * 0.25 ? -OFFROAD_DECEL : ACCEL * 0.4) * dt;
    speed = clamp(speed, 0, MAX_SPEED);

    // Steering + the curve pushing the car outward.
    const speedRatio = speed / MAX_SPEED;
    playerX += steer * dt * 1.9 * (0.4 + 0.6 * speedRatio);
    playerX -= seg.curve * speedRatio * speedRatio * dt * 0.42;
    playerX = clamp(playerX, -2, 2);

    position = (position + speed * dt) % trackLength();
    score = Math.floor(position / 120 + time * (speedRatio * 8)) + overtakes * 50;
    onScore(score);

    // Traffic.
    for (const car of cars) {
      car.z = (car.z + car.speed * dt) % trackLength();
      let rel = car.z - position;
      if (rel < -trackLength() / 2) rel += trackLength();
      if (rel > trackLength() / 2) rel -= trackLength();

      if (rel < 0 && !car.passed && rel > -SEG_LEN * 2) {
        car.passed = true;
        overtakes++;
        beep(760, 0.05, "square", 0.03);
      }
      if (rel >= 0 && rel < SEG_LEN * 0.9 && Math.abs(car.offset - playerX) < 0.34 && speed > car.speed) {
        crash();
      }
      // Recycle cars far behind to far ahead.
      if (rel < -SEG_LEN * 6) {
        car.z = (position + DRAW_SEGS * SEG_LEN + Math.random() * 4000) % trackLength();
        car.offset = (Math.random() * 1.4 - 0.7) * 0.8;
        car.passed = false;
      }
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────

  function project(worldX: number, worldY: number, worldZ: number, camX: number, camY: number, camZ: number) {
    const dz = Math.max(1, worldZ - camZ);
    const scale = CAM_DEPTH / (dz / SEG_LEN / 4);
    return {
      x: width / 2 + (scale * (worldX - camX) * width) / 2 / 480,
      y: height / 2 - (scale * (worldY - camY) * height) / 2 / 480,
      w: (scale * ROAD_W * width) / 2 / 480,
    };
  }

  function render() {
    // Sky.
    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.55);
    sky.addColorStop(0, "#120b2e");
    sky.addColorStop(1, "#3b1470");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Horizon sun.
    const sunY = height * 0.42;
    const sun = ctx.createRadialGradient(width / 2, sunY, 6, width / 2, sunY, 90);
    sun.addColorStop(0, "#fbbf24");
    sun.addColorStop(1, "rgba(251,191,36,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(width / 2 - 100, sunY - 100, 200, 200);

    const baseIdx = Math.floor(position / SEG_LEN);
    const camSeg = segmentAt(position);
    const camY = CAM_H + camSeg.y;
    let x = 0; // accumulated curve offset
    let dx = -(camSeg.curve * ((position % SEG_LEN) / SEG_LEN)); // partial-segment correction
    let maxY = height; // clip: only draw above the previous segment (hills)

    const rows: {
      p1: ReturnType<typeof project>;
      p2: ReturnType<typeof project>;
      seg: Segment;
      idx: number;
    }[] = [];

    for (let n = 0; n < DRAW_SEGS; n++) {
      const idx = (baseIdx + n) % segments.length;
      const seg = segments[idx];
      const segZ = (baseIdx + n) * SEG_LEN;
      const camX = playerX * ROAD_W - x;
      const p1 = project(-x, seg.y, segZ, playerX * ROAD_W, camY, position);
      const p2 = project(-x - dx, segments[(idx + 1) % segments.length].y, segZ + SEG_LEN, playerX * ROAD_W, camY, position);
      void camX;
      x += dx;
      dx += seg.curve;
      if (p2.y >= maxY || p2.y >= p1.y) continue;
      rows.push({ p1, p2, seg, idx });
      maxY = p2.y;
    }

    // Ground + road, far to near so nearer rows overdraw.
    for (let i = rows.length - 1; i >= 0; i--) {
      const { p1, p2, seg } = rows[i];
      const grass = seg.color === 0 ? "#0c1b12" : "#0f2417";
      ctx.fillStyle = grass;
      ctx.fillRect(0, p2.y, width, p1.y - p2.y + 1);

      const rumble = seg.color === 0 ? "#e2e8f0" : "#dc2626";
      trap(p1.x, p1.y, p1.w * 1.14, p2.x, p2.y, p2.w * 1.14, rumble);
      const road = seg.color === 0 ? "#1f2333" : "#242840";
      trap(p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, road);
      if (seg.color === 0) {
        trap(p1.x, p1.y, p1.w * 0.012, p2.x, p2.y, p2.w * 0.012, "#e2e8f0");
      }
      // Neon pylons.
      if (seg.scenery !== 0) {
        const side = seg.scenery;
        const px = p1.x + side * p1.w * 1.45;
        const ph = (p1.y - p2.y) * 5;
        ctx.fillStyle = pal.neon;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(px - p1.w * 0.015, p1.y - ph, p1.w * 0.03, ph);
        ctx.globalAlpha = 1;
      }
    }

    // Traffic, far to near.
    const sorted = [...cars]
      .map((car) => {
        let rel = car.z - position;
        if (rel < 0) rel += trackLength();
        return { car, rel };
      })
      .filter(({ rel }) => rel > SEG_LEN * 0.5 && rel < DRAW_SEGS * SEG_LEN * 0.9)
      .sort((a, b) => b.rel - a.rel);
    for (const { car, rel } of sorted) {
      const row = rows.find((r) => (r.idx - baseIdx + segments.length) % segments.length >= Math.floor(rel / SEG_LEN));
      const seg = segmentAt(car.z);
      const p = project(car.offset * ROAD_W, seg.y, position + rel, playerX * ROAD_W, camY, position);
      void row;
      const cw = p.w * 0.34;
      const chh = cw * 0.62;
      if (p.y > height || cw < 2) continue;
      drawCar(p.x + carCurveShift(rel), p.y, cw, chh, `hsl(${car.hue} 70% 55%)`);
    }

    // Player car.
    const bounce = reducedMotion ? 0 : Math.sin(time * 22) * clamp(speed / MAX_SPEED, 0, 1) * 1.6;
    const tilt = steer * clamp(speed / MAX_SPEED, 0, 1);
    drawPlayerCar(width / 2, height - 34 + bounce, Math.min(width * 0.16, 92), tilt);

    // HUD: speed.
    const kmh = Math.round((speed / MAX_SPEED) * 320);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(ctx, width - 118, 12, 106, 34, 8);
    ctx.fill();
    ctx.fillStyle = kmh > 280 ? pal.gold : pal.fg;
    ctx.font = "bold 16px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${kmh} km/h`, width - 22, 34);
    ctx.textAlign = "left";

    if (!alive) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = pal.fg;
      ctx.textAlign = "center";
      ctx.font = "bold 26px ui-sans-serif, sans-serif";
      ctx.fillText("CRASHED", width / 2, height / 2 - 10);
      ctx.font = "14px ui-sans-serif, sans-serif";
      ctx.fillStyle = pal.muted;
      ctx.fillText("Tap or press R to race again", width / 2, height / 2 + 18);
      ctx.textAlign = "left";
    }

    // Simple crash shake.
    if (crashTimer > 0) crashTimer--;
  }

  /** Shift distant cars sideways with the accumulated curve so they follow the road. */
  function carCurveShift(rel: number): number {
    let shift = 0;
    let dxc = 0;
    const start = Math.floor(position / SEG_LEN);
    const end = Math.floor((position + rel) / SEG_LEN);
    for (let i = start; i < end; i++) {
      dxc += segments[i % segments.length].curve;
      shift += dxc;
    }
    return (-shift * width) / 480 / 26;
  }

  function trap(x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x1 + w1, y1);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x2 - w2, y2);
    ctx.closePath();
    ctx.fill();
  }

  function drawCar(cx: number, cy: number, w: number, h: number, color: string) {
    ctx.fillStyle = color;
    roundRect(ctx, cx - w / 2, cy - h, w, h * 0.8, Math.min(6, w * 0.14));
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    roundRect(ctx, cx - w * 0.3, cy - h * 0.95, w * 0.6, h * 0.34, Math.min(4, w * 0.1));
    ctx.fill();
    ctx.fillStyle = "#0b0a12";
    ctx.fillRect(cx - w * 0.46, cy - h * 0.24, w * 0.2, h * 0.24);
    ctx.fillRect(cx + w * 0.26, cy - h * 0.24, w * 0.2, h * 0.24);
  }

  function drawPlayerCar(cx: number, cy: number, w: number, tilt: number) {
    const h = w * 0.52;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt * 0.08);
    // Body.
    const body = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    body.addColorStop(0, "#7a3dff");
    body.addColorStop(0.5, "#a78bfa");
    body.addColorStop(1, "#7a3dff");
    ctx.fillStyle = body;
    roundRect(ctx, -w / 2, -h, w, h * 0.82, 8);
    ctx.fill();
    // Cabin.
    ctx.fillStyle = "rgba(15,23,42,0.9)";
    roundRect(ctx, -w * 0.28, -h * 0.98, w * 0.56, h * 0.4, 6);
    ctx.fill();
    // Tail lights.
    ctx.fillStyle = "#f87171";
    ctx.fillRect(-w * 0.42, -h * 0.34, w * 0.18, h * 0.12);
    ctx.fillRect(w * 0.24, -h * 0.34, w * 0.18, h * 0.12);
    // Tyres.
    ctx.fillStyle = "#0b0a12";
    ctx.fillRect(-w * 0.52, -h * 0.26, w * 0.16, h * 0.3);
    ctx.fillRect(w * 0.36, -h * 0.26, w * 0.16, h * 0.3);
    ctx.restore();
  }

  // ── Input ──────────────────────────────────────────────────────────

  let leftHeld = false;
  let rightHeld = false;
  const applySteer = () => {
    steer = (leftHeld ? -1 : 0) + (rightHeld ? 1 : 0);
  };

  const kd = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") {
      leftHeld = true;
      applySteer();
      e.preventDefault();
    } else if (k === "arrowright" || k === "d") {
      rightHeld = true;
      applySteer();
      e.preventDefault();
    } else if (k === "r") {
      reset();
    }
  };
  const ku = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") leftHeld = false;
    if (k === "arrowright" || k === "d") rightHeld = false;
    applySteer();
  };
  // Touch: hold left/right half of the canvas to steer; tap restarts a crash.
  const pd = (e: PointerEvent) => {
    if (!alive) {
      reset();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const side = e.clientX - rect.left < rect.width / 2;
    if (side) leftHeld = true;
    else rightHeld = true;
    applySteer();
  };
  const pu = () => {
    leftHeld = false;
    rightHeld = false;
    applySteer();
  };

  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  canvas.addEventListener("pointerdown", pd);
  window.addEventListener("pointerup", pu);
  canvas.addEventListener("pointercancel", pu);

  reset();
  const loop = createLoop(update, render);

  return {
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    restart: () => reset(),
    destroy: () => {
      loop.stop();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointerup", pu);
      canvas.removeEventListener("pointercancel", pu);
    },
  };
};

export default racer;
