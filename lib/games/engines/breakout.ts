import type { GameEngineFactory } from "@/types";
import {
  beep,
  clamp,
  createLoop,
  palette,
  roundRect,
} from "../helpers";

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  hp: number;
  maxHp: number;
  type:
    | "normal"
    | "armored"
    | "explosive"
    | "power"
    | "multiplier"
    | "indestructible";
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  fireball: number;
  ghost: number;
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type:
    | "multiball"
    | "wide"
    | "laser"
    | "magnet"
    | "slow"
    | "fireball"
    | "ghost"
    | "shield";
  life: number;
  pulse: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
}

interface Laser {
  x: number;
  y: number;
  life: number;
}

interface Upgrade {
  id:
    | "paddle"
    | "speed"
    | "combo"
    | "life"
    | "power"
    | "control";
  name: string;
  description: string;
}

type LayoutType =
  | "classic"
  | "pyramid"
  | "diamond"
  | "tunnel"
  | "checker"
  | "fortress"
  | "stairs";

const breakout: GameEngineFactory = ({
  canvas,
  width,
  height,
  onScore,
  onGameOver,
  onStatus,
}) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();

  const COLORS = [
    "#f87171",
    "#fb923c",
    "#fbbf24",
    "#34d399",
    "#22d3ee",
  ];

  const POWER_COLORS: Record<
    PowerUp["type"],
    string
  > = {
    multiball: "#f472b6",
    wide: "#60a5fa",
    laser: "#ef4444",
    magnet: "#a78bfa",
    slow: "#22d3ee",
    fireball: "#f97316",
    ghost: "#c084fc",
    shield: "#38bdf8",
  };

  const BRICK_GAP = 5;
  const BRICK_TOP = 52;
  const PADDLE_Y = height - 30;
  const PADDLE_H = 12;

  let paddleX = width / 2;

  let paddleWidthUpgrade = 0;
  let paddleSpeedUpgrade = 0;
  let comboUpgrade = 0;
  let extraLivesUpgrade = 0;
  let powerUpgrade = 0;
  let controlUpgrade = 0;

  let paddleW = width * 0.18;

  let balls: Ball[] = [];
  let bricks: Brick[] = [];
  let powerUps: PowerUp[] = [];
  let particles: Particle[] = [];
  let floatingTexts: FloatingText[] = [];
  let lasers: Laser[] = [];

  let score = 0;
  let bestScore = 0;
  let lives = 3;
  let level = 1;

  let launched = false;
  let alive = true;
  let levelTransition = 0;

  let combo = 0;
  let comboTimer = 0;
  let maxCombo = 0;

  let rush = false;
  let rushTimer = 0;

  let shield = 0;

  let wideTimer = 0;
  let laserTimer = 0;
  let magnetTimer = 0;
  let slowTimer = 0;

  let upgradeSelection = false;
  let upgradeChoices: Upgrade[] = [];

  let screenShake = 0;
  let flash = 0;

  let layout: LayoutType = "classic";

  let bossMode = false;
  let bossCore: Brick | null = null;

  function randomItem<T>(items: T[]): T {
    return items[
      Math.floor(Math.random() * items.length)
    ];
  }

  function resetPowerEffects() {
    wideTimer = 0;
    laserTimer = 0;
    magnetTimer = 0;
    slowTimer = 0;

    shield = 0;
  }

  function getPaddleWidth() {
    let value =
      paddleW +
      paddleWidthUpgrade * (width * 0.012);

    if (wideTimer > 0) {
      value *= 1.55;
    }

    return Math.min(
      width * 0.38,
      value,
    );
  }

  function getPaddleSpeed() {
    return 28 + paddleSpeedUpgrade * 4;
  }

  function getComboMultiplier() {
    if (combo >= 20) return 5;
    if (combo >= 12) return 4;
    if (combo >= 8) return 3;
    if (combo >= 4) return 2;
    return 1;
  }

  function getScoreMultiplier() {
    const comboMult = getComboMultiplier();
    const rushMult = rush ? 2 : 1;

    return (
      comboMult *
      rushMult *
      (1 + powerUpgrade * 0.2)
    );
  }

  function addScore(
    base: number,
    textX?: number,
    textY?: number,
  ) {
    const amount = Math.max(
      1,
      Math.round(
        base * getScoreMultiplier(),
      ),
    );

    score += amount;
    bestScore = Math.max(
      bestScore,
      score,
    );

    onScore(score);

    if (
      textX !== undefined &&
      textY !== undefined
    ) {
      floatingTexts.push({
        x: textX,
        y: textY,
        text:
          amount >= 1000
            ? `+${amount}`
            : `+${amount}`,
        life: 35,
        maxLife: 35,
      });
    }
  }

  function registerBrickHit() {
    combo++;
    comboTimer = 85 + comboUpgrade * 12;

    if (combo > maxCombo) {
      maxCombo = combo;
    }

    if (
      !rush &&
      combo >= 12
    ) {
      rush = true;
      rushTimer = 360;

      createBurst(
        width / 2,
        height / 2,
        30,
        1.5,
      );

      screenShake = 6;
      beep(980, 0.08);

      onStatus?.(
        "BREAKOUT RUSH!",
      );
    }
  }

  function loseCombo() {
    combo = 0;
    comboTimer = 0;
    rush = false;
    rushTimer = 0;
  }

  function createBurst(
    x: number,
    y: number,
    amount: number,
    strength = 1,
    color?: string,
  ) {
    for (let i = 0; i < amount; i++) {
      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        (0.6 + Math.random() * 2.8) *
        strength;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 18 + Math.random() * 24,
        maxLife: 42,
        size: 1 + Math.random() * 2.6,
        color:
          color ||
          randomItem(COLORS),
      });
    }
  }

  function addPowerUp(
    x: number,
    y: number,
  ) {
    if (
      Math.random() >
      0.13 + powerUpgrade * 0.015
    ) {
      return;
    }

    powerUps.push({
      x,
      y,
      vy: 1.5 + Math.random() * 0.6,
      type: randomItem([
        "multiball",
        "wide",
        "laser",
        "magnet",
        "slow",
        "fireball",
        "ghost",
        "shield",
      ]),
      life: 480,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  function activatePowerUp(
    type: PowerUp["type"],
  ) {
    switch (type) {
      case "multiball":
        if (balls.length < 3) {
          const source =
            balls[0];

          if (source) {
            const speed =
              Math.max(
                5.5,
                Math.hypot(
                  source.vx,
                  source.vy,
                ),
              );

            const baseAngle =
              Math.atan2(
                source.vy,
                source.vx,
              );

            balls.push(
              createBallFromAngle(
                source.x,
                source.y,
                speed,
                baseAngle - 0.32,
              ),
            );

            if (balls.length < 3) {
              balls.push(
                createBallFromAngle(
                  source.x,
                  source.y,
                  speed,
                  baseAngle + 0.32,
                ),
              );
            }
          }
        }

        onStatus?.(
          "MULTIBALL",
        );
        break;

      case "wide":
        wideTimer = 600;
        onStatus?.(
          "WIDE PADDLE",
        );
        break;

      case "laser":
        laserTimer = 520;
        onStatus?.(
          "LASER PADDLE",
        );
        break;

      case "magnet":
        magnetTimer = 520;
        onStatus?.(
          "BALL MAGNET",
        );
        break;

      case "slow":
        slowTimer = 440;
        onStatus?.(
          "SLOW BALL",
        );
        break;

      case "fireball":
        for (const ball of balls) {
          ball.fireball = 460;
        }

        onStatus?.(
          "FIREBALL",
        );
        break;

      case "ghost":
        for (const ball of balls) {
          ball.ghost = 380;
        }

        onStatus?.(
          "GHOST BALL",
        );
        break;

      case "shield":
        shield = Math.min(
          2,
          shield + 1,
        );

        onStatus?.(
          "SHIELD READY",
        );
        break;
    }

    createBurst(
      paddleX,
      PADDLE_Y,
      12,
      0.8,
      POWER_COLORS[type],
    );

    beep(720, 0.07);
  }

  function createBallFromAngle(
    x: number,
    y: number,
    speed: number,
    angle: number,
  ): Ball {
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 7,
      fireball: 0,
      ghost: 0,
    };
  }

  function resetBall() {
    balls = [
      {
        x: paddleX,
        y: PADDLE_Y - 13,
        vx: 0,
        vy: 0,
        r: 7,
        fireball: 0,
        ghost: 0,
      },
    ];

    launched = false;

    onStatus?.(
      "Click or press Space to launch",
    );
  }

  function chooseLayout(): LayoutType {
    if (level % 5 === 0) {
      return "fortress";
    }

    return randomItem([
      "classic",
      "classic",
      "pyramid",
      "diamond",
      "tunnel",
      "checker",
      "stairs",
    ]);
  }

  function createBrick(
    x: number,
    y: number,
    w: number,
    h: number,
    row: number,
    type: Brick["type"],
    hp: number,
  ): Brick {
    return {
      x,
      y,
      w,
      h,
      color: COLORS[
        row % COLORS.length
      ],
      hp,
      maxHp: hp,
      type,
    };
  }

  function buildLevel() {
    bricks = [];
    bossCore = null;
    bossMode = level % 5 === 0;

    layout = chooseLayout();

    if (bossMode) {
      buildBossLevel();
      return;
    }

    const cols = 9;
    const bw =
      (width - 40) /
      cols;
    const bh = 20;

    const addPatternBrick = (
      row: number,
      col: number,
    ) => {
      const x =
        20 + col * bw;
      const y =
        BRICK_TOP +
        row * (bh + BRICK_GAP);

      const roll =
        Math.random();

      let type: Brick["type"] =
        "normal";

      let hp =
        1 +
        (row < 2 ? 1 : 0);

      if (
        level >= 3 &&
        roll < 0.08
      ) {
        type = "explosive";
      } else if (
        level >= 2 &&
        roll < 0.16
      ) {
        type = "armored";
        hp = Math.max(
          2,
          hp + 1,
        );
      } else if (
        roll < 0.23
      ) {
        type = "power";
      } else if (
        roll < 0.28
      ) {
        type = "multiplier";
      }

      bricks.push(
        createBrick(
          x,
          y,
          bw - 4,
          bh,
          row,
          type,
          hp,
        ),
      );
    };

    const rows =
      4 + Math.min(
        4,
        Math.floor(level / 2),
      );

    for (
      let r = 0;
      r < rows;
      r++
    ) {
      for (
        let c = 0;
        c < cols;
        c++
      ) {
        let include = true;

        if (
          layout === "pyramid"
        ) {
          const center = 4;
          const distance =
            Math.abs(
              c - center,
            );

          include =
            distance <= r + 1;
        }

        if (
          layout === "diamond"
        ) {
          const centerX = 4;
          const centerY =
            (rows - 1) / 2;

          include =
            Math.abs(
              c - centerX,
            ) +
              Math.abs(
                r - centerY,
              ) <=
            Math.min(
              4,
              rows / 2,
            );
        }

        if (
          layout === "tunnel"
        ) {
          include =
            c < 2 ||
            c > 6 ||
            r === 0 ||
            r === rows - 1;
        }

        if (
          layout === "checker"
        ) {
          include =
            (r + c) % 2 === 0;
        }

        if (
          layout === "stairs"
        ) {
          include =
            c >= r &&
            c <=
              8 - r;
        }

        if (include) {
          addPatternBrick(
            r,
            c,
          );
        }
      }
    }

    if (
      layout === "fortress"
    ) {
      // handled by boss level
    }

    onStatus?.(
      `LEVEL ${level}`,
    );
  }

  function buildBossLevel() {
    bricks = [];

    const rows = 7;
    const cols = 9;
    const bw =
      (width - 40) /
      cols;
    const bh = 22;

    for (
      let r = 0;
      r < rows;
      r++
    ) {
      for (
        let c = 0;
        c < cols;
        c++
      ) {
        const edge =
          c === 0 ||
          c === cols - 1 ||
          r === 0 ||
          r === rows - 1;

        const inner =
          c >= 2 &&
          c <= 6 &&
          r >= 2 &&
          r <= 4;

        if (
          !edge &&
          !inner
        ) {
          continue;
        }

        const x =
          20 + c * bw;
        const y =
          BRICK_TOP +
          r * (bh + 5);

        let type: Brick["type"] =
          "armored";

        let hp = 2;

        if (
          c === 4 &&
          r === 3
        ) {
          type =
            "multiplier";
          hp = 8;
        }

        if (
          edge
        ) {
          type =
            "indestructible";
          hp = 999;
        }

        const brick =
          createBrick(
            x,
            y,
            bw - 4,
            bh,
            r,
            type,
            hp,
          );

        bricks.push(
          brick,
        );

        if (
          c === 4 &&
          r === 3
        ) {
          bossCore = brick;
        }
      }
    }

    // Additional weak points
    const weakPoints = [
      [2, 2],
      [2, 6],
      [4, 2],
      [4, 6],
    ];

    for (const [
      c,
      r,
    ] of weakPoints) {
      bricks.push(
        createBrick(
          20 + c * bw,
          BRICK_TOP +
            r * (bh + 5),
          bw - 4,
          bh,
          r,
          "explosive",
          2,
        ),
      );
    }

    onStatus?.(
      `BOSS LEVEL ${level}`,
    );
  }

  function launch() {
    if (
      launched ||
      !alive ||
      upgradeSelection
    ) {
      return;
    }

    launched = true;

    const speed =
      Math.min(
        7,
        5.7 +
          level *
            0.1,
      );

    const angle =
      -Math.PI / 2 +
      (Math.random() - 0.5) *
        0.75;

    const ball =
      balls[0];

    if (!ball) {
      resetBall();
      return;
    }

    ball.vx =
      Math.cos(angle) *
      speed;

    ball.vy =
      Math.sin(angle) *
      speed;

    onStatus?.("");
  }

  function handleBrickHit(
    brick: Brick,
    ball: Ball,
  ) {
    const centerX =
      brick.x +
      brick.w / 2;
    const centerY =
      brick.y +
      brick.h / 2;

    if (
      brick.type ===
      "indestructible"
    ) {
      return;
    }

    brick.hp--;

    registerBrickHit();

    const base =
      brick.type ===
      "multiplier"
        ? 100
        : brick.type ===
            "explosive"
          ? 40
          : brick.type ===
              "armored"
            ? 25
            : 10;

    addScore(
      base *
        Math.max(
          1,
          brick.maxHp,
        ),
      centerX,
      centerY,
    );

    createBurst(
      centerX,
      centerY,
      7,
      0.65,
      brick.color,
    );

    if (
      brick.type ===
      "power"
    ) {
      addPowerUp(
        centerX,
        centerY,
      );
    }

    if (
      brick.hp <= 0
    ) {
      if (
        brick.type ===
        "explosive"
      ) {
        triggerExplosion(
          brick,
        );
      }

      if (
        brick.type ===
        "multiplier"
      ) {
        addScore(
          150,
          centerX,
          centerY,
        );
      }

      const index =
        bricks.indexOf(
          brick,
        );

      if (index >= 0) {
        bricks.splice(
          index,
          1,
        );
      }

      if (
        brick ===
        bossCore
      ) {
        bossCore = null;
      }
    } else {
      // Correct velocity if the brick is still alive.
      // The fireball and ghost powerups are allowed
      // to make this feel different.
      if (
        ball.fireball <= 0 &&
        ball.ghost <= 0
      ) {
        ball.vy *= -1;
      }
    }

    beep(
      420 +
        Math.min(
          400,
          combo * 14,
        ),
      0.035,
    );
  }

  function triggerExplosion(
    brick: Brick,
  ) {
    const radius =
      70;

    createBurst(
      brick.x +
        brick.w / 2,
      brick.y +
        brick.h / 2,
      24,
      1.2,
      "#fb923c",
    );

    screenShake =
      Math.max(
        screenShake,
        5,
      );

    for (
      let i =
        bricks.length - 1;
      i >= 0;
      i--
    ) {
      const target =
        bricks[i];

      if (
        target ===
        brick ||
        target.type ===
          "indestructible"
      ) {
        continue;
      }

      const dx =
        target.x +
        target.w / 2 -
        (brick.x +
          brick.w / 2);

      const dy =
        target.y +
        target.h / 2 -
        (brick.y +
          brick.h / 2);

      if (
        Math.hypot(
          dx,
          dy,
        ) <= radius
      ) {
        target.hp = 0;

        addScore(
          25,
          target.x +
            target.w / 2,
          target.y +
            target.h / 2,
        );

        createBurst(
          target.x +
            target.w / 2,
          target.y +
            target.h / 2,
          5,
          0.5,
          target.color,
        );

        bricks.splice(
          i,
          1,
        );
      }
    }
  }

  function updateBall(
    ball: Ball,
    ballIndex: number,
  ) {
    let speed =
      Math.hypot(
        ball.vx,
        ball.vy,
      );

    if (
      slowTimer > 0
    ) {
      speed *= 0.62;

      if (speed > 0) {
        const scale =
          speed /
          Math.hypot(
            ball.vx,
            ball.vy,
          );

        ball.vx *= scale;
        ball.vy *= scale;
      }
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (
      ball.x <
        ball.r
    ) {
      ball.x =
        ball.r;
      ball.vx =
        Math.abs(
          ball.vx,
        );

      beep(
        280,
        0.025,
      );
    }

    if (
      ball.x >
      width - ball.r
    ) {
      ball.x =
        width -
        ball.r;

      ball.vx =
        -Math.abs(
          ball.vx,
        );

      beep(
        280,
        0.025,
      );
    }

    if (
      ball.y <
        ball.r
    ) {
      ball.y =
        ball.r;

      ball.vy =
        Math.abs(
          ball.vy,
        );

      beep(
        280,
        0.025,
      );
    }

    const currentPaddleW =
      getPaddleWidth();

    // Paddle collision
    if (
      ball.vy > 0 &&
      ball.y +
        ball.r >=
        PADDLE_Y &&
      ball.y -
        ball.r <=
        PADDLE_Y +
          PADDLE_H &&
      ball.x >=
        paddleX -
          currentPaddleW /
            2 &&
      ball.x <=
        paddleX +
          currentPaddleW /
            2
    ) {
      const rel =
        clamp(
          (ball.x -
            paddleX) /
            (currentPaddleW /
              2),
          -1,
          1,
        );

      const speedBefore =
        Math.hypot(
          ball.vx,
          ball.vy,
        );

      const control =
        0.92 +
        controlUpgrade *
          0.03;

      const angle =
        -Math.PI / 2 +
        rel *
          (Math.PI / 2.8) *
          control;

      const newSpeed =
        Math.min(
          12,
          Math.max(
            5.5,
            speedBefore +
              0.12 +
              level *
                0.008,
          ),
        );

      ball.vx =
        Math.cos(angle) *
        newSpeed;

      ball.vy =
        Math.sin(angle) *
        newSpeed;

      ball.y =
        PADDLE_Y -
        ball.r -
        0.5;

      // Perfect-ish hit
      if (
        Math.abs(rel) <
        0.12
      ) {
        addScore(
          20,
          ball.x,
          PADDLE_Y -
            5,
        );

        comboTimer +=
          18;

        createBurst(
          ball.x,
          PADDLE_Y,
          5,
          0.45,
          pal.neon,
        );

        beep(
          680,
          0.04,
        );
      } else {
        beep(
          440,
          0.035,
        );
      }
    }

    // Magnet effect
    if (
      magnetTimer > 0 &&
      Math.abs(
        ball.y -
          PADDLE_Y,
      ) < 90 &&
      ball.vy > 0
    ) {
      const pull =
        clamp(
          (paddleX -
            ball.x) *
            0.0025,
          -0.08,
          0.08,
        );

      ball.vx += pull;
    }

    // Brick collisions
    for (
      let i =
        bricks.length - 1;
      i >= 0;
      i--
    ) {
      const brick =
        bricks[i];

      if (
        ball.x +
          ball.r <
          brick.x ||
        ball.x -
          ball.r >
          brick.x +
            brick.w ||
        ball.y +
          ball.r <
          brick.y ||
        ball.y -
          ball.r >
          brick.y +
            brick.h
      ) {
        continue;
      }

      const closestX =
        clamp(
          ball.x,
          brick.x,
          brick.x +
            brick.w,
        );

      const closestY =
        clamp(
          ball.y,
          brick.y,
          brick.y +
            brick.h,
        );

      const dx =
        ball.x -
        closestX;

      const dy =
        ball.y -
        closestY;

      if (
        dx * dx +
          dy * dy >
        ball.r *
          ball.r
      ) {
        continue;
      }

      if (
        brick.type ===
        "indestructible"
      ) {
        const centerX =
          brick.x +
          brick.w / 2;

        const centerY =
          brick.y +
          brick.h / 2;

        if (
          Math.abs(
            ball.x -
              centerX,
          ) >
          Math.abs(
            ball.y -
              centerY,
          )
        ) {
          ball.vx *= -1;
        } else {
          ball.vy *= -1;
        }

        ball.ghost = Math.max(
          0,
          ball.ghost - 30,
        );

        beep(
          210,
          0.025,
        );

        continue;
      }

      handleBrickHit(
        brick,
        ball,
      );

      if (
        ball.fireball <= 0 &&
        ball.ghost <= 0
      ) {
        const centerX =
          brick.x +
          brick.w / 2;

        const centerY =
          brick.y +
          brick.h / 2;

        if (
          Math.abs(
            ball.x -
              centerX,
          ) >
          Math.abs(
            ball.y -
              centerY,
          )
        ) {
          ball.vx *= -1;
        } else {
          ball.vy *= -1;
        }
      }

      if (
        ball.fireball > 0
      ) {
        ball.x +=
          ball.vx * 0.4;
        ball.y +=
          ball.vy * 0.4;
      }

      break;
    }

    // Keep high speed from becoming too extreme.
    const currentSpeed =
      Math.hypot(
        ball.vx,
        ball.vy,
      );

    const minSpeed =
      5.3;

    const maxSpeed =
      rush
        ? 13
        : 11.5;

    const targetSpeed =
      clamp(
        currentSpeed,
        minSpeed,
        maxSpeed,
      );

    if (
      currentSpeed > 0
    ) {
      ball.vx =
        (ball.vx /
          currentSpeed) *
        targetSpeed;

      ball.vy =
        (ball.vy /
          currentSpeed) *
        targetSpeed;
    }

    if (
      ball.fireball > 0
    ) {
      ball.fireball--;
    }

    if (
      ball.ghost > 0
    ) {
      ball.ghost--;
    }

    // Lost ball
    if (
      ball.y >
      height + 25
    ) {
      if (
        shield > 0
      ) {
        shield--;

        createBurst(
          ball.x,
          height - 10,
          18,
          1.2,
          "#38bdf8",
        );

        balls.splice(
          ballIndex,
          1,
        );

        onStatus?.(
          "SHIELD BLOCK",
        );

        if (
          balls.length === 0
        ) {
          resetBall();
        }

        return;
      }

      balls.splice(
        ballIndex,
        1,
      );

      if (
        balls.length ===
        0
      ) {
        lives--;

        loseCombo();

        beep(
          170,
          0.2,
          "sawtooth",
        );

        createBurst(
          ball.x,
          height - 5,
          18,
          1,
          "#f87171",
        );

        if (
          lives <= 0
        ) {
          alive = false;

          onStatus?.(
            "Game over",
          );

          onGameOver(
            score,
            level,
          );
        } else {
          resetBall();
        }
      }
    }
  }

  function updateParticles() {
    for (
      let i =
        particles.length - 1;
      i >= 0;
      i--
    ) {
      const particle =
        particles[i];

      particle.x +=
        particle.vx;

      particle.y +=
        particle.vy;

      particle.vx *=
        0.97;

      particle.vy *=
        0.97;

      particle.life--;

      if (
        particle.life <=
        0
      ) {
        particles.splice(
          i,
          1,
        );
      }
    }
  }

  function updatePowerUps() {
    for (
      let i =
        powerUps.length - 1;
      i >= 0;
      i--
    ) {
      const powerUp =
        powerUps[i];

      powerUp.y +=
        powerUp.vy;

      powerUp.pulse +=
        0.12;

      powerUp.life--;

      const currentWidth =
        getPaddleWidth();

      if (
        powerUp.y + 10 >=
          PADDLE_Y &&
        powerUp.y - 10 <=
          PADDLE_Y +
            PADDLE_H &&
        powerUp.x >=
          paddleX -
            currentWidth /
              2 &&
        powerUp.x <=
          paddleX +
            currentWidth /
              2
      ) {
        activatePowerUp(
          powerUp.type,
        );

        createBurst(
          powerUp.x,
          powerUp.y,
          10,
          0.8,
          POWER_COLORS[
            powerUp.type
          ],
        );

        powerUps.splice(
          i,
          1,
        );

        continue;
      }

      if (
        powerUp.life <= 0 ||
        powerUp.y >
          height + 20
      ) {
        powerUps.splice(
          i,
          1,
        );
      }
    }
  }

  function updateEffects() {
    if (comboTimer > 0) {
      comboTimer--;

      if (
        comboTimer <= 0
      ) {
        loseCombo();
      }
    }

    if (rush) {
      rushTimer--;

      if (
        rushTimer <= 0
      ) {
        rush = false;
      }
    }

    if (
      wideTimer > 0
    ) {
      wideTimer--;
    }

    if (
      laserTimer > 0
    ) {
      laserTimer--;
    }

    if (
      magnetTimer > 0
    ) {
      magnetTimer--;
    }

    if (
      slowTimer > 0
    ) {
      slowTimer--;
    }

    if (
      screenShake > 0
    ) {
      screenShake *=
        0.84;

      if (
        screenShake < 0.3
      ) {
        screenShake = 0;
      }
    }

    if (flash > 0) {
      flash--;
    }
  }

  function fireLaser() {
    if (
      laserTimer <= 0
    ) {
      return;
    }

    if (
      Math.random() >
      0.04
    ) {
      return;
    }

    lasers.push({
      x: paddleX,
      y: PADDLE_Y,
      life: 8,
    });

    for (
      let i =
        bricks.length - 1;
      i >= 0;
      i--
    ) {
      const brick =
        bricks[i];

      if (
        brick.type ===
        "indestructible"
      ) {
        continue;
      }

      if (
        paddleX >=
          brick.x &&
        paddleX <=
          brick.x +
            brick.w
      ) {
        brick.hp--;

        registerBrickHit();

        addScore(
          12,
          paddleX,
          brick.y,
        );

        createBurst(
          paddleX,
          brick.y +
            brick.h /
              2,
          5,
          0.6,
          "#ef4444",
        );

        if (
          brick.hp <=
          0
        ) {
          if (
            brick.type ===
            "power"
          ) {
            addPowerUp(
              brick.x +
                brick.w /
                  2,
              brick.y +
                brick.h /
                  2,
            );
          }

          bricks.splice(
            i,
            1,
          );
        }
      }
    }
  }

  function chooseUpgrades() {
    const pool: Upgrade[] = [
      {
        id: "paddle",
        name: "BIG PADDLE",
        description:
          "+10% paddle width",
      },
      {
        id: "speed",
        name: "QUICK HANDS",
        description:
          "Move the paddle faster",
      },
      {
        id: "combo",
        name: "COMBO MASTER",
        description:
          "Combos last longer",
      },
      {
        id: "life",
        name: "REINFORCED",
        description:
          "+1 life",
      },
      {
        id: "power",
        name: "POWER COLLECTOR",
        description:
          "Better power-up rewards",
      },
      {
        id: "control",
        name: "BALL CONTROL",
        description:
          "More control over bounces",
      },
    ];

    upgradeChoices = [];

    while (
      upgradeChoices.length <
        3 &&
      pool.length > 0
    ) {
      const index =
        Math.floor(
          Math.random() *
            pool.length,
        );

      const selected =
        pool.splice(
          index,
          1,
        )[0];

      if (selected) {
        upgradeChoices.push(
          selected,
        );
      }
    }

    upgradeSelection = true;

    onStatus?.(
      "CHOOSE AN UPGRADE",
    );
  }

  function applyUpgrade(
    upgrade: Upgrade,
  ) {
    switch (
      upgrade.id
    ) {
      case "paddle":
        paddleWidthUpgrade++;
        break;

      case "speed":
        paddleSpeedUpgrade++;
        break;

      case "combo":
        comboUpgrade++;
        break;

      case "life":
        lives++;
        break;

      case "power":
        powerUpgrade++;
        break;

      case "control":
        controlUpgrade++;
        break;
    }

    upgradeSelection = false;
    upgradeChoices = [];

    levelTransition = 45;

    beep(
      760,
      0.08,
    );

    onStatus?.(
      `UPGRADE: ${upgrade.name}`,
    );
  }

  function update() {
    updateParticles();
    updatePowerUps();
    updateEffects();
    fireLaser();

    if (
      levelTransition > 0
    ) {
      levelTransition--;

      if (
        levelTransition ===
        0
      ) {
        level++;
        buildLevel();
        resetBall();
      }

      return;
    }

    if (!alive) {
      return;
    }

    if (
      upgradeSelection
    ) {
      return;
    }

    if (
      !launched
    ) {
      const firstBall =
        balls[0];

      if (firstBall) {
        firstBall.x =
          paddleX;
        firstBall.y =
          PADDLE_Y -
          13;
      }

      return;
    }

    for (
      let i =
        balls.length - 1;
      i >= 0;
      i--
    ) {
      if (
        balls[i]
      ) {
        updateBall(
          balls[i],
          i,
        );
      }
    }

    updatePowerUps();

    if (
      bricks.length ===
        0 &&
      alive &&
      !upgradeSelection
    ) {
      if (bossMode) {
        // Boss level complete.
        addScore(
          1000 +
            level *
              100,
          width / 2,
          100,
        );

        createBurst(
          width / 2,
          150,
          45,
          2,
        );

        screenShake = 12;
        flash = 8;

        onStatus?.(
          "BOSS DEFEATED!",
        );

        levelTransition = 75;
      } else {
        chooseUpgrades();
      }
    }
  }

  function renderBrick(
    brick: Brick,
  ) {
    const damaged =
      brick.hp <
      brick.maxHp;

    ctx.save();

    if (
      brick.type ===
      "indestructible"
    ) {
      ctx.fillStyle =
        "#475569";
    } else if (
      brick.type ===
      "explosive"
    ) {
      ctx.fillStyle =
        "#fb923c";
    } else if (
      brick.type ===
      "power"
    ) {
      ctx.fillStyle =
        "#a78bfa";
    } else if (
      brick.type ===
      "multiplier"
    ) {
      ctx.fillStyle =
        "#facc15";
    } else {
      ctx.fillStyle =
        brick.color;
    }

    if (damaged) {
      ctx.globalAlpha =
        0.6;
    }

    roundRect(
      ctx,
      brick.x,
      brick.y,
      brick.w,
      brick.h,
      4,
    );

    ctx.fill();

    if (
      brick.type ===
      "indestructible"
    ) {
      ctx.strokeStyle =
        "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;

      ctx.stroke();
    }

    if (
      brick.type ===
      "explosive"
    ) {
      ctx.fillStyle =
        "#ffffff";
      ctx.globalAlpha =
        damaged
          ? 0.5
          : 0.85;

      ctx.font =
        "bold 10px system-ui";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.fillText(
        "*",
        brick.x +
          brick.w / 2,
        brick.y +
          brick.h / 2,
      );
    }

    if (
      brick.type ===
      "power"
    ) {
      ctx.fillStyle =
        "#ffffff";
      ctx.globalAlpha =
        0.85;

      ctx.font =
        "bold 9px system-ui";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.fillText(
        "+",
        brick.x +
          brick.w / 2,
        brick.y +
          brick.h / 2,
      );
    }

    if (
      brick.type ===
      "multiplier"
    ) {
      ctx.fillStyle =
        "#ffffff";

      ctx.globalAlpha =
        0.9;

      ctx.font =
        "bold 9px system-ui";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.fillText(
        "2X",
        brick.x +
          brick.w / 2,
        brick.y +
          brick.h / 2,
      );
    }

    ctx.restore();
  }

  function renderPowerUps() {
    for (
      const powerUp of powerUps
    ) {
      const color =
        POWER_COLORS[
          powerUp.type
        ];

      const radius =
        8 +
        Math.sin(
          powerUp.pulse,
        ) *
          1.5;

      ctx.save();

      ctx.fillStyle =
        color;

      ctx.globalAlpha =
        0.15;

      ctx.beginPath();

      ctx.arc(
        powerUp.x,
        powerUp.y,
        radius + 5,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      ctx.globalAlpha =
        0.95;

      ctx.strokeStyle =
        color;

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.arc(
        powerUp.x,
        powerUp.y,
        radius,
        0,
        Math.PI * 2,
      );

      ctx.stroke();

      ctx.fillStyle =
        "#ffffff";

      ctx.font =
        "bold 8px system-ui";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      const label =
        powerUp.type ===
        "multiball"
          ? "M"
          : powerUp.type ===
              "wide"
            ? "W"
            : powerUp.type ===
                "laser"
              ? "L"
              : powerUp.type ===
                  "magnet"
                ? "G"
                : powerUp.type ===
                    "slow"
                  ? "S"
                  : powerUp.type ===
                      "fireball"
                    ? "F"
                    : powerUp.type ===
                        "ghost"
                      ? "G"
                      : "D";

      ctx.fillText(
        label,
        powerUp.x,
        powerUp.y,
      );

      ctx.restore();
    }
  }

  function renderParticles() {
    for (
      const particle of particles
    ) {
      ctx.save();

      ctx.globalAlpha =
        clamp(
          particle.life /
            particle.maxLife,
          0,
          1,
        );

      ctx.fillStyle =
        particle.color;

      ctx.beginPath();

      ctx.arc(
        particle.x,
        particle.y,
        particle.size,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      ctx.restore();
    }
  }

  function renderBalls() {
    for (
      const ball of balls
    ) {
      ctx.save();

      const glow =
        ball.fireball > 0
          ? "#f97316"
          : ball.ghost > 0
            ? "#c084fc"
            : "#ffffff";

      ctx.fillStyle =
        glow;

      ctx.shadowColor =
        glow;

      ctx.shadowBlur = 12;

      ctx.beginPath();

      ctx.arc(
        ball.x,
        ball.y,
        ball.r,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      ctx.shadowBlur = 0;

      if (
        ball.fireball > 0
      ) {
        ctx.strokeStyle =
          "#fb923c";

        ctx.globalAlpha =
          0.5;

        ctx.beginPath();

        ctx.arc(
          ball.x,
          ball.y,
          ball.r + 5,
          0,
          Math.PI * 2,
        );

        ctx.stroke();
      }

      ctx.restore();
    }
  }

  function renderPaddle() {
    const widthNow =
      getPaddleWidth();

    ctx.save();

    ctx.fillStyle =
      pal.neon;

    ctx.shadowColor =
      pal.neon;

    ctx.shadowBlur = 10;

    roundRect(
      ctx,
      paddleX -
        widthNow / 2,
      PADDLE_Y,
      widthNow,
      PADDLE_H,
      6,
    );

    ctx.fill();

    ctx.shadowBlur = 0;

    if (
      laserTimer > 0
    ) {
      ctx.strokeStyle =
        "#ef4444";

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.moveTo(
        paddleX -
          widthNow / 2 +
          5,
        PADDLE_Y,
      );

      ctx.lineTo(
        paddleX -
          widthNow / 2 +
          5,
        12,
      );

      ctx.stroke();

      ctx.beginPath();

      ctx.moveTo(
        paddleX +
          widthNow / 2 -
          5,
        PADDLE_Y,
      );

      ctx.lineTo(
        paddleX +
          widthNow / 2 -
          5,
        12,
      );

      ctx.stroke();
    }

    if (
      shield > 0
    ) {
      ctx.strokeStyle =
        "#38bdf8";

      ctx.globalAlpha =
        0.45;

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.arc(
        paddleX,
        PADDLE_Y +
          5,
        widthNow / 2 +
          12,
        Math.PI,
        Math.PI * 2,
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  function renderHud() {
    ctx.save();

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "13px system-ui";

    ctx.textAlign =
      "left";

    ctx.fillText(
      `Lives: ${"♥".repeat(
        Math.max(
          0,
          lives,
        ),
      )}`,
      12,
      24,
    );

    ctx.fillText(
      `Level: ${level}`,
      12,
      43,
    );

    ctx.textAlign =
      "right";

    ctx.fillText(
      `Score: ${score}`,
      width - 12,
      24,
    );

    ctx.fillText(
      `Best: ${bestScore}`,
      width - 12,
      43,
    );

    if (
      combo >= 2
    ) {
      ctx.textAlign =
        "center";

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "bold 15px system-ui";

      ctx.fillText(
        `COMBO x${getComboMultiplier()}`,
        width / 2,
        23,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        `${combo} HITS`,
        width / 2,
        39,
      );
    }

    if (rush) {
      ctx.textAlign =
        "center";

      ctx.fillStyle =
        "#facc15";

      ctx.font =
        "bold 17px system-ui";

      ctx.fillText(
        "BREAKOUT RUSH",
        width / 2,
        60,
      );
    }

    const effects: string[] =
      [];

    if (
      wideTimer > 0
    ) {
      effects.push(
        "WIDE",
      );
    }

    if (
      laserTimer > 0
    ) {
      effects.push(
        "LASER",
      );
    }

    if (
      magnetTimer > 0
    ) {
      effects.push(
        "MAGNET",
      );
    }

    if (
      slowTimer > 0
    ) {
      effects.push(
        "SLOW",
      );
    }

    if (
      shield > 0
    ) {
      effects.push(
        `SHIELD x${shield}`,
      );
    }

    if (
      effects.length > 0
    ) {
      ctx.textAlign =
        "left";

      ctx.fillStyle =
        pal.neon;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        effects.join(
          " • ",
        ),
        12,
        height - 12,
      );
    }

    ctx.restore();
  }

  function renderUpgradeSelection() {
    if (
      !upgradeSelection
    ) {
      return;
    }

    ctx.fillStyle =
      "rgba(0,0,0,0.76)";

    ctx.fillRect(
      0,
      0,
      width,
      height,
    );

    ctx.textAlign =
      "center";

    ctx.fillStyle =
      pal.neon;

    ctx.font =
      "bold 22px system-ui";

    ctx.fillText(
      "CHOOSE AN UPGRADE",
      width / 2,
      58,
    );

    const cardWidth =
      Math.min(
        150,
        width * 0.28,
      );

    const gap = 10;

    const totalWidth =
      cardWidth * 3 +
      gap * 2;

    const startX =
      width / 2 -
      totalWidth / 2;

    for (
      let i = 0;
      i <
        upgradeChoices.length;
      i++
    ) {
      const upgrade =
        upgradeChoices[i];

      const x =
        startX +
        i *
          (cardWidth +
            gap);

      const y =
        height / 2 -
        55;

      ctx.strokeStyle =
        pal.neon;

      ctx.lineWidth = 1.5;

      ctx.strokeRect(
        x,
        y,
        cardWidth,
        115,
      );

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "bold 13px system-ui";

      ctx.fillText(
        `${i + 1}`,
        x +
          cardWidth / 2,
        y + 22,
      );

      ctx.fillStyle =
        pal.neon;

      ctx.font =
        "bold 11px system-ui";

      ctx.fillText(
        upgrade.name,
        x +
          cardWidth / 2,
        y + 48,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        upgrade.description,
        x +
          cardWidth / 2,
        y + 76,
      );
    }

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "12px system-ui";

    ctx.fillText(
      "Press 1, 2 or 3",
      width / 2,
      height - 24,
    );
  }

  function renderTransition() {
    if (
      levelTransition <=
      0
    ) {
      return;
    }

    ctx.save();

    ctx.fillStyle =
      "rgba(0,0,0,0.45)";

    ctx.fillRect(
      0,
      0,
      width,
      height,
    );

    ctx.textAlign =
      "center";

    ctx.fillStyle =
      bossMode
        ? pal.gold
        : pal.neon;

    ctx.font =
      "bold 24px system-ui";

    ctx.fillText(
      bossMode
        ? "BOSS DEFEATED"
        : "LEVEL CLEAR",
      width / 2,
      height / 2,
    );

    ctx.restore();
  }

  function renderGameOver() {
    if (alive) {
      return;
    }

    ctx.fillStyle =
      "rgba(0,0,0,0.65)";

    ctx.fillRect(
      0,
      0,
      width,
      height,
    );

    ctx.textAlign =
      "center";

    ctx.fillStyle =
      pal.neon;

    ctx.font =
      "bold 28px system-ui";

    ctx.fillText(
      "GAME OVER",
      width / 2,
      height / 2 - 36,
    );

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "14px system-ui";

    ctx.fillText(
      `Score: ${score}`,
      width / 2,
      height / 2 - 3,
    );

    ctx.fillText(
      `Level: ${level}`,
      width / 2,
      height / 2 + 20,
    );

    ctx.fillText(
      `Best combo: ${maxCombo}`,
      width / 2,
      height / 2 + 43,
    );

    ctx.fillStyle =
      pal.neon;

    ctx.font =
      "12px system-ui";

    ctx.fillText(
      "Press Space or R to restart",
      width / 2,
      height / 2 + 72,
    );
  }

  function render() {
    ctx.save();

    if (
      screenShake > 0
    ) {
      ctx.translate(
        (Math.random() -
          0.5) *
          screenShake,
        (Math.random() -
          0.5) *
          screenShake,
      );
    }

    ctx.fillStyle =
      pal.bg;

    ctx.fillRect(
      -20,
      -20,
      width + 40,
      height + 40,
    );

    // Background stars/dots
    ctx.save();

    ctx.fillStyle =
      pal.muted;

    ctx.globalAlpha =
      0.12;

    for (
      let i = 0;
      i < 35;
      i++
    ) {
      const x =
        (i * 71 +
          level * 19) %
        width;

      const y =
        (i * 43 +
          level * 13) %
        height;

      ctx.fillRect(
        x,
        y,
        1,
        1,
      );
    }

    ctx.restore();

    for (
      const brick of bricks
    ) {
      renderBrick(
        brick,
      );
    }

    renderParticles();
    renderPowerUps();
    renderPaddle();
    renderBalls();

    // Laser beams
    for (
      const laser of lasers
    ) {
      ctx.save();

      ctx.strokeStyle =
        "#ef4444";

      ctx.lineWidth = 2;

      ctx.globalAlpha =
        laser.life / 8;

      ctx.beginPath();

      ctx.moveTo(
        laser.x,
        laser.y,
      );

      ctx.lineTo(
        laser.x,
        0,
      );

      ctx.stroke();

      ctx.restore();
    }

    lasers = lasers.filter(
      (laser) => {
        laser.life--;
        return (
          laser.life > 0
        );
      },
    );

    // Floating score text
    for (
      const text of floatingTexts
    ) {
      ctx.save();

      ctx.globalAlpha =
        text.life /
        text.maxLife;

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "bold 11px system-ui";

      ctx.textAlign =
        "center";

      ctx.fillText(
        text.text,
        text.x,
        text.y -
          (1 -
            text.life /
              text.maxLife) *
            18,
      );

      ctx.restore();

      text.life--;
    }

    floatingTexts =
      floatingTexts.filter(
        (text) =>
          text.life > 0,
      );

    renderHud();

    renderUpgradeSelection();

    renderTransition();

    renderGameOver();

    if (
      flash > 0
    ) {
      ctx.fillStyle =
        `rgba(255,255,255,${
          flash / 25
        })`;

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );
    }

    ctx.restore();
  }

  const onMove = (
    e: PointerEvent,
  ) => {
    const rect =
      canvas.getBoundingClientRect();

    paddleX = clamp(
      ((e.clientX -
        rect.left) /
        rect.width) *
        width,
      getPaddleWidth() /
        2,
      width -
        getPaddleWidth() /
          2,
    );
  };

  const onDown = () => {
    if (!alive) {
      reset();
      return;
    }

    if (
      upgradeSelection
    ) {
      return;
    }

    launch();
  };

  const onKey = (
    e: KeyboardEvent,
  ) => {
    const key =
      e.key.toLowerCase();

    if (
      key === " "
    ) {
      e.preventDefault();

      if (!alive) {
        reset();
      } else if (
        !upgradeSelection
      ) {
        launch();
      }

      return;
    }

    if (
      upgradeSelection &&
      (
        key === "1" ||
        key === "2" ||
        key === "3"
      )
    ) {
      e.preventDefault();

      const choice =
        upgradeChoices[
          Number(key) - 1
        ];

      if (choice) {
        applyUpgrade(
          choice,
        );
      }

      return;
    }

    const moveAmount =
      getPaddleSpeed();

    if (
      key ===
      "arrowleft"
    ) {
      paddleX = clamp(
        paddleX -
          moveAmount,
        getPaddleWidth() /
          2,
        width -
          getPaddleWidth() /
            2,
      );

      e.preventDefault();
    } else if (
      key ===
      "arrowright"
    ) {
      paddleX = clamp(
        paddleX +
          moveAmount,
        getPaddleWidth() /
          2,
        width -
          getPaddleWidth() /
            2,
      );

      e.preventDefault();
    } else if (
      key === "r"
    ) {
      reset();
    }
  };

  const clearInput = () => {
    // Keep the paddle exactly where it is.
  };

  function reset() {
    score = 0;
    lives = 3;
    level = 1;

    paddleWidthUpgrade = 0;
    paddleSpeedUpgrade = 0;
    comboUpgrade = 0;
    extraLivesUpgrade = 0;
    powerUpgrade = 0;
    controlUpgrade = 0;

    paddleX =
      width / 2;

    balls = [];
    bricks = [];
    powerUps = [];
    particles = [];
    floatingTexts = [];
    lasers = [];

    launched = false;
    alive = true;

    combo = 0;
    comboTimer = 0;
    maxCombo = 0;

    rush = false;
    rushTimer = 0;

    upgradeSelection = false;
    upgradeChoices = [];

    levelTransition = 0;

    screenShake = 0;
    flash = 0;

    resetPowerEffects();

    onScore(0);

    buildLevel();
    resetBall();
  }

  canvas.addEventListener(
    "pointermove",
    onMove,
  );

  canvas.addEventListener(
    "pointerdown",
    onDown,
  );

  window.addEventListener(
    "keydown",
    onKey,
  );

  window.addEventListener(
    "blur",
    clearInput,
  );

  reset();

  const loop = createLoop(
    update,
    render,
  );

  return {
    pause: () => {
      loop.pause();
    },

    resume: () => {
      loop.resume();
    },

    restart: () => {
      reset();
    },

    destroy: () => {
      loop.stop();

      canvas.removeEventListener(
        "pointermove",
        onMove,
      );

      canvas.removeEventListener(
        "pointerdown",
        onDown,
      );

      window.removeEventListener(
        "keydown",
        onKey,
      );

      window.removeEventListener(
        "blur",
        clearInput,
      );
    },
  };
};

export default breakout;
