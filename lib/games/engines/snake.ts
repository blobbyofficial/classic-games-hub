import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette, roundRect, tune } from "../helpers";

type Point = {
  x: number;
  y: number;
};

type Direction = {
  x: number;
  y: number;
};

type FoodType = "normal" | "gold" | "slow" | "danger";

type Food = Point & {
  type: FoodType;
  age: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

type LevelConfig = {
  obstacles: Point[];
  wrap: boolean;
  speedMultiplier: number;
};

const snake: GameEngineFactory = ({
  canvas,
  width,
  height,
  onScore,
  onGameOver,
  onStatus,
  difficulty,
}) => {
  const ctx = canvas.getContext("2d")!;
  const cols = 24;
  const rows = Math.max(16, Math.round((cols * height) / width));
  const cell = width / cols;
  const pal = palette();

  const BASE = tune(difficulty, {
    easy: 5.5,
    regular: 7.5,
    hard: 10,
  });

  const CAP = tune(difficulty, {
    easy: 12,
    regular: 18,
    hard: 24,
  });

  const FOOD_INTERVAL = tune(difficulty, {
    easy: 7.5,
    regular: 6,
    hard: 4.5,
  });

  let body: Point[] = [];
  let dir: Direction = { x: 1, y: 0 };
  let inputQueue: Direction[] = [];

  let food: Food = {
    x: 0,
    y: 0,
    type: "normal",
    age: 0,
  };

  let score = 0;
  let speed = BASE;
  let level = 1;
  let foodEaten = 0;
  let combo = 0;
  let comboTimer = 0;

  let alive = true;
  let started = false;

  let acc = 0;
  let foodTimer = 0;
  let levelFlash = 0;
  let deathFlash = 0;

  const particles: Particle[] = [];

  const directions: Direction[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  function samePoint(a: Point, b: Point) {
    return a.x === b.x && a.y === b.y;
  }

  function sameDirection(a: Direction, b: Direction) {
    return a.x === b.x && a.y === b.y;
  }

  function getLevelConfig(currentLevel: number): LevelConfig {
    const obstacles: Point[] = [];
    const wrap = currentLevel < 4;

    // Level 1: classic open Snake.
    if (currentLevel === 1) {
      return {
        obstacles,
        wrap: true,
        speedMultiplier: 1,
      };
    }

    // Level 2: small central block.
    if (currentLevel === 2) {
      const cx = Math.floor(cols / 2);
      const cy = Math.floor(rows / 2);

      for (let x = cx - 2; x <= cx + 2; x++) {
        if (x !== cx) obstacles.push({ x, y: cy });
      }

      return {
        obstacles,
        wrap: true,
        speedMultiplier: 1.08,
      };
    }

    // Level 3: two horizontal barriers.
    if (currentLevel === 3) {
      const cx = Math.floor(cols / 2);

      for (let x = 4; x < cols - 4; x++) {
        if (Math.abs(x - cx) > 1) {
          obstacles.push({ x, y: Math.floor(rows * 0.34) });
          obstacles.push({ x, y: Math.floor(rows * 0.66) });
        }
      }

      return {
        obstacles,
        wrap: true,
        speedMultiplier: 1.15,
      };
    }

    // Level 4: boxed-in centre.
    if (currentLevel === 4) {
      const left = 6;
      const right = cols - 7;
      const top = 4;
      const bottom = rows - 5;

      for (let x = left; x <= right; x++) {
        obstacles.push({ x, y: top });
        obstacles.push({ x, y: bottom });
      }

      for (let y = top + 1; y < bottom; y++) {
        obstacles.push({ x: left, y });
        obstacles.push({ x: right, y });
      }

      return {
        obstacles,
        wrap: false,
        speedMultiplier: 1.2,
      };
    }

    // Level 5+: alternating corridor layout.
    const spacing = Math.max(3, Math.floor(rows / 5));
    const wallRows = [
      Math.floor(rows * 0.22),
      Math.floor(rows * 0.5),
      Math.floor(rows * 0.78),
    ];

    wallRows.forEach((y, index) => {
      const gapStart =
        index % 2 === 0
          ? Math.floor(cols * 0.68)
          : Math.floor(cols * 0.32);

      for (let x = 2; x < cols - 2; x++) {
        if (Math.abs(x - gapStart) > spacing) {
          obstacles.push({ x, y });
        }
      }
    });

    return {
      obstacles,
      wrap: false,
      speedMultiplier: Math.min(1.75, 1.2 + (currentLevel - 5) * 0.04),
    };
  }

  function currentLevelConfig() {
    return getLevelConfig(level);
  }

  function isObstacle(point: Point) {
    return currentLevelConfig().obstacles.some((o) => samePoint(o, point));
  }

  function isOccupied(point: Point) {
    return (
      body.some((segment) => samePoint(segment, point)) ||
      isObstacle(point)
    );
  }

  function randomEmptyCell(): Point {
    const maxAttempts = cols * rows * 2;

    for (let i = 0; i < maxAttempts; i++) {
      const point = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows),
      };

      if (!isOccupied(point)) return point;
    }

    // Fallback search in the unlikely event the board is very full.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const point = { x, y };

        if (!isOccupied(point)) {
          return point;
        }
      }
    }

    return {
      x: Math.floor(cols / 2),
      y: Math.floor(rows / 2),
    };
  }

  function chooseFoodType(): FoodType {
    const roll = Math.random();

    // Special food stays uncommon so normal Snake remains the core game.
    if (roll < 0.08) return "gold";
    if (roll < 0.14) return "slow";
    if (roll < 0.19) return "danger";

    return "normal";
  }

  function placeFood(type?: FoodType) {
    const point = randomEmptyCell();

    food = {
      ...point,
      type: type ?? chooseFoodType(),
      age: 0,
    };

    foodTimer = FOOD_INTERVAL;
  }

  function createParticles(
    point: Point,
    count: number,
    spread = 2.8,
    size = 2.5,
  ) {
    const centerX = point.x * cell + cell / 2;
    const centerY = point.y * cell + cell / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 0.4 + Math.random() * spread;

      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.35 + Math.random() * 0.4,
        size: size * (0.65 + Math.random() * 0.7),
      });
    }
  }

  function reset() {
    body = [
      { x: 6, y: Math.floor(rows / 2) },
      { x: 5, y: Math.floor(rows / 2) },
      { x: 4, y: Math.floor(rows / 2) },
    ];

    level = 1;
    foodEaten = 0;
    combo = 0;
    comboTimer = 0;

    dir = { x: 1, y: 0 };
    inputQueue = [];

    score = 0;
    speed = BASE;

    alive = true;
    started = false;

    acc = 0;
    foodTimer = FOOD_INTERVAL;
    levelFlash = 0;
    deathFlash = 0;

    particles.length = 0;

    placeFood("normal");

    onScore(0);
    onStatus?.("Press an arrow key or swipe to start");
  }

  function queueTurn(next: Direction) {
    const lastDirection =
      inputQueue.length > 0
        ? inputQueue[inputQueue.length - 1]
        : dir;

    if (sameDirection(next, lastDirection)) return;

    // Prevent reversing, including queued reversals.
    if (
      next.x === -lastDirection.x &&
      next.y === -lastDirection.y
    ) {
      return;
    }

    // Keep a small queue so fast keyboard input feels responsive,
    // while avoiding a giant backlog of turns.
    if (inputQueue.length >= 2) return;

    inputQueue.push(next);

    if (!started) {
      started = true;
      onStatus?.("");
    }
  }

  function getNextDirection(): Direction {
    if (inputQueue.length === 0) {
      return dir;
    }

    const next = inputQueue.shift()!;

    // A second safety check against reversing relative to
    // the direction that is actually currently active.
    if (
      next.x === -dir.x &&
      next.y === -dir.y
    ) {
      return dir;
    }

    return next;
  }

  function getHeadAfterMove(): Point | null {
    const config = currentLevelConfig();
    const raw = {
      x: body[0].x + dir.x,
      y: body[0].y + dir.y,
    };

    if (config.wrap) {
      return {
        x: (raw.x + cols) % cols,
        y: (raw.y + rows) % rows,
      };
    }

    if (
      raw.x < 0 ||
      raw.x >= cols ||
      raw.y < 0 ||
      raw.y >= rows
    ) {
      return null;
    }

    return raw;
  }

  function willHitSelf(head: Point) {
    // The tail can move away on a non-food step, so permit moving
    // into the current tail cell in that situation.
    const eating = samePoint(head, food);

    const checkLength = eating
      ? body.length
      : Math.max(0, body.length - 1);

    for (let i = 0; i < checkLength; i++) {
      if (samePoint(body[i], head)) return true;
    }

    return false;
  }

  function triggerGameOver() {
    alive = false;
    deathFlash = 1;

    createParticles(body[0], 24, 4.5, 3.2);

    beep(120, 0.12, "sawtooth");
    window.setTimeout(() => beep(82, 0.18, "square"), 45);

    onStatus?.("Game over");
    onGameOver(score, Math.round(body.length));
  }

  function advanceLevel() {
    level += 1;
    combo = Math.min(combo + 1, 5);
    comboTimer = 2.5;

    levelFlash = 1;

    const config = currentLevelConfig();

    speed = Math.min(
      CAP,
      Math.max(
        BASE,
        BASE +
          Math.max(0, level - 1) * 0.55 * config.speedMultiplier,
      ),
    );

    createParticles(
      body[0],
      20,
      3.8,
      2.4,
    );

    beep(520, 0.08, "square");
    window.setTimeout(() => beep(780, 0.1, "square"), 55);

    onStatus?.(`Level ${level}`);
    window.setTimeout(() => {
      if (alive) onStatus?.("");
    }, 700);

    // If the newly generated arena contains the snake, rebuild it
    // into a safe starting corridor.
    if (body.some((segment) => isObstacle(segment))) {
      const startY = Math.floor(rows / 2);
      const startX = Math.max(4, Math.floor(cols * 0.25));

      body = [
        { x: startX + 2, y: startY },
        { x: startX + 1, y: startY },
        { x: startX, y: startY },
      ];

      dir = { x: 1, y: 0 };
      inputQueue = [];
    }

    placeFood();
  }

  function consumeFood() {
    const foodPoint = { x: food.x, y: food.y };

    switch (food.type) {
      case "gold": {
        const multiplier = Math.min(5, Math.max(1, combo + 1));
        const gained = 30 * multiplier;

        score += gained;
        body.unshift({
          x: body[0].x,
          y: body[0].y,
        });

        createParticles(foodPoint, 18, 3.5, 2.8);

        beep(820, 0.07, "square");
        window.setTimeout(() => beep(1040, 0.07, "square"), 35);

        break;
      }

      case "slow": {
        score += 15;

        body.unshift({
          x: body[0].x,
          y: body[0].y,
        });

        speed = Math.max(BASE * 0.8, speed * 0.72);

        createParticles(foodPoint, 16, 2.8, 2.4);

        beep(440, 0.1, "sine");

        break;
      }

      case "danger": {
        score += 40;

        body.unshift({
          x: body[0].x,
          y: body[0].y,
        });

        speed = Math.min(
          CAP,
          Math.max(BASE, speed * 1.18),
        );

        createParticles(foodPoint, 22, 4.2, 3);

        beep(960, 0.05, "sawtooth");
        window.setTimeout(
          () => beep(1220, 0.06, "sawtooth"),
          35,
        );

        break;
      }

      default: {
        const comboMultiplier = Math.min(
          4,
          Math.max(1, combo + 1),
        );

        score += 10 * comboMultiplier;

        body.unshift({
          x: body[0].x,
          y: body[0].y,
        });

        createParticles(foodPoint, 10, 2.4, 2);

        beep(
          600 + comboMultiplier * 45,
          0.055,
          "square",
        );

        break;
      }
    }

    foodEaten += 1;
    combo = Math.min(combo + 1, 4);
    comboTimer = 2.2;

    onScore(score);

    // Every 8 pieces of food moves the player into a new stage.
    if (foodEaten % 8 === 0) {
      advanceLevel();
      return;
    }

    // Normal speed increases gradually.
    const config = currentLevelConfig();

    speed = Math.min(
      CAP,
      BASE +
        (foodEaten * 0.12 + Math.max(0, level - 1) * 0.5) *
          config.speedMultiplier,
    );

    placeFood();
  }

  function step() {
    if (!alive || !started) return;

    dir = getNextDirection();

    const nextHead = getHeadAfterMove();

    if (!nextHead) {
      triggerGameOver();
      return;
    }

    if (isObstacle(nextHead) || willHitSelf(nextHead)) {
      triggerGameOver();
      return;
    }

    body.unshift(nextHead);

    if (samePoint(nextHead, food)) {
      consumeFood();
    } else {
      body.pop();
    }
  }

  function updateParticles(dt: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.life -= dt;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);

      p.vy += 0.04 * dt * 60;
    }
  }

  function update(dt: number) {
    updateParticles(dt);

    food.age += dt;

    if (levelFlash > 0) {
      levelFlash = Math.max(0, levelFlash - dt * 2.5);
    }

    if (deathFlash > 0) {
      deathFlash = Math.max(0, deathFlash - dt * 3);
    }

    if (comboTimer > 0) {
      comboTimer -= dt;

      if (comboTimer <= 0) {
        comboTimer = 0;
        combo = 0;
      }
    }

    if (!started || !alive) {
      return;
    }

    // Special food naturally expires and becomes normal food.
    foodTimer -= dt;

    if (
      food.type !== "normal" &&
      foodTimer <= 0
    ) {
      placeFood("normal");
    }

    acc += dt;

    const interval = 1 / Math.max(1, speed);

    while (acc >= interval) {
      step();
      acc -= interval;

      if (!alive) break;
    }
  }

  function getFoodColor(type: FoodType) {
    if (type === "gold") return "#ffd84d";
    if (type === "slow") return "#66d9ff";
    if (type === "danger") return "#ff6b6b";
    return pal.accent;
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= cols; x++) {
      const px = x * cell;

      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }

    for (let y = 0; y <= rows; y++) {
      const py = y * cell;

      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
    }
  }

  function drawObstacles() {
    const config = currentLevelConfig();

    for (const obstacle of config.obstacles) {
      const x = obstacle.x * cell + 1;
      const y = obstacle.y * cell + 1;
      const size = cell - 2;

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(
        ctx,
        x,
        y,
        size,
        size,
        Math.min(5, cell * 0.18),
      );
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.stroke();
    }
  }

  function drawFood() {
    const centerX = food.x * cell + cell / 2;
    const centerY = food.y * cell + cell / 2;

    const pulse =
      1 +
      Math.sin(food.age * 7) *
        (food.type === "normal" ? 0.06 : 0.12);

    const size =
      (cell - 7) *
      pulse;

    const x = centerX - size / 2;
    const y = centerY - size / 2;

    const foodColor = getFoodColor(food.type);

    ctx.save();

    ctx.fillStyle = foodColor;
    ctx.shadowColor = foodColor;
    ctx.shadowBlur =
      food.type === "normal"
        ? 10
        : 16;

    roundRect(
      ctx,
      x,
      y,
      size,
      size,
      Math.min(6, cell * 0.2),
    );

    ctx.fill();

    // Give special food a simple visual symbol.
    if (food.type !== "normal") {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.38)";

      ctx.font = `${Math.max(9, cell * 0.42)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const symbol =
        food.type === "gold"
          ? "★"
          : food.type === "slow"
            ? "↓"
            : "!";

      ctx.fillText(
        symbol,
        centerX,
        centerY + 0.5,
      );
    }

    ctx.restore();
  }

  function drawSnake() {
    for (let i = body.length - 1; i >= 0; i--) {
      const segment = body[i];

      const t =
        body.length <= 1
          ? 1
          : 1 - i / (body.length - 1);

      const x = segment.x * cell + 1.5;
      const y = segment.y * cell + 1.5;
      const size = cell - 3;

      const isHead = i === 0;

      ctx.save();

      if (isHead) {
        ctx.fillStyle = pal.neon;
        ctx.shadowColor = pal.neon;
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle =
          `color-mix(in oklch, ${pal.primary}, ${pal.neon} ${Math.round(t * 40)}%)`;
      }

      roundRect(
        ctx,
        x,
        y,
        size,
        size,
        Math.min(5, cell * 0.2),
      );

      ctx.fill();

      ctx.restore();

      if (!isHead) continue;

      drawEyes(
        x,
        y,
        size,
      );
    }
  }

  function drawEyes(
    x: number,
    y: number,
    size: number,
  ) {
    const eyeRadius = Math.max(1.4, cell * 0.075);

    let forwardX = 0;
    let forwardY = 0;
    let sideX = 0;
    let sideY = 0;

    if (dir.x !== 0) {
      forwardX = dir.x * size * 0.22;
      forwardY = 0;
      sideX = 0;
      sideY = size * 0.18;
    } else {
      forwardX = 0;
      forwardY = dir.y * size * 0.22;
      sideX = size * 0.18;
      sideY = 0;
    }

    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(
      cx + forwardX + sideX,
      cy + forwardY + sideY,
      eyeRadius,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      cx + forwardX - sideX,
      cy + forwardY - sideY,
      eyeRadius,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.75)";

    ctx.beginPath();
    ctx.arc(
      cx + forwardX + sideX + dir.x * eyeRadius * 0.35,
      cy + forwardY + sideY + dir.y * eyeRadius * 0.35,
      eyeRadius * 0.52,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      cx + forwardX - sideX + dir.x * eyeRadius * 0.35,
      cy + forwardY - sideY + dir.y * eyeRadius * 0.35,
      eyeRadius * 0.52,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(
        0,
        p.life / p.maxLife,
      );

      ctx.fillStyle =
        `rgba(255,255,255,${alpha * 0.9})`;

      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        p.size * alpha,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  function drawLevelFlash() {
    if (levelFlash <= 0) return;

    ctx.save();

    ctx.globalAlpha = levelFlash * 0.15;
    ctx.fillStyle = pal.neon;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = levelFlash * 0.8;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(18, width * 0.045)}px sans-serif`;

    ctx.fillText(
      `LEVEL ${level}`,
      width / 2,
      height / 2,
    );

    ctx.restore();
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);

    drawGrid();
    drawObstacles();
    drawFood();
    drawSnake();
    drawParticles();
    drawLevelFlash();

    if (deathFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255,70,70,${deathFlash * 0.12})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Small, unobtrusive level indicator.
    // The catalogue itself still owns score/high-score presentation.
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `${Math.max(9, cell * 0.34)}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
      `LV ${level}`,
      7,
      6,
    );

    if (combo > 1 && comboTimer > 0) {
      ctx.textAlign = "right";
      ctx.fillStyle = pal.neon;
      ctx.fillText(
        `×${combo}`,
        width - 7,
        6,
      );
    }

    ctx.restore();
  }

  function onKey(e: KeyboardEvent) {
    const key = e.key.toLowerCase();

    if (
      key === "arrowup" ||
      key === "w"
    ) {
      queueTurn({ x: 0, y: -1 });
      e.preventDefault();
      return;
    }

    if (
      key === "arrowdown" ||
      key === "s"
    ) {
      queueTurn({ x: 0, y: 1 });
      e.preventDefault();
      return;
    }

    if (
      key === "arrowleft" ||
      key === "a"
    ) {
      queueTurn({ x: -1, y: 0 });
      e.preventDefault();
      return;
    }

    if (
      key === "arrowright" ||
      key === "d"
    ) {
      queueTurn({ x: 1, y: 0 });
      e.preventDefault();
      return;
    }

    if (
      key === "r" &&
      !alive
    ) {
      reset();
      e.preventDefault();
    }
  }

  let touchStart: Point | null = null;

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0];

    touchStart = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function onTouchMove(e: TouchEvent) {
    if (!touchStart) return;

    const touch = e.touches[0];

    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;

    if (
      Math.abs(dx) < 24 &&
      Math.abs(dy) < 24
    ) {
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      queueTurn({
        x: Math.sign(dx),
        y: 0,
      });
    } else {
      queueTurn({
        x: 0,
        y: Math.sign(dy),
      });
    }

    touchStart = null;
    e.preventDefault();
  }

  window.addEventListener(
    "keydown",
    onKey,
  );

  canvas.addEventListener(
    "touchstart",
    onTouchStart,
    { passive: false },
  );

  canvas.addEventListener(
    "touchmove",
    onTouchMove,
    { passive: false },
  );

  reset();

  const loop = createLoop(
    update,
    render,
  );

  return {
    pause: () => loop.pause(),

    resume: () => loop.resume(),

    restart: () => reset(),

    destroy: () => {
      loop.stop();

      window.removeEventListener(
        "keydown",
        onKey,
      );

      canvas.removeEventListener(
        "touchstart",
        onTouchStart,
      );

      canvas.removeEventListener(
        "touchmove",
        onTouchMove,
      );
    },
  };
};

export default snake;
