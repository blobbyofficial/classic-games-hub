import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette, roundRect, tune } from "../helpers";

type Point = {
  x: number;
  y: number;
};

type SnakeSkin = {
  primary: string;
  secondary: string;
  glow: string;
};

type Pellet = {
  x: number;
  y: number;
  value: number;
  radius: number;
  hue: number;
  phase: number;
};

type TrailPoint = {
  x: number;
  y: number;
};

type AISnake = {
  id: number;
  body: TrailPoint[];
  length: number;
  targetAngle: number;
  angle: number;
  speed: number;
  baseSpeed: number;
  turnSpeed: number;
  boostTimer: number;
  thinkTimer: number;
  state: "wander" | "food" | "intercept" | "escape";
  aggression: number;
  score: number;
  skin: SnakeSkin;
  alive: boolean;
  respawnTimer: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
};

const slithery: GameEngineFactory = ({
  canvas,
  width,
  height,
  onScore,
  onGameOver,
  onStatus,
  difficulty,
}) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();

  const WORLD_SIZE = tune(difficulty, {
    easy: 5200,
    regular: 5800,
    hard: 6400,
  });

  const PLAYER_START_LENGTH = tune(difficulty, {
    easy: 26,
    regular: 22,
    hard: 18,
  });

  const AI_COUNT = tune(difficulty, {
    easy: 7,
    regular: 9,
    hard: 11,
  });

  const BASE_SPEED = tune(difficulty, {
    easy: 205,
    regular: 220,
    hard: 238,
  });

  const BOOST_SPEED = tune(difficulty, {
    easy: 355,
    regular: 375,
    hard: 400,
  });

  const PLAYER_TURN_SPEED = 7.2;

  const BODY_SPACING = 12;
  const BODY_RADIUS = 8.5;

  const INITIAL_PELLETS = tune(difficulty, {
    easy: 650,
    regular: 600,
    hard: 560,
  });

  const MAX_PELLETS = 1100;

  const CAMERA_BASE_ZOOM = 0.94;
  const CAMERA_MIN_ZOOM = 0.58;

  const skins: SnakeSkin[] = [
    {
      primary: pal.neon,
      secondary: pal.primary,
      glow: pal.neon,
    },
    {
      primary: "#55d8ff",
      secondary: "#2e7dff",
      glow: "#55d8ff",
    },
    {
      primary: "#ff6f91",
      secondary: "#ff3d67",
      glow: "#ff6f91",
    },
    {
      primary: "#b56cff",
      secondary: "#6f32ff",
      glow: "#b56cff",
    },
    {
      primary: "#ffd84d",
      secondary: "#ff9f1c",
      glow: "#ffd84d",
    },
    {
      primary: "#5effa0",
      secondary: "#10bc68",
      glow: "#5effa0",
    },
  ];

  let playerBody: TrailPoint[] = [];
  let playerLength = PLAYER_START_LENGTH;
  let playerScore = 0;

  let playerX = WORLD_SIZE / 2;
  let playerY = WORLD_SIZE / 2;
  let playerAngle = 0;

  let mouseWorld = {
    x: WORLD_SIZE / 2 + 200,
    y: WORLD_SIZE / 2,
  };

  let boosting = false;
  let started = false;
  let alive = true;

  let cameraX = WORLD_SIZE / 2;
  let cameraY = WORLD_SIZE / 2;

  let particles: Particle[] = [];
  let pellets: Pellet[] = [];
  let aiSnakes: AISnake[] = [];

  let pelletSpawnTimer = 0;
  let particleTimer = 0;
  let respawnSeed = 1000;

  const keys = new Set<string>();

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  function distanceSquared(
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function normalizeAngle(angle: number) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function rotateToward(
    current: number,
    target: number,
    maxDelta: number,
  ) {
    const delta = normalizeAngle(target - current);

    if (Math.abs(delta) <= maxDelta) {
      return target;
    }

    return current + Math.sign(delta) * maxDelta;
  }

  function randomRange(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  function randomPoint(margin = 250): Point {
    return {
      x: randomRange(margin, WORLD_SIZE - margin),
      y: randomRange(margin, WORLD_SIZE - margin),
    };
  }

  function pointFromAngle(x: number, y: number, angle: number, distance: number) {
    return {
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
    };
  }

  function addParticleBurst(
    x: number,
    y: number,
    amount: number,
    hue: number,
    speed = 80,
  ) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = randomRange(speed * 0.35, speed);

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: randomRange(0.35, 0.75),
        maxLife: randomRange(0.35, 0.75),
        size: randomRange(2, 4.5),
        hue,
      });
    }

    if (particles.length > 900) {
      particles.splice(0, particles.length - 900);
    }
  }

  function spawnPellet(
    x = randomRange(120, WORLD_SIZE - 120),
    y = randomRange(120, WORLD_SIZE - 120),
    value = 1 + Math.floor(Math.random() * 3),
  ) {
    const hue =
      Math.random() < 0.68
        ? randomRange(160, 220)
        : randomRange(35, 340);

    pellets.push({
      x,
      y,
      value,
      radius:
        value >= 8
          ? 8
          : value >= 4
            ? 6
            : 4 + Math.random() * 1.5,
      hue,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function generateStartingPellets() {
    pellets = [];

    for (let i = 0; i < INITIAL_PELLETS; i++) {
      spawnPellet();
    }

    // A few richer food clusters.
    for (let i = 0; i < 45; i++) {
      const center = randomPoint(400);

      for (let j = 0; j < 4 + Math.floor(Math.random() * 7); j++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = randomRange(18, 90);

        spawnPellet(
          center.x + Math.cos(angle) * radius,
          center.y + Math.sin(angle) * radius,
          Math.random() < 0.2 ? 8 : 3,
        );
      }
    }
  }

  function buildBody(
    x: number,
    y: number,
    angle: number,
    length: number,
  ) {
    const points: TrailPoint[] = [];

    for (let i = 0; i < length; i++) {
      points.push({
        x: x - Math.cos(angle) * i * BODY_SPACING,
        y: y - Math.sin(angle) * i * BODY_SPACING,
      });
    }

    return points;
  }

  function getBodyEnd(body: TrailPoint[]) {
    return body[body.length - 1] ?? body[0];
  }

  function spawnAISnake(id: number, index: number) {
    const point = randomPoint(500);
    const angle = Math.random() * Math.PI * 2;

    const startLength =
      18 +
      Math.floor(Math.random() * 28) +
      (index % 4 === 0 ? 22 : 0);

    const aggression =
      difficulty === "hard"
        ? randomRange(0.45, 1)
        : difficulty === "regular"
          ? randomRange(0.25, 0.9)
          : randomRange(0.1, 0.7);

    const skin = skins[
      1 + (index % Math.max(1, skins.length - 1))
    ];

    const baseSpeed =
      BASE_SPEED *
      randomRange(0.78, 1.03);

    aiSnakes.push({
      id,
      body: buildBody(
        point.x,
        point.y,
        angle,
        startLength,
      ),
      length: startLength,
      targetAngle: angle,
      angle,
      speed: baseSpeed,
      baseSpeed,
      turnSpeed: randomRange(2.6, 4.2),
      boostTimer: 0,
      thinkTimer: randomRange(0.3, 1.4),
      state: "wander",
      aggression,
      score: startLength * 4,
      skin,
      alive: true,
      respawnTimer: 0,
    });
  }

  function buildAI() {
    aiSnakes = [];

    for (let i = 0; i < AI_COUNT; i++) {
      spawnAISnake(i + 1, i);
    }
  }

  function resetPlayer() {
    playerX = WORLD_SIZE / 2;
    playerY = WORLD_SIZE / 2;
    playerAngle = 0;

    playerLength = PLAYER_START_LENGTH;
    playerScore = 0;

    playerBody = buildBody(
      playerX,
      playerY,
      playerAngle,
      playerLength,
    );

    cameraX = playerX;
    cameraY = playerY;

    mouseWorld = {
      x: playerX + 300,
      y: playerY,
    };

    boosting = false;
    started = false;
    alive = true;

    pellets = [];
    particles = [];

    pelletSpawnTimer = 0;
    particleTimer = 0;
  }

  function reset() {
    resetPlayer();
    generateStartingPellets();
    buildAI();

    onScore(0);
    onStatus?.("Move to start • Hold to boost");
  }

  function canvasToWorld(
    clientX: number,
    clientY: number,
  ) {
    const rect = canvas.getBoundingClientRect();

    const sx =
      ((clientX - rect.left) / rect.width) *
      width;

    const sy =
      ((clientY - rect.top) / rect.height) *
      height;

    const zoom = getCameraZoom();

    return {
      x:
        cameraX +
        (sx - width / 2) / zoom,
      y:
        cameraY +
        (sy - height / 2) / zoom,
    };
  }

  function getCameraZoom() {
    const growth =
      clamp(
        (playerLength - PLAYER_START_LENGTH) /
          260,
        0,
        1,
      );

    return lerp(
      CAMERA_BASE_ZOOM,
      CAMERA_MIN_ZOOM,
      growth,
    );
  }

  function getMouseAngle() {
    return Math.atan2(
      mouseWorld.y - playerY,
      mouseWorld.x - playerX,
    );
  }

  function isWithinWorld(x: number, y: number, margin = 0) {
    return (
      x >= margin &&
      y >= margin &&
      x <= WORLD_SIZE - margin &&
      y <= WORLD_SIZE - margin
    );
  }

  function spawnDropFood(
    x: number,
    y: number,
    amount: number,
  ) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = randomRange(0, 130);

      spawnPellet(
        clamp(
          x + Math.cos(angle) * distance,
          80,
          WORLD_SIZE - 80,
        ),
        clamp(
          y + Math.sin(angle) * distance,
          80,
          WORLD_SIZE - 80,
        ),
        Math.random() < 0.65
          ? 2
          : Math.random() < 0.85
            ? 4
            : 8,
      );
    }
  }

  function killSnakeBody(
    body: TrailPoint[],
    scoreValue: number,
    hue: number,
  ) {
    if (body.length === 0) return;

    const step = Math.max(
      1,
      Math.floor(body.length / 42),
    );

    for (let i = 0; i < body.length; i += step) {
      const point = body[i];
      spawnPellet(
        point.x + randomRange(-5, 5),
        point.y + randomRange(-5, 5),
        Math.max(
          2,
          Math.floor(scoreValue / Math.max(1, body.length / step)),
        ),
      );
    }

    const head = body[0];

    if (head) {
      addParticleBurst(
        head.x,
        head.y,
        45,
        hue,
        170,
      );
    }
  }

  function collectPellets(
    x: number,
    y: number,
    radius: number,
    onCollect: (pellet: Pellet) => void,
  ) {
    const radiusSquared = radius * radius;

    for (let i = pellets.length - 1; i >= 0; i--) {
      const pellet = pellets[i];

      if (
        distanceSquared(
          x,
          y,
          pellet.x,
          pellet.y,
        ) <=
        (radius + pellet.radius) *
          (radius + pellet.radius)
      ) {
        pellets.splice(i, 1);
        onCollect(pellet);
      }
    }
  }

  function addPlayerGrowth(amount: number) {
    playerLength += amount;

    const tail = getBodyEnd(playerBody);

    while (
      playerBody.length <
      Math.floor(playerLength)
    ) {
      playerBody.push({
        x: tail.x,
        y: tail.y,
      });
    }
  }

  function setPlayerStarted() {
    if (started) return;

    started = true;
    onStatus?.("");
  }

  function updatePlayer(dt: number) {
    if (!alive || !started) return;

    const targetAngle = getMouseAngle();

    playerAngle = rotateToward(
      playerAngle,
      targetAngle,
      PLAYER_TURN_SPEED * dt,
    );

    const boostAllowed =
      boosting &&
      playerLength > 14;

    const targetSpeed = boostAllowed
      ? BOOST_SPEED
      : BASE_SPEED;

    const currentSpeed =
      lerp(
        BASE_SPEED,
        targetSpeed,
        boostAllowed ? 0.95 : 0,
      );

    if (boostAllowed) {
      playerLength -=
        7.5 * dt;

      if (playerLength < 14) {
        playerLength = 14;
        boosting = false;
      }

      playerScore = Math.max(
        0,
        playerScore - 0.08 * dt,
      );

      // Boosting leaves behind value.
      if (Math.random() < dt * 8) {
        const tail = getBodyEnd(playerBody);

        spawnPellet(
          tail.x + randomRange(-5, 5),
          tail.y + randomRange(-5, 5),
          2,
        );
      }
    }

    playerX +=
      Math.cos(playerAngle) *
      currentSpeed *
      dt;

    playerY +=
      Math.sin(playerAngle) *
      currentSpeed *
      dt;

    // The arena boundary is lethal.
    const edgeMargin = 35;

    if (
      !isWithinWorld(
        playerX,
        playerY,
        edgeMargin,
      )
    ) {
      killPlayer();
      return;
    }

    const targetBodyLength =
      Math.max(
        PLAYER_START_LENGTH,
        Math.floor(playerLength),
      );

    playerBody[0] = {
      x: playerX,
      y: playerY,
    };

    for (
      let i = 1;
      i < targetBodyLength;
      i++
    ) {
      if (!playerBody[i]) {
        playerBody[i] = {
          x: playerBody[i - 1].x,
          y: playerBody[i - 1].y,
        };
      }

      const leader = playerBody[i - 1];
      const current = playerBody[i];

      const dx = leader.x - current.x;
      const dy = leader.y - current.y;
      const distance = Math.hypot(dx, dy);

      if (distance > BODY_SPACING) {
        const move =
          (distance - BODY_SPACING) /
          Math.max(1, distance);

        current.x += dx * move;
        current.y += dy * move;
      }
    }

    playerBody.length = targetBodyLength;

    collectPellets(
      playerX,
      playerY,
      BODY_RADIUS + 5,
      (pellet) => {
        playerScore += pellet.value;

        addPlayerGrowth(
          pellet.value *
            tune(difficulty, {
              easy: 0.9,
              regular: 0.82,
              hard: 0.74,
            }),
        );

        addParticleBurst(
          pellet.x,
          pellet.y,
          pellet.value >= 8 ? 8 : 4,
          pellet.hue,
          80,
        );

        beep(
          pellet.value >= 8
            ? 850
            : 560 + pellet.value * 24,
          pellet.value >= 8 ? 0.08 : 0.045,
          pellet.value >= 8
            ? "square"
            : "sine",
        );
      },
    );

    onScore(
      Math.floor(playerScore),
    );
  }

  function getNearestPellet(
    x: number,
    y: number,
    maxDistance: number,
  ) {
    let nearest: Pellet | null = null;
    let best = maxDistance * maxDistance;

    for (const pellet of pellets) {
      const distance = distanceSquared(
        x,
        y,
        pellet.x,
        pellet.y,
      );

      if (distance < best) {
        best = distance;
        nearest = pellet;
      }
    }

    return nearest;
  }

  function getNearestSnake(
    snake: AISnake,
    maxDistance: number,
  ) {
    let nearest: {
      body: TrailPoint[];
      distance: number;
      isPlayer: boolean;
    } | null = null;

    const playerDistance = Math.sqrt(
      distanceSquared(
        snake.body[0].x,
        snake.body[0].y,
        playerX,
        playerY,
      ),
    );

    if (
      alive &&
      playerDistance < maxDistance
    ) {
      nearest = {
        body: playerBody,
        distance: playerDistance,
        isPlayer: true,
      };
    }

    for (const other of aiSnakes) {
      if (
        other === snake ||
        !other.alive ||
        other.body.length === 0
      ) {
        continue;
      }

      const distance = Math.sqrt(
        distanceSquared(
          snake.body[0].x,
          snake.body[0].y,
          other.body[0].x,
          other.body[0].y,
        ),
      );

      if (
        distance < maxDistance &&
        (!nearest ||
          distance < nearest.distance)
      ) {
        nearest = {
          body: other.body,
          distance,
          isPlayer: false,
        };
      }
    }

    return nearest;
  }

  function aiCanBoost(snake: AISnake) {
    if (snake.length < 25) {
      return false;
    }

    return Math.random() < 0.25;
  }

  function updateAI(
    snake: AISnake,
    dt: number,
  ) {
    if (!snake.alive) {
      snake.respawnTimer -= dt;

      if (snake.respawnTimer <= 0) {
        const point = randomPoint(500);

        snake.body = buildBody(
          point.x,
          point.y,
          Math.random() * Math.PI * 2,
          18 + Math.floor(Math.random() * 12),
        );

        snake.length = snake.body.length;
        snake.score = snake.length * 4;
        snake.angle = Math.random() * Math.PI * 2;
        snake.targetAngle = snake.angle;
        snake.speed = snake.baseSpeed;
        snake.state = "wander";
        snake.alive = true;
      }

      return;
    }

    if (snake.body.length === 0) {
      snake.alive = false;
      snake.respawnTimer = 3;
      return;
    }

    snake.thinkTimer -= dt;

    if (snake.thinkTimer <= 0) {
      snake.thinkTimer = randomRange(
        0.35,
        1.1,
      );

      const head = snake.body[0];

      const nearestFood = getNearestPellet(
        head.x,
        head.y,
        600,
      );

      const nearbySnake = getNearestSnake(
        snake,
        800,
      );

      const playerDistance = alive
        ? Math.sqrt(
            distanceSquared(
              head.x,
              head.y,
              playerX,
              playerY,
            ),
          )
        : Infinity;

      // Avoid the arena boundary.
      const boundaryMargin = 520;

      if (
        head.x < boundaryMargin ||
        head.x > WORLD_SIZE - boundaryMargin ||
        head.y < boundaryMargin ||
        head.y > WORLD_SIZE - boundaryMargin
      ) {
        const centreAngle = Math.atan2(
          WORLD_SIZE / 2 - head.y,
          WORLD_SIZE / 2 - head.x,
        );

        snake.targetAngle = centreAngle;
        snake.state = "escape";
      } else if (
        playerDistance < 420 &&
        alive &&
        snake.aggression > 0.6 &&
        playerLength < snake.length * 1.2
      ) {
        snake.state = "intercept";

        const lead = 160;

        const predictedX =
          playerX +
          Math.cos(playerAngle) * lead;

        const predictedY =
          playerY +
          Math.sin(playerAngle) * lead;

        snake.targetAngle = Math.atan2(
          predictedY - head.y,
          predictedX - head.x,
        );
      } else if (
        nearbySnake &&
        nearbySnake.distance < 260
      ) {
        if (
          nearbySnake.isPlayer &&
          playerLength > snake.length * 1.25
        ) {
          const escapeAngle = Math.atan2(
            head.y - playerY,
            head.x - playerX,
          );

          snake.targetAngle = escapeAngle;
          snake.state = "escape";
        } else if (
          snake.aggression > 0.5
        ) {
          const target = nearbySnake.body[0];

          snake.targetAngle = Math.atan2(
            target.y - head.y,
            target.x - head.x,
          );

          snake.state = "intercept";
        } else if (nearestFood) {
          snake.targetAngle = Math.atan2(
            nearestFood.y - head.y,
            nearestFood.x - head.x,
          );

          snake.state = "food";
        }
      } else if (nearestFood) {
        snake.targetAngle = Math.atan2(
          nearestFood.y - head.y,
          nearestFood.x - head.x,
        );

        snake.state = "food";
      } else {
        snake.targetAngle += randomRange(
          -0.9,
          0.9,
        );

        snake.state = "wander";
      }

      // Occasionally commit to a dangerous burst.
      if (
        snake.state === "intercept" &&
        snake.aggression > 0.72 &&
        snake.boostTimer <= 0 &&
        aiCanBoost(snake)
      ) {
        snake.boostTimer = randomRange(
          0.5,
          1.25,
        );
      }
    }

    if (snake.boostTimer > 0) {
      snake.boostTimer -= dt;
      snake.speed =
        snake.baseSpeed * 1.45;

      if (
        snake.length > 20 &&
        Math.random() < dt * 5
      ) {
        snake.length -= 0.8;

        const tail = getBodyEnd(snake.body);

        spawnPellet(
          tail.x,
          tail.y,
          2,
        );
      }
    } else {
      snake.speed = lerp(
        snake.speed,
        snake.baseSpeed,
        0.08,
      );
    }

    snake.angle = rotateToward(
      snake.angle,
      snake.targetAngle,
      snake.turnSpeed * dt,
    );

    const moveX =
      Math.cos(snake.angle) *
      snake.speed *
      dt;

    const moveY =
      Math.sin(snake.angle) *
      snake.speed *
      dt;

    const head = snake.body[0];

    head.x += moveX;
    head.y += moveY;

    const margin = 40;

    if (
      !isWithinWorld(
        head.x,
        head.y,
        margin,
      )
    ) {
      // Turn back rather than immediately dying.
      const centreAngle = Math.atan2(
        WORLD_SIZE / 2 - head.y,
        WORLD_SIZE / 2 - head.x,
      );

      snake.targetAngle = centreAngle;
      snake.angle = rotateToward(
        snake.angle,
        centreAngle,
        snake.turnSpeed * dt * 1.7,
      );
    }

    const targetBodyLength =
      Math.max(
        16,
        Math.floor(snake.length),
      );

    for (
      let i = 1;
      i < targetBodyLength;
      i++
    ) {
      if (!snake.body[i]) {
        snake.body[i] = {
          x: snake.body[i - 1].x,
          y: snake.body[i - 1].y,
        };
      }

      const leader = snake.body[i - 1];
      const current = snake.body[i];

      const dx = leader.x - current.x;
      const dy = leader.y - current.y;
      const distance = Math.hypot(
        dx,
        dy,
      );

      if (distance > BODY_SPACING) {
        const move =
          (distance - BODY_SPACING) /
          Math.max(1, distance);

        current.x += dx * move;
        current.y += dy * move;
      }
    }

    snake.body.length = targetBodyLength;

    collectPellets(
      head.x,
      head.y,
      BODY_RADIUS + 4,
      (pellet) => {
        snake.score += pellet.value;
        snake.length +=
          pellet.value * 0.82;
      },
    );

    // AI-on-AI / AI-on-player collision handling is done
    // separately so collision rules are consistent.
  }

  function bodyCollision(
    headX: number,
    headY: number,
    targetBody: TrailPoint[],
    skipStart = 3,
  ) {
    for (
      let i = skipStart;
      i < targetBody.length;
      i++
    ) {
      const segment = targetBody[i];

      const dx = headX - segment.x;
      const dy = headY - segment.y;

      if (
        dx * dx + dy * dy <
        (BODY_RADIUS * 2.05) *
          (BODY_RADIUS * 2.05)
      ) {
        return true;
      }
    }

    return false;
  }

  function checkPlayerCollisions() {
    if (!alive) return;

    // Hitting yourself.
    if (
      bodyCollision(
        playerX,
        playerY,
        playerBody,
        8,
      )
    ) {
      killPlayer();
      return;
    }

    for (const snake of aiSnakes) {
      if (
        !snake.alive ||
        snake.body.length < 8
      ) {
        continue;
      }

      if (
        bodyCollision(
          playerX,
          playerY,
          snake.body,
          5,
        )
      ) {
        killPlayer();
        return;
      }
    }
  }

  function checkAICollisions() {
    for (const snake of aiSnakes) {
      if (
        !snake.alive ||
        snake.body.length < 8
      ) {
        continue;
      }

      const head = snake.body[0];

      if (
        bodyCollision(
          head.x,
          head.y,
          snake.body,
          8,
        )
      ) {
        killAI(snake);
        continue;
      }

      if (
        alive &&
        bodyCollision(
          head.x,
          head.y,
          playerBody,
          8,
        )
      ) {
        killAI(snake);
        continue;
      }

      let killedByOther = false;

      for (const other of aiSnakes) {
        if (
          other === snake ||
          !other.alive ||
          other.body.length < 8
        ) {
          continue;
        }

        if (
          bodyCollision(
            head.x,
            head.y,
            other.body,
            6,
          )
        ) {
          killAI(snake);
          killedByOther = true;
          break;
        }
      }

      if (killedByOther) continue;
    }
  }

  function killPlayer() {
    if (!alive) return;

    alive = false;
    boosting = false;

    killSnakeBody(
      playerBody,
      playerScore,
      185,
    );

    addParticleBurst(
      playerX,
      playerY,
      70,
      185,
      220,
    );

    beep(
      135,
      0.13,
      "sawtooth",
    );

    window.setTimeout(
      () =>
        beep(
          90,
          0.18,
          "square",
        ),
      55,
    );

    onStatus?.("Game over");

    onGameOver(
      Math.floor(playerScore),
      Math.max(
        1,
        Math.round(playerLength),
      ),
    );
  }

  function killAI(snake: AISnake) {
    if (!snake.alive) return;

    snake.alive = false;
    snake.respawnTimer = randomRange(
      2.5,
      5,
    );

    killSnakeBody(
      snake.body,
      snake.score,
      200,
    );

    const head = snake.body[0];

    if (head) {
      addParticleBurst(
        head.x,
        head.y,
        28,
        200,
        150,
      );
    }

    snake.body = [];
  }

  function updateParticles(dt: number) {
    for (
      let i = particles.length - 1;
      i >= 0;
      i--
    ) {
      const p = particles[i];

      p.life -= dt;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.vx *= Math.pow(
        0.055,
        dt,
      );

      p.vy *= Math.pow(
        0.055,
        dt,
      );

      p.vy += 42 * dt;
    }
  }

  function updatePellets(dt: number) {
    for (const pellet of pellets) {
      pellet.phase += dt * 2;
    }

    pelletSpawnTimer += dt;

    if (
      pelletSpawnTimer >= 0.18 &&
      pellets.length < MAX_PELLETS
    ) {
      pelletSpawnTimer = 0;

      const count =
        difficulty === "hard"
          ? 3
          : 2;

      for (let i = 0; i < count; i++) {
        spawnPellet();
      }
    }
  }

  function updateCamera(dt: number) {
    cameraX = lerp(
      cameraX,
      playerX,
      1 - Math.pow(0.0006, dt),
    );

    cameraY = lerp(
      cameraY,
      playerY,
      1 - Math.pow(0.0006, dt),
    );
  }

  function update(dt: number) {
    updateParticles(dt);
    updatePellets(dt);

    if (!started || !alive) {
      if (alive) {
        updateCamera(dt);
      }

      return;
    }

    updatePlayer(dt);

    if (!alive) {
      updateCamera(dt);
      return;
    }

    for (const snake of aiSnakes) {
      updateAI(
        snake,
        dt,
      );
    }

    checkPlayerCollisions();
    checkAICollisions();

    updateCamera(dt);
  }

  function worldToScreen(
    x: number,
    y: number,
    zoom: number,
  ) {
    return {
      x:
        (x - cameraX) * zoom +
        width / 2,
      y:
        (y - cameraY) * zoom +
        height / 2,
    };
  }

  function drawBackground() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(
      0,
      0,
      width,
      height,
    );

    const zoom = getCameraZoom();

    const gridSpacing = 80 * zoom;

    if (gridSpacing > 18) {
      const left =
        width / 2 -
        (cameraX % 80) *
          zoom;

      const top =
        height / 2 -
        (cameraY % 80) *
          zoom;

      ctx.strokeStyle =
        "rgba(255,255,255,0.035)";
      ctx.lineWidth = 1;

      for (
        let x = left;
        x <= width;
        x += gridSpacing
      ) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (
        let y = top;
        y <= height;
        y += gridSpacing
      ) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // World boundary.
    const topLeft =
      worldToScreen(
        0,
        0,
        zoom,
      );

    const bottomRight =
      worldToScreen(
        WORLD_SIZE,
        WORLD_SIZE,
        zoom,
      );

    ctx.strokeStyle =
      "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y,
    );
  }

  function drawPellets() {
    const zoom = getCameraZoom();

    for (const pellet of pellets) {
      const point =
        worldToScreen(
          pellet.x,
          pellet.y,
          zoom,
        );

      if (
        point.x < -20 ||
        point.x > width + 20 ||
        point.y < -20 ||
        point.y > height + 20
      ) {
        continue;
      }

      const pulse =
        1 +
        Math.sin(
          pellet.phase,
        ) *
          0.12;

      const radius =
        pellet.radius *
        zoom *
        pulse;

      ctx.save();

      ctx.fillStyle =
        `hsl(${pellet.hue} 90% 62%)`;

      ctx.shadowColor =
        `hsl(${pellet.hue} 90% 62%)`;

      ctx.shadowBlur =
        radius *
        2.5;

      ctx.beginPath();
      ctx.arc(
        point.x,
        point.y,
        radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.restore();
    }
  }

  function drawSnake(
    body: TrailPoint[],
    skin: SnakeSkin,
    isPlayer: boolean,
  ) {
    if (body.length === 0) return;

    const zoom = getCameraZoom();

    const visibleBody = Math.min(
      body.length,
      900,
    );

    ctx.save();

    // Body shadow/glow.
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur =
      isPlayer ? 13 : 8;

    for (
      let i = visibleBody - 1;
      i >= 0;
      i--
    ) {
      const segment = body[i];

      const point =
        worldToScreen(
          segment.x,
          segment.y,
          zoom,
        );

      if (
        point.x < -40 ||
        point.x > width + 40 ||
        point.y < -40 ||
        point.y > height + 40
      ) {
        continue;
      }

      const t =
        visibleBody <= 1
          ? 1
          : 1 -
            i /
              (visibleBody - 1);

      const radius =
        BODY_RADIUS *
        zoom *
        (0.92 + t * 0.08);

      const hueShift =
        isPlayer
          ? Math.round(
              t * 18,
            )
          : 0;

      ctx.fillStyle =
        i === 0
          ? skin.primary
          : `color-mix(in oklch, ${skin.secondary}, ${skin.primary} ${Math.round(t * 55)}%)`;

      ctx.beginPath();
      ctx.arc(
        point.x,
        point.y,
        radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      if (
        isPlayer &&
        i > 0 &&
        i % 6 === 0
      ) {
        ctx.fillStyle =
          `rgba(255,255,255,${0.04 + t * 0.04})`;

        ctx.beginPath();
        ctx.arc(
          point.x -
            radius * 0.28,
          point.y -
            radius * 0.3,
          radius * 0.28,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    ctx.restore();

    drawHead(
      body[0],
      skin,
      isPlayer,
    );
  }

  function drawHead(
    head: TrailPoint,
    skin: SnakeSkin,
    isPlayer: boolean,
  ) {
    const zoom = getCameraZoom();
    const point =
      worldToScreen(
        head.x,
        head.y,
        zoom,
      );

    const radius =
      BODY_RADIUS *
      zoom *
      1.06;

    const angle =
      isPlayer
        ? playerAngle
        : findBodyAngle(
            head,
            bodyNext(head),
          );

    ctx.save();

    ctx.fillStyle =
      skin.primary;

    ctx.shadowColor =
      skin.glow;

    ctx.shadowBlur =
      isPlayer ? 18 : 10;

    ctx.beginPath();
    ctx.arc(
      point.x,
      point.y,
      radius * 1.12,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.shadowBlur = 0;

    const eyeOffsetForward =
      radius * 0.36;

    const eyeOffsetSide =
      radius * 0.34;

    const forwardX =
      Math.cos(angle) *
      eyeOffsetForward;

    const forwardY =
      Math.sin(angle) *
      eyeOffsetForward;

    const sideX =
      Math.cos(
        angle + Math.PI / 2,
      ) *
      eyeOffsetSide;

    const sideY =
      Math.sin(
        angle + Math.PI / 2,
      ) *
      eyeOffsetSide;

    const eyeRadius =
      Math.max(
        1.8,
        radius * 0.24,
      );

    drawEye(
      point.x +
        forwardX +
        sideX,
      point.y +
        forwardY +
        sideY,
      eyeRadius,
      angle,
    );

    drawEye(
      point.x +
        forwardX -
        sideX,
      point.y +
        forwardY -
        sideY,
      eyeRadius,
      angle,
    );

    ctx.restore();
  }

  function drawEye(
    x: number,
    y: number,
    radius: number,
    angle: number,
  ) {
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.fillStyle =
      "rgba(0,0,0,0.78)";

    ctx.beginPath();
    ctx.arc(
      x +
        Math.cos(angle) *
          radius *
          0.35,
      y +
        Math.sin(angle) *
          radius *
          0.35,
      radius * 0.52,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function bodyNext(
    head: TrailPoint,
  ) {
    if (
      playerBody[0] === head &&
      playerBody.length > 1
    ) {
      return playerBody[1];
    }

    for (const snake of aiSnakes) {
      if (
        snake.body[0] === head &&
        snake.body.length > 1
      ) {
        return snake.body[1];
      }
    }

    return {
      x:
        head.x -
        Math.cos(playerAngle) *
          BODY_SPACING,
      y:
        head.y -
        Math.sin(playerAngle) *
          BODY_SPACING,
    };
  }

  function findBodyAngle(
    a: TrailPoint,
    b: TrailPoint,
  ) {
    return Math.atan2(
      a.y - b.y,
      a.x - b.x,
    );
  }

  function drawParticles() {
    const zoom = getCameraZoom();

    for (const particle of particles) {
      const screen =
        worldToScreen(
          particle.x,
          particle.y,
          zoom,
        );

      const alpha =
        clamp(
          particle.life /
            particle.maxLife,
          0,
          1,
        );

      ctx.fillStyle =
        `hsla(${particle.hue}, 90%, 65%, ${alpha})`;

      ctx.beginPath();
      ctx.arc(
        screen.x,
        screen.y,
        particle.size *
          zoom *
          alpha,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  function drawBoostTrail() {
    if (
      !alive ||
      !boosting ||
      playerBody.length < 12
    ) {
      return;
    }

    const zoom = getCameraZoom();

    ctx.save();
    ctx.fillStyle =
      "rgba(255,255,255,0.12)";

    for (
      let i = 5;
      i <
      Math.min(
        playerBody.length,
        28,
      );
      i += 3
    ) {
      const segment =
        playerBody[i];

      const screen =
        worldToScreen(
          segment.x,
          segment.y,
          zoom,
        );

      const alpha =
        1 -
        i /
          Math.min(
            playerBody.length,
            32,
          );

      ctx.globalAlpha =
        alpha * 0.35;

      ctx.beginPath();
      ctx.arc(
        screen.x,
        screen.y,
        BODY_RADIUS *
          zoom *
          alpha *
          0.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }

  function drawWorldDanger() {
    if (!alive) return;

    const zoom = getCameraZoom();
    const dangerDistance = 180;

    const nearestX = Math.min(
      playerX,
      WORLD_SIZE - playerX,
    );

    const nearestY = Math.min(
      playerY,
      WORLD_SIZE - playerY,
    );

    const nearest =
      Math.min(
        nearestX,
        nearestY,
      );

    if (
      nearest > dangerDistance
    ) {
      return;
    }

    const alpha =
      clamp(
        1 -
          nearest /
            dangerDistance,
        0,
        1,
      );

    const gradient =
      ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.25,
        width / 2,
        height / 2,
        width * 0.75,
      );

    gradient.addColorStop(
      0,
      "rgba(255,70,70,0)",
    );

    gradient.addColorStop(
      1,
      `rgba(255,70,70,${alpha * 0.17})`,
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      0,
      0,
      width,
      height,
    );

    void zoom;
  }

  function drawBoostIndicator() {
    if (!alive) return;

    const barWidth = 125;
    const barHeight = 6;

    const x = 12;
    const y =
      height - 20;

    const ratio =
      clamp(
        (playerLength - 14) /
          45,
        0,
        1,
      );

    ctx.save();

    ctx.fillStyle =
      "rgba(255,255,255,0.08)";

    roundRect(
      ctx,
      x,
      y,
      barWidth,
      barHeight,
      3,
    );

    ctx.fill();

    ctx.fillStyle =
      boosting
        ? pal.neon
        : "rgba(255,255,255,0.35)";

    roundRect(
      ctx,
      x,
      y,
      barWidth * ratio,
      barHeight,
      3,
    );

    ctx.fill();

    ctx.fillStyle =
      "rgba(255,255,255,0.55)";

    ctx.font =
      "10px sans-serif";

    ctx.textAlign =
      "left";

    ctx.textBaseline =
      "bottom";

    ctx.fillText(
      "BOOST",
      x,
      y - 4,
    );

    ctx.restore();
  }

  function drawStartOverlay() {
    if (started || !alive) return;

    ctx.save();

    const pulse =
      0.82 +
      Math.sin(
        performance.now() / 300,
      ) *
        0.08;

    ctx.globalAlpha = pulse;

    ctx.fillStyle =
      "#ffffff";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.font =
      `700 ${Math.max(
        16,
        width * 0.034,
      )}px sans-serif`;

    ctx.fillText(
      "MOVE TO START",
      width / 2,
      height / 2 - 18,
    );

    ctx.font =
      `${Math.max(
        11,
        width * 0.017,
      )}px sans-serif`;

    ctx.fillStyle =
      "rgba(255,255,255,0.58)";

    ctx.fillText(
      "Hold mouse / touch / space to boost",
      width / 2,
      height / 2 + 16,
    );

    ctx.restore();
  }

  function render() {
    drawBackground();
    drawPellets();

    for (const snake of aiSnakes) {
      if (!snake.alive) continue;

      drawSnake(
        snake.body,
        snake.skin,
        false,
      );
    }

    if (alive) {
      drawBoostTrail();

      drawSnake(
        playerBody,
        skins[0],
        true,
      );
    }

    drawParticles();
    drawWorldDanger();
    drawBoostIndicator();
    drawStartOverlay();
  }

  function onMouseMove(e: MouseEvent) {
    mouseWorld =
      canvasToWorld(
        e.clientX,
        e.clientY,
      );

    setPlayerStarted();
  }

  function onMouseDown() {
    boosting = true;
    setPlayerStarted();
  }

  function onMouseUp() {
    boosting = false;
  }

  function onMouseLeave() {
    boosting = false;
  }

  function onTouchStart(e: TouchEvent) {
    const touch =
      e.touches[0];

    mouseWorld =
      canvasToWorld(
        touch.clientX,
        touch.clientY,
      );

    boosting = true;
    setPlayerStarted();

    e.preventDefault();
  }

  function onTouchMove(e: TouchEvent) {
    const touch =
      e.touches[0];

    mouseWorld =
      canvasToWorld(
        touch.clientX,
        touch.clientY,
      );

    setPlayerStarted();

    e.preventDefault();
  }

  function onTouchEnd() {
    boosting = false;
  }

  function onKeyDown(
    e: KeyboardEvent,
  ) {
    const key =
      e.key.toLowerCase();

    keys.add(key);

    if (
      key === " " ||
      key === "spacebar"
    ) {
      boosting = true;
      setPlayerStarted();
      e.preventDefault();
    }

    if (
      key === "w" ||
      key === "arrowup"
    ) {
      mouseWorld =
        pointFromAngle(
          playerX,
          playerY,
          -Math.PI / 2,
          500,
        );

      setPlayerStarted();
      e.preventDefault();
    }

    if (
      key === "s" ||
      key === "arrowdown"
    ) {
      mouseWorld =
        pointFromAngle(
          playerX,
          playerY,
          Math.PI / 2,
          500,
        );

      setPlayerStarted();
      e.preventDefault();
    }

    if (
      key === "a" ||
      key === "arrowleft"
    ) {
      mouseWorld =
        pointFromAngle(
          playerX,
          playerY,
          Math.PI,
          500,
        );

      setPlayerStarted();
      e.preventDefault();
    }

    if (
      key === "d" ||
      key === "arrowright"
    ) {
      mouseWorld =
        pointFromAngle(
          playerX,
          playerY,
          0,
          500,
        );

      setPlayerStarted();
      e.preventDefault();
    }

    if (
      key === "r" &&
      !alive
    ) {
      reset();
      e.preventDefault();
    }
  }

  function onKeyUp(
    e: KeyboardEvent,
  ) {
    const key =
      e.key.toLowerCase();

    keys.delete(key);

    if (
      key === " " ||
      key === "spacebar"
    ) {
      boosting = false;
      e.preventDefault();
    }
  }

  canvas.addEventListener(
    "mousemove",
    onMouseMove,
  );

  canvas.addEventListener(
    "mousedown",
    onMouseDown,
  );

  canvas.addEventListener(
    "mouseup",
    onMouseUp,
  );

  canvas.addEventListener(
    "mouseleave",
    onMouseLeave,
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

  canvas.addEventListener(
    "touchend",
    onTouchEnd,
  );

  window.addEventListener(
    "keydown",
    onKeyDown,
  );

  window.addEventListener(
    "keyup",
    onKeyUp,
  );

  reset();

  const loop = createLoop(
    update,
    render,
  );

  return {
    pause: () => {
      boosting = false;
      loop.pause();
    },

    resume: () => {
      loop.resume();
    },

    restart: () => {
      reset();
    },

    destroy: () => {
      boosting = false;

      loop.stop();

      canvas.removeEventListener(
        "mousemove",
        onMouseMove,
      );

      canvas.removeEventListener(
        "mousedown",
        onMouseDown,
      );

      canvas.removeEventListener(
        "mouseup",
        onMouseUp,
      );

      canvas.removeEventListener(
        "mouseleave",
        onMouseLeave,
      );

      canvas.removeEventListener(
        "touchstart",
        onTouchStart,
      );

      canvas.removeEventListener(
        "touchmove",
        onTouchMove,
      );

      canvas.removeEventListener(
        "touchend",
        onTouchEnd,
      );

      window.removeEventListener(
        "keydown",
        onKeyDown,
      );

      window.removeEventListener(
        "keyup",
        onKeyUp,
      );
    },
  };
};

export default slithery;