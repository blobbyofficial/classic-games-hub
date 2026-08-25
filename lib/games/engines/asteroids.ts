import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette } from "../helpers";

interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  verts: number[];
  rotation: number;
  spin: number;
  size: number;
  special: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  piercing: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  kind: "spark" | "smoke";
}

interface PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: PowerUpType;
  life: number;
  pulse: number;
}

interface Boss {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  health: number;
  maxHealth: number;
  rotation: number;
  phase: number;
  shotTimer: number;
  dashTimer: number;
  flash: number;
}

type PowerUpType =
  | "rapid"
  | "triple"
  | "shield"
  | "overdrive"
  | "piercing"
  | "multiplier";

type WaveType =
  | "normal"
  | "swarm"
  | "speed"
  | "heavy"
  | "chaos"
  | "boss";

interface Upgrade {
  id:
    | "engine"
    | "fire"
    | "cooldown"
    | "multiplier"
    | "shield"
    | "ammo";
  name: string;
  description: string;
}

const asteroids: GameEngineFactory = ({
  canvas,
  width,
  height,
  onScore,
  onGameOver,
  onStatus,
}) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();

  const ship = {
    x: width / 2,
    y: height / 2,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    thrust: false,
  };

  let rocks: Rock[] = [];
  let bullets: Bullet[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];

  let boss: Boss | null = null;

  let score = 0;
  let bestScore = 0;
  let lives = 3;
  let level = 1;

  let alive = true;
  let invuln = 0;
  let fireCooldown = 0;
  let nextWaveTimer = 0;
  let gameOverTimer = 0;

  let waveType: WaveType = "normal";

  let combo = 0;
  let comboTimer = 0;
  let maxCombo = 0;

  let fever = false;
  let feverTimer = 0;

  let screenShake = 0;
  let hitFlash = 0;

  let upgradeSelection = false;
  let upgradeChoices: Upgrade[] = [];

  let shieldCharges = 0;

  const activePowerUps: Record<
    PowerUpType,
    number
  > = {
    rapid: 0,
    triple: 0,
    shield: 0,
    overdrive: 0,
    piercing: 0,
    multiplier: 0,
  };

  let piercingUpgrade = 0;
  let fireUpgrade = 0;
  let engineUpgrade = 0;
  let ammoUpgrade = 0;
  let multiplierUpgrade = 0;

  const keys = new Set<string>();

  const MAX_BULLETS_BASE = 6;

  function randomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  function clamp(
    value: number,
    min: number,
    max: number,
  ) {
    return Math.max(min, Math.min(max, value));
  }

  function wrap(
    object: { x: number; y: number },
    margin = 0,
  ) {
    if (object.x < -margin) {
      object.x = width + margin;
    } else if (object.x > width + margin) {
      object.x = -margin;
    }

    if (object.y < -margin) {
      object.y = height + margin;
    } else if (object.y > height + margin) {
      object.y = -margin;
    }
  }

  function distanceWrapped(
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ) {
    let dx = Math.abs(ax - bx);
    let dy = Math.abs(ay - by);

    if (dx > width / 2) {
      dx = width - dx;
    }

    if (dy > height / 2) {
      dy = height - dy;
    }

    return Math.hypot(dx, dy);
  }

  function getRockRadius(size: number) {
    if (size === 3) return 44;
    if (size === 2) return 26;
    return 15;
  }

  function getMaxBullets() {
    return MAX_BULLETS_BASE + ammoUpgrade;
  }

  function getFireDelay() {
    let delay = Math.max(
      3,
      8 - fireUpgrade,
    );

    if (activePowerUps.rapid > 0) {
      delay -= 3;
    }

    return Math.max(2, delay);
  }

  function getShipAcceleration() {
    let acceleration =
      0.17 + engineUpgrade * 0.018;

    if (activePowerUps.overdrive > 0) {
      acceleration *= 1.55;
    }

    return acceleration;
  }

  function getShipMaxSpeed() {
    let speed =
      6.4 + engineUpgrade * 0.35;

    if (activePowerUps.overdrive > 0) {
      speed *= 1.35;
    }

    return speed;
  }

  function getScoreMultiplier() {
    const comboMultiplier =
      combo >= 20 ? 5 :
      combo >= 12 ? 4 :
      combo >= 8 ? 3 :
      combo >= 4 ? 2 :
      1;

    const feverMultiplier =
      fever ? 2 : 1;

    const powerMultiplier =
      activePowerUps.multiplier > 0 ? 2 : 1;

    const upgradeMultiplier =
      1 + multiplierUpgrade * 0.2;

    return (
      comboMultiplier *
      feverMultiplier *
      powerMultiplier *
      upgradeMultiplier
    );
  }

  function resetPowerUps() {
    for (const key of Object.keys(activePowerUps) as PowerUpType[]) {
      activePowerUps[key] = 0;
    }
  }

  function createRock(
    x: number,
    y: number,
    size: number,
    special = false,
  ): Rock {
    const radius = getRockRadius(size);

    const vertexCount =
      size === 3 ? 11 :
      size === 2 ? 10 :
      9;

    const verts = Array.from(
      { length: vertexCount },
      () => 0.74 + Math.random() * 0.42,
    );

    const angle =
      Math.random() *
      Math.PI *
      2;

    let speed =
      size === 3 ? 0.7 :
      size === 2 ? 1.25 :
      2.05;

    speed += Math.random() * 0.75;
    speed += level * 0.035;

    if (waveType === "speed") {
      speed *= 1.5;
    }

    if (waveType === "swarm" && size === 1) {
      speed *= 1.35;
    }

    if (special) {
      speed *= 1.35;
    }

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: radius,
      verts,
      rotation:
        Math.random() *
        Math.PI *
        2,
      spin:
        (Math.random() - 0.5) *
        (size === 3 ? 0.018 : 0.032),
      size,
      special,
    };
  }

  function createExplosion(
    x: number,
    y: number,
    amount: number,
    strength = 1,
  ) {
    for (let i = 0; i < amount; i++) {
      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        (0.5 + Math.random() * 2.8) *
        strength;

      particles.push({
        x,
        y,
        vx:
          Math.cos(angle) *
          speed,
        vy:
          Math.sin(angle) *
          speed,
        life:
          18 +
          Math.random() * 30,
        maxLife: 48,
        size:
          1 +
          Math.random() * 2.7,
        kind:
          Math.random() < 0.18
            ? "smoke"
            : "spark",
      });
    }
  }

  function addScore(
    amount: number,
  ) {
    const finalAmount =
      Math.round(
        amount * getScoreMultiplier(),
      );

    score += finalAmount;
    bestScore = Math.max(
      bestScore,
      score,
    );

    onScore(score);
  }

  function registerKill() {
    combo++;
    comboTimer = 100;

    if (combo > maxCombo) {
      maxCombo = combo;
    }

    if (!fever && combo >= 12) {
      fever = true;
      feverTimer = 360;

      createExplosion(
        ship.x,
        ship.y,
        24,
        1.2,
      );

      screenShake = 8;

      beep(980, 0.08);

      onStatus?.(
        "ASTEROID FEVER!",
      );
    }
  }

  function endCombo() {
    combo = 0;
    comboTimer = 0;
    fever = false;
    feverTimer = 0;
  }

  function spawnPowerUp(
    x: number,
    y: number,
  ) {
    if (Math.random() > 0.11) {
      return;
    }

    const type =
      randomItem<PowerUpType>([
        "rapid",
        "triple",
        "shield",
        "overdrive",
        "piercing",
        "multiplier",
      ]);

    powerUps.push({
      x,
      y,
      vx:
        (Math.random() - 0.5) *
        0.8,
      vy:
        (Math.random() - 0.5) *
        0.8,
      type,
      life: 700,
      pulse: 0,
    });
  }

  function activatePowerUp(
    type: PowerUpType,
  ) {
    switch (type) {
      case "shield":
        shieldCharges = Math.min(
          2,
          shieldCharges + 1,
        );

        activePowerUps.shield = 1;

        onStatus?.(
          "SHIELD READY",
        );

        break;

      case "rapid":
        activePowerUps.rapid = 480;

        onStatus?.(
          "RAPID FIRE",
        );

        break;

      case "triple":
        activePowerUps.triple = 480;

        onStatus?.(
          "TRIPLE SHOT",
        );

        break;

      case "overdrive":
        activePowerUps.overdrive = 420;

        onStatus?.(
          "OVERDRIVE",
        );

        break;

      case "piercing":
        activePowerUps.piercing = 420;

        onStatus?.(
          "PIERCING SHOTS",
        );

        break;

      case "multiplier":
        activePowerUps.multiplier = 450;

        onStatus?.(
          "2X SCORE",
        );

        break;
    }

    beep(700, 0.08);
    createExplosion(
      ship.x,
      ship.y,
      12,
      0.7,
    );
  }

  function resetShip() {
    ship.x = width / 2;
    ship.y = height / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    ship.thrust = false;

    invuln = 110;
    fireCooldown = 0;
  }

  function chooseWaveType(
    targetLevel: number,
  ): WaveType {
    if (targetLevel % 5 === 0) {
      return "boss";
    }

    const choices: WaveType[] = [
      "normal",
      "normal",
      "swarm",
      "speed",
      "heavy",
      "chaos",
    ];

    return randomItem(
      choices,
    );
  }

  function spawnWave() {
    rocks = [];
    bullets = [];
    powerUps = [];

    boss = null;

    waveType =
      chooseWaveType(level);

    if (waveType === "boss") {
      spawnBoss();
      onStatus?.(
        `BOSS WAVE ${level}`,
      );
      beep(180, 0.2);
      return;
    }

    let count =
      3 + level;

    if (waveType === "swarm") {
      count =
        Math.min(
          20,
          8 + level,
        );
    }

    if (waveType === "heavy") {
      count =
        Math.min(
          10,
          3 +
            Math.floor(
              level * 0.7,
            ),
        );
    }

    for (let i = 0; i < count; i++) {
      let size = 3;

      if (waveType === "swarm") {
        size =
          Math.random() < 0.7
            ? 1
            : 2;
      } else if (waveType === "heavy") {
        size =
          Math.random() < 0.8
            ? 3
            : 2;
      } else {
        const roll =
          Math.random();

        if (roll < 0.15) {
          size = 1;
        } else if (roll < 0.42) {
          size = 2;
        }
      }

      let x = 0;
      let y = 0;

      const side =
        Math.floor(
          Math.random() * 4,
        );

      if (side === 0) {
        x = -getRockRadius(size);
        y =
          Math.random() *
          height;
      } else if (side === 1) {
        x =
          width +
          getRockRadius(size);
        y =
          Math.random() *
          height;
      } else if (side === 2) {
        x =
          Math.random() *
          width;
        y = -getRockRadius(size);
      } else {
        x =
          Math.random() *
          width;
        y =
          height +
          getRockRadius(size);
      }

      const special =
        waveType === "chaos" &&
        Math.random() < 0.22;

      rocks.push(
        createRock(
          x,
          y,
          size,
          special,
        ),
      );
    }

    nextWaveTimer = 0;

    const names: Record<
      Exclude<WaveType, "boss">,
      string
    > = {
      normal: "NORMAL",
      swarm: "SWARM",
      speed: "SPEED",
      heavy: "HEAVY",
      chaos: "CHAOS",
    };

    onStatus?.(
      `${names[waveType]} WAVE`,
    );
  }

  function spawnBoss() {
    const radius =
      Math.min(
        76,
        Math.max(
          62,
          Math.min(
            width,
            height,
          ) * 0.13,
        ),
      );

    const health =
      30 +
      level * 6;

    boss = {
      x: width / 2,
      y: 85,
      vx: 1.15,
      vy: 0.55,
      r: radius,
      health,
      maxHealth: health,
      rotation: 0,
      phase: 0,
      shotTimer: 90,
      dashTimer: 240,
      flash: 0,
    };
  }

  function chooseUpgradeChoices() {
    const upgrades: Upgrade[] = [
      {
        id: "engine",
        name: "ENGINE",
        description:
          "+18% acceleration and speed",
      },
      {
        id: "fire",
        name: "FIRE RATE",
        description:
          "Shoot faster",
      },
      {
        id: "cooldown",
        name: "ARMOUR",
        description:
          "+1 life",
      },
      {
        id: "multiplier",
        name: "SCORING",
        description:
          "+20% score multiplier",
      },
      {
        id: "shield",
        name: "SHIELD",
        description:
          "+1 shield charge",
      },
      {
        id: "ammo",
        name: "AMMO",
        description:
          "+1 bullet on screen",
      },
    ];

    const available = [
      ...upgrades,
    ];

    upgradeChoices = [];

    while (
      upgradeChoices.length < 3 &&
      available.length > 0
    ) {
      const index =
        Math.floor(
          Math.random() *
            available.length,
        );

      const selected =
        available.splice(
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
    switch (upgrade.id) {
      case "engine":
        engineUpgrade++;
        break;

      case "fire":
        fireUpgrade++;
        break;

      case "cooldown":
        lives++;
        break;

      case "multiplier":
        multiplierUpgrade++;
        break;

      case "shield":
        shieldCharges++;
        break;

      case "ammo":
        ammoUpgrade++;
        break;
    }

    upgradeSelection = false;
    upgradeChoices = [];

    nextWaveTimer = 60;

    beep(760, 0.08);

    onStatus?.(
      `UPGRADE: ${upgrade.name}`,
    );
  }

  function fire() {
    if (!alive) return;
    if (upgradeSelection) return;
    if (fireCooldown > 0) return;

    if (
      bullets.length >=
      getMaxBullets()
    ) {
      return;
    }

    const cos =
      Math.cos(ship.angle);

    const sin =
      Math.sin(ship.angle);

    const createBullet = (
      spread: number,
    ) => {
      const angle =
        ship.angle + spread;

      const c =
        Math.cos(angle);

      const s =
        Math.sin(angle);

      bullets.push({
        x:
          ship.x +
          c * 16,
        y:
          ship.y +
          s * 16,
        vx:
          c * 9 +
          ship.vx * 0.35,
        vy:
          s * 9 +
          ship.vy * 0.35,
        life: 58,
        damage:
          activePowerUps.piercing > 0
            ? 2
            : 1,
        piercing:
          activePowerUps.piercing > 0 ||
          piercingUpgrade > 0,
      });
    };

    if (activePowerUps.triple > 0) {
      createBullet(-0.14);
      createBullet(0);
      createBullet(0.14);
    } else {
      createBullet(0);
    }

    ship.vx -= cos * 0.02;
    ship.vy -= sin * 0.02;

    fireCooldown =
      getFireDelay();

    beep(880, 0.028);
  }

  function destroyRock(
    index: number,
  ) {
    const rock =
      rocks[index];

    if (!rock) return;

    rocks.splice(
      index,
      1,
    );

    const basePoints =
      rock.size === 3
        ? 20
        : rock.size === 2
          ? 55
          : 110;

    addScore(basePoints);

    registerKill();

    createExplosion(
      rock.x,
      rock.y,
      rock.size === 3
        ? 14
        : 9,
      rock.size === 3
        ? 1.15
        : 0.8,
    );

    screenShake =
      Math.max(
        screenShake,
        rock.size === 3
          ? 3
          : 1.5,
      );

    if (
      rock.size > 1
    ) {
      const childSize =
        rock.size - 1;

      const childA =
        createRock(
          rock.x,
          rock.y,
          childSize,
        );

      const childB =
        createRock(
          rock.x,
          rock.y,
          childSize,
        );

      childA.vx +=
        (Math.random() -
          0.5) *
        1.2;

      childB.vx +=
        (Math.random() -
          0.5) *
        1.2;

      rocks.push(
        childA,
        childB,
      );
    }

    spawnPowerUp(
      rock.x,
      rock.y,
    );

    beep(
      rock.size === 3
        ? 260
        : rock.size === 2
          ? 360
          : 500,
      0.045,
      "sawtooth",
    );
  }

  function damageBoss(
    amount: number,
  ) {
    if (!boss) return;

    boss.health -= amount;
    boss.flash = 5;

    createExplosion(
      boss.x +
        (Math.random() -
          0.5) *
          boss.r,
      boss.y +
        (Math.random() -
          0.5) *
          boss.r,
      4,
      0.5,
    );

    screenShake =
      Math.max(
        screenShake,
        2,
      );

    if (boss.health <= 0) {
      const bossX =
        boss.x;

      const bossY =
        boss.y;

      boss = null;

      addScore(
        2500 +
          level * 100,
      );

      combo += 3;

      if (combo > maxCombo) {
        maxCombo = combo;
      }

      createExplosion(
        bossX,
        bossY,
        55,
        2.2,
      );

      screenShake = 15;

      spawnPowerUp(
        bossX,
        bossY,
      );

      spawnPowerUp(
        bossX,
        bossY,
      );

      onStatus?.(
        "BOSS DESTROYED!",
      );

      beep(150, 0.35);

      nextWaveTimer = 80;
    }
  }

  function fireBossShot(
    angle: number,
  ) {
    const speed = 3.2;

    particles.push({
      x:
        boss!.x +
        Math.cos(angle) *
          boss!.r *
          0.6,
      y:
        boss!.y +
        Math.sin(angle) *
          boss!.r *
          0.6,
      vx:
        Math.cos(angle) *
        speed,
      vy:
        Math.sin(angle) *
        speed,
      life: 65,
      maxLife: 65,
      size: 2.5,
      kind: "spark",
    });
  }

  function updateBoss() {
    if (!boss) return;

    boss.rotation += 0.025;
    boss.phase += 0.02;

    boss.x += boss.vx;
    boss.y += boss.vy;

    if (
      boss.x < boss.r ||
      boss.x >
        width - boss.r
    ) {
      boss.vx *= -1;
    }

    if (
      boss.y < boss.r ||
      boss.y >
        height -
          boss.r
    ) {
      boss.vy *= -1;
    }

    boss.shotTimer--;

    if (
      boss.shotTimer <= 0
    ) {
      const angle = Math.atan2(
        ship.y - boss.y,
        ship.x - boss.x,
      );

      fireBossShot(angle);

      if (
        boss.health <
        boss.maxHealth *
          0.55
      ) {
        fireBossShot(
          angle - 0.22,
        );

        fireBossShot(
          angle + 0.22,
        );
      }

      boss.shotTimer =
        boss.health <
        boss.maxHealth *
          0.4
          ? 42
          : 72;
    }

    boss.dashTimer--;

    if (
      boss.dashTimer <= 0
    ) {
      const angle = Math.atan2(
        ship.y - boss.y,
        ship.x - boss.x,
      );

      boss.vx =
        Math.cos(angle) *
        3.2;

      boss.vy =
        Math.sin(angle) *
        3.2;

      boss.dashTimer = 220;

      screenShake = 5;
    }

    if (boss.flash > 0) {
      boss.flash--;
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
        particle.kind ===
        "smoke"
          ? 0.985
          : 0.97;

      particle.vy *=
        particle.kind ===
        "smoke"
          ? 0.985
          : 0.97;

      particle.life--;

      wrap(
        particle,
        4,
      );

      if (
        particle.life <= 0
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

      powerUp.x +=
        powerUp.vx;

      powerUp.y +=
        powerUp.vy;

      powerUp.life--;
      powerUp.pulse += 0.12;

      wrap(
        powerUp,
        12,
      );

      if (
        distanceWrapped(
          powerUp.x,
          powerUp.y,
          ship.x,
          ship.y,
        ) < 20
      ) {
        activatePowerUp(
          powerUp.type,
        );

        powerUps.splice(
          i,
          1,
        );

        continue;
      }

      if (
        powerUp.life <= 0
      ) {
        powerUps.splice(
          i,
          1,
        );
      }
    }
  }

  function updateActiveEffects() {
    for (const type of Object.keys(
      activePowerUps,
    ) as PowerUpType[]) {
      if (
        activePowerUps[type] > 0
      ) {
        activePowerUps[type]--;
      }
    }

    if (fever) {
      feverTimer--;

      if (
        feverTimer <= 0
      ) {
        fever = false;
        feverTimer = 0;
      }
    }
  }

  function update() {
    updateParticles();
    updatePowerUps();

    if (screenShake > 0) {
      screenShake *= 0.84;

      if (
        screenShake < 0.3
      ) {
        screenShake = 0;
      }
    }

    if (hitFlash > 0) {
      hitFlash--;
    }

    updateActiveEffects();

    if (comboTimer > 0) {
      comboTimer--;

      if (comboTimer <= 0) {
        endCombo();
      }
    }

    if (!alive) {
      gameOverTimer++;

      return;
    }

    if (upgradeSelection) {
      return;
    }

    if (fireCooldown > 0) {
      fireCooldown--;
    }

    if (invuln > 0) {
      invuln--;
    }

    if (
      keys.has("arrowleft") ||
      keys.has("a")
    ) {
      ship.angle -=
        activePowerUps.overdrive >
        0
          ? 0.12
          : 0.085;
    }

    if (
      keys.has("arrowright") ||
      keys.has("d")
    ) {
      ship.angle +=
        activePowerUps.overdrive >
        0
          ? 0.12
          : 0.085;
    }

    ship.thrust =
      keys.has("arrowup") ||
      keys.has("w");

    if (ship.thrust) {
      const acceleration =
        getShipAcceleration();

      ship.vx +=
        Math.cos(
          ship.angle,
        ) *
        acceleration;

      ship.vy +=
        Math.sin(
          ship.angle,
        ) *
        acceleration;

      if (
        Math.random() < 0.7
      ) {
        particles.push({
          x:
            ship.x -
            Math.cos(
              ship.angle,
            ) *
              7,
          y:
            ship.y -
            Math.sin(
              ship.angle,
            ) *
              7,
          vx:
            -Math.cos(
              ship.angle,
            ) *
              (1 +
                Math.random()),
          vy:
            -Math.sin(
              ship.angle,
            ) *
              (1 +
                Math.random()),
          life: 12,
          maxLife: 12,
          size:
            1 +
            Math.random() *
              1.5,
          kind: "spark",
        });
      }
    }

    ship.vx *= 0.992;
    ship.vy *= 0.992;

    const speed =
      Math.hypot(
        ship.vx,
        ship.vy,
      );

    const maxSpeed =
      getShipMaxSpeed();

    if (
      speed > maxSpeed
    ) {
      ship.vx =
        (ship.vx / speed) *
        maxSpeed;

      ship.vy =
        (ship.vy / speed) *
        maxSpeed;
    }

    ship.x += ship.vx;
    ship.y += ship.vy;

    wrap(
      ship,
      10,
    );

    // Bullets
    for (
      let i =
        bullets.length - 1;
      i >= 0;
      i--
    ) {
      const bullet =
        bullets[i];

      bullet.x +=
        bullet.vx;

      bullet.y +=
        bullet.vy;

      bullet.life--;

      wrap(
        bullet,
        4,
      );

      if (
        bullet.life <= 0
      ) {
        bullets.splice(
          i,
          1,
        );
      }
    }

    // Asteroids
    for (const rock of rocks) {
      rock.x += rock.vx;
      rock.y += rock.vy;
      rock.rotation +=
        rock.spin;

      if (
        rock.special &&
        Math.random() < 0.015
      ) {
        const angle =
          Math.random() *
          Math.PI *
          2;

        rock.vx +=
          Math.cos(angle) *
          0.22;

        rock.vy +=
          Math.sin(angle) *
          0.22;
      }

      wrap(
        rock,
        rock.r,
      );
    }

    updateBoss();

    // Bullet -> asteroid
    for (
      let i =
        rocks.length - 1;
      i >= 0;
      i--
    ) {
      const rock =
        rocks[i];

      let destroyed =
        false;

      for (
        let j =
          bullets.length - 1;
        j >= 0;
        j--
      ) {
        const bullet =
          bullets[j];

        if (
          distanceWrapped(
            rock.x,
            rock.y,
            bullet.x,
            bullet.y,
          ) <
          rock.r
        ) {
          if (
            !bullet.piercing
          ) {
            bullets.splice(
              j,
              1,
            );
          } else {
            bullet.life -=
              10;
          }

          destroyRock(i);

          destroyed = true;

          if (
            !bullet.piercing
          ) {
            break;
          }
        }
      }

      if (destroyed) {
        continue;
      }
    }

    // Bullet -> boss
    if (boss) {
      for (
        let i =
          bullets.length - 1;
        i >= 0;
        i--
      ) {
        const bullet =
          bullets[i];

        if (
          distanceWrapped(
            boss.x,
            boss.y,
            bullet.x,
            bullet.y,
          ) <
          boss.r
        ) {
          if (
            !bullet.piercing
          ) {
            bullets.splice(
              i,
              1,
            );
          } else {
            bullet.life -=
              12;
          }

          damageBoss(
            bullet.damage,
          );
        }
      }
    }

    // Ship -> asteroids
    if (invuln <= 0) {
      for (
        let i =
          rocks.length - 1;
        i >= 0;
        i--
      ) {
        const rock =
          rocks[i];

        if (
          distanceWrapped(
            rock.x,
            rock.y,
            ship.x,
            ship.y,
          ) <
          rock.r + 9
        ) {
          if (
            shieldCharges > 0
          ) {
            shieldCharges--;

            invuln = 45;

            createExplosion(
              ship.x,
              ship.y,
              18,
              1.2,
            );

            screenShake = 7;

            rocks.splice(
              i,
              1,
            );

            onStatus?.(
              "SHIELD BREAK",
            );

            beep(
              600,
              0.08,
            );

            break;
          }

          lives--;

          createExplosion(
            ship.x,
            ship.y,
            28,
            1.7,
          );

          screenShake = 12;
          hitFlash = 6;

          endCombo();

          beep(
            110,
            0.28,
            "sawtooth",
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
              0,
            );

            return;
          }

          resetShip();

          onStatus?.(
            `${lives} ${
              lives === 1
                ? "life"
                : "lives"
            } remaining`,
          );

          break;
        }
      }
    }

    // Ship -> boss
    if (
      boss &&
      invuln <= 0
    ) {
      if (
        distanceWrapped(
          boss.x,
          boss.y,
          ship.x,
          ship.y,
        ) <
        boss.r + 10
      ) {
        if (
          shieldCharges > 0
        ) {
          shieldCharges--;

          invuln = 55;

          boss.vx *= -1;
          boss.vy *= -1;

          createExplosion(
            ship.x,
            ship.y,
            22,
            1.4,
          );

          onStatus?.(
            "SHIELD BLOCK",
          );
        } else {
          lives--;

          endCombo();

          createExplosion(
            ship.x,
            ship.y,
            30,
            1.8,
          );

          screenShake = 12;

          if (
            lives <= 0
          ) {
            alive = false;

            onStatus?.(
              "Game over",
            );

            onGameOver(
              score,
              0,
            );

            return;
          }

          resetShip();

          onStatus?.(
            `${lives} ${
              lives === 1
                ? "life"
                : "lives"
            } remaining`,
          );
        }
      }
    }

    // Near-miss detection
    if (invuln <= 0) {
      for (const rock of rocks) {
        const d =
          distanceWrapped(
            rock.x,
            rock.y,
            ship.x,
            ship.y,
          );

        if (
          d >
            rock.r + 10 &&
          d <
            rock.r + 16
        ) {
          addScore(5);

          comboTimer =
            Math.max(
              comboTimer,
              30,
            );

          break;
        }
      }
    }

    // Next wave
    if (
      rocks.length === 0 &&
      boss === null &&
      nextWaveTimer === 0
    ) {
      if (
        level % 5 !== 0
      ) {
        chooseUpgradeChoices();
      } else {
        nextWaveTimer = 70;
      }
    }

    if (
      nextWaveTimer > 0 &&
      !upgradeSelection
    ) {
      nextWaveTimer--;

      if (
        nextWaveTimer === 0
      ) {
        level++;
        spawnWave();
      }
    }
  }

  function getPowerUpLabel(
    type: PowerUpType,
  ) {
    switch (type) {
      case "rapid":
        return "R";

      case "triple":
        return "3";

      case "shield":
        return "S";

      case "overdrive":
        return "O";

      case "piercing":
        return "P";

      case "multiplier":
        return "2";
    }
  }

  function getPowerUpColor(
    type: PowerUpType,
  ) {
    switch (type) {
      case "rapid":
        return pal.neon;

      case "triple":
        return pal.gold;

      case "shield":
        return "#7dd3fc";

      case "overdrive":
        return "#c084fc";

      case "piercing":
        return "#f472b6";

      case "multiplier":
        return "#facc15";
    }
  }

  function renderRock(
    rock: Rock,
  ) {
    ctx.save();

    ctx.translate(
      rock.x,
      rock.y,
    );

    ctx.rotate(
      rock.rotation,
    );

    ctx.strokeStyle =
      rock.special
        ? pal.gold
        : pal.neon;

    ctx.lineWidth =
      rock.size === 3
        ? 1.7
        : 1.35;

    ctx.lineJoin =
      "round";

    ctx.beginPath();

    for (
      let i = 0;
      i < rock.verts.length;
      i++
    ) {
      const angle =
        (i /
          rock.verts
            .length) *
        Math.PI *
        2;

      const px =
        Math.cos(angle) *
        rock.r *
        rock.verts[i];

      const py =
        Math.sin(angle) *
        rock.r *
        rock.verts[i];

      if (i === 0) {
        ctx.moveTo(
          px,
          py,
        );
      } else {
        ctx.lineTo(
          px,
          py,
        );
      }
    }

    ctx.closePath();
    ctx.stroke();

    if (
      rock.size >= 2
    ) {
      ctx.globalAlpha =
        0.22;

      ctx.beginPath();

      for (
        let i = 0;
        i <
        rock.verts
          .length;
        i++
      ) {
        const angle =
          (i /
            rock.verts
              .length) *
          Math.PI *
          2;

        const px =
          Math.cos(angle) *
          rock.r *
          0.48;

        const py =
          Math.sin(angle) *
          rock.r *
          0.48;

        if (i === 0) {
          ctx.moveTo(
            px,
            py,
          );
        } else {
          ctx.lineTo(
            px,
            py,
          );
        }
      }

      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  function renderBoss() {
    if (!boss) return;

    ctx.save();

    ctx.translate(
      boss.x,
      boss.y,
    );

    ctx.rotate(
      boss.rotation,
    );

    ctx.strokeStyle =
      boss.flash > 0
        ? "#ffffff"
        : pal.gold;

    ctx.lineWidth = 3;

    ctx.beginPath();

    for (
      let i = 0;
      i < 12;
      i++
    ) {
      const angle =
        (i / 12) *
        Math.PI *
        2;

      const wobble =
        0.82 +
        Math.sin(
          boss.phase +
            i * 0.9,
        ) *
          0.09;

      const px =
        Math.cos(angle) *
        boss.r *
        wobble;

      const py =
        Math.sin(angle) *
        boss.r *
        wobble;

      if (i === 0) {
        ctx.moveTo(
          px,
          py,
        );
      } else {
        ctx.lineTo(
          px,
          py,
        );
      }
    }

    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha =
      0.35;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      boss.r * 0.5,
      0,
      Math.PI * 2,
    );

    ctx.stroke();

    ctx.globalAlpha =
      1;

    ctx.fillStyle =
      pal.neon;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      7,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.restore();

    const barWidth =
      Math.min(
        240,
        width * 0.5,
      );

    const barHeight =
      7;

    const x =
      width / 2 -
      barWidth / 2;

    const y = 18;

    ctx.fillStyle =
      "rgba(255,255,255,0.12)";

    ctx.fillRect(
      x,
      y,
      barWidth,
      barHeight,
    );

    ctx.fillStyle =
      pal.gold;

    ctx.fillRect(
      x,
      y,
      barWidth *
        clamp(
          boss.health /
            boss.maxHealth,
          0,
          1,
        ),
      barHeight,
    );

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "11px system-ui";

    ctx.textAlign =
      "center";

    ctx.fillText(
      "BOSS",
      width / 2,
      y + 22,
    );
  }

  function renderShip() {
    if (!alive) return;

    const blinking =
      invuln > 0 &&
      Math.floor(
        invuln / 6,
      ) %
        2 ===
        0;

    if (blinking) {
      return;
    }

    ctx.save();

    ctx.translate(
      ship.x,
      ship.y,
    );

    ctx.rotate(
      ship.angle,
    );

    if (
      shieldCharges > 0
    ) {
      ctx.strokeStyle =
        "#7dd3fc";

      ctx.globalAlpha =
        0.35 +
        Math.sin(
          performance.now() *
            0.008,
        ) *
          0.1;

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        19,
        0,
        Math.PI * 2,
      );

      ctx.stroke();

      ctx.globalAlpha =
        1;
    }

    if (ship.thrust) {
      const flame =
        8 +
        Math.random() * 10;

      ctx.strokeStyle =
        pal.gold;

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.moveTo(
        -6,
        0,
      );

      ctx.lineTo(
        -10 -
          flame,
        0,
      );

      ctx.stroke();
    }

    ctx.strokeStyle =
      pal.neon;

    ctx.lineWidth = 2;
    ctx.lineJoin =
      "round";

    ctx.beginPath();

    ctx.moveTo(
      17,
      0,
    );

    ctx.lineTo(
      -10,
      -10,
    );

    ctx.lineTo(
      -5,
      0,
    );

    ctx.lineTo(
      -10,
      10,
    );

    ctx.closePath();

    ctx.stroke();

    ctx.globalAlpha =
      0.35;

    ctx.beginPath();

    ctx.moveTo(
      3,
      0,
    );

    ctx.lineTo(
      -4,
      0,
    );

    ctx.stroke();

    ctx.restore();
  }

  function renderPowerUps() {
    for (const powerUp of powerUps) {
      const color =
        getPowerUpColor(
          powerUp.type,
        );

      const radius =
        8 +
        Math.sin(
          powerUp.pulse,
        ) *
          1.5;

      ctx.save();

      ctx.translate(
        powerUp.x,
        powerUp.y,
      );

      ctx.strokeStyle =
        color;

      ctx.lineWidth = 2;

      ctx.globalAlpha =
        0.9;

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        radius,
        0,
        Math.PI * 2,
      );

      ctx.stroke();

      ctx.fillStyle =
        color;

      ctx.font =
        "bold 9px system-ui";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.fillText(
        getPowerUpLabel(
          powerUp.type,
        ),
        0,
        0,
      );

      ctx.restore();
    }
  }

  function renderParticles() {
    for (const particle of particles) {
      const alpha =
        clamp(
          particle.life /
            particle.maxLife,
          0,
          1,
        );

      ctx.save();

      ctx.globalAlpha =
        alpha;

      ctx.fillStyle =
        particle.kind ===
        "smoke"
          ? pal.muted
          : pal.gold;

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

  function renderHud() {
    ctx.save();

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "13px system-ui";

    ctx.textAlign =
      "left";

    ctx.fillText(
      `LIVES ${"▲".repeat(
        Math.max(
          0,
          lives,
        ),
      )}`,
      12,
      20,
    );

    ctx.fillText(
      `WAVE ${level}`,
      12,
      39,
    );

    ctx.textAlign =
      "right";

    ctx.fillText(
      `SCORE ${score}`,
      width - 12,
      20,
    );

    ctx.fillText(
      `BEST ${bestScore}`,
      width - 12,
      39,
    );

    if (combo >= 2) {
      ctx.textAlign =
        "center";

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "bold 15px system-ui";

      ctx.fillText(
        `COMBO x${
          combo >= 20 ? 5 :
          combo >= 12 ? 4 :
          combo >= 8 ? 3 :
          combo >= 4 ? 2 :
          1
        }`,
        width / 2,
        22,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        `${combo} KILLS`,
        width / 2,
        37,
      );
    }

    if (fever) {
      ctx.textAlign =
        "center";

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "bold 17px system-ui";

      ctx.fillText(
        "ASTEROID FEVER",
        width / 2,
        59,
      );
    }

    const effectLabels: string[] =
      [];

    if (
      activePowerUps.rapid >
      0
    ) {
      effectLabels.push(
        "RAPID",
      );
    }

    if (
      activePowerUps.triple >
      0
    ) {
      effectLabels.push(
        "TRIPLE",
      );
    }

    if (
      activePowerUps.overdrive >
      0
    ) {
      effectLabels.push(
        "OVERDRIVE",
      );
    }

    if (
      activePowerUps.piercing >
      0
    ) {
      effectLabels.push(
        "PIERCE",
      );
    }

    if (
      activePowerUps.multiplier >
      0
    ) {
      effectLabels.push(
        "2X SCORE",
      );
    }

    if (
      effectLabels.length >
      0
    ) {
      ctx.textAlign =
        "left";

      ctx.fillStyle =
        pal.neon;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        effectLabels.join(
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
      "rgba(0,0,0,0.72)";

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
      "bold 23px system-ui";

    ctx.fillText(
      "CHOOSE AN UPGRADE",
      width / 2,
      55,
    );

    const cardWidth =
      Math.min(
        155,
        width * 0.27,
      );

    const gap = 12;

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
        110,
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
        "bold 12px system-ui";

      ctx.fillText(
        upgrade.name,
        x +
          cardWidth / 2,
        y + 47,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        upgrade.description,
        x +
          cardWidth / 2,
        y + 70,
      );
    }

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "12px system-ui";

    ctx.fillText(
      "Press 1, 2 or 3",
      width / 2,
      height - 28,
    );
  }

  function renderGameOver() {
    if (alive) {
      return;
    }

    ctx.fillStyle =
      "rgba(0,0,0,0.62)";

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
      height / 2 - 34,
    );

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "14px system-ui";

    ctx.fillText(
      `Score: ${score}`,
      width / 2,
      height / 2,
    );

    ctx.fillText(
      `Wave: ${level}`,
      width / 2,
      height / 2 + 22,
    );

    if (maxCombo > 1) {
      ctx.fillText(
        `Best combo: ${maxCombo}`,
        width / 2,
        height / 2 + 44,
      );
    }

    ctx.fillStyle =
      pal.neon;

    ctx.font =
      "12px system-ui";

    ctx.fillText(
      "Press SPACE or R to restart",
      width / 2,
      height / 2 + 72,
    );
  }

  function render() {
    ctx.save();

    if (
      screenShake > 0
    ) {
      const shakeX =
        (Math.random() -
          0.5) *
        screenShake;

      const shakeY =
        (Math.random() -
          0.5) *
        screenShake;

      ctx.translate(
        shakeX,
        shakeY,
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

    // Background stars
    ctx.save();

    ctx.fillStyle =
      pal.muted;

    ctx.globalAlpha =
      0.16;

    for (
      let i = 0;
      i < 36;
      i++
    ) {
      const x =
        (i * 83 +
          level * 17) %
        width;

      const y =
        (i * 47 +
          level * 11) %
        height;

      ctx.fillRect(
        x,
        y,
        1,
        1,
      );
    }

    ctx.restore();

    renderParticles();

    for (const rock of rocks) {
      renderRock(
        rock,
      );
    }

    renderPowerUps();

    if (boss) {
      renderBoss();
    }

    // Bullets
    for (const bullet of bullets) {
      ctx.save();

      const alpha =
        clamp(
          bullet.life / 58,
          0,
          1,
        );

      ctx.globalAlpha =
        alpha;

      ctx.strokeStyle =
        bullet.piercing
          ? "#f472b6"
          : "#ffffff";

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.moveTo(
        bullet.x -
          bullet.vx *
            0.8,
        bullet.y -
          bullet.vy *
            0.8,
      );

      ctx.lineTo(
        bullet.x,
        bullet.y,
      );

      ctx.stroke();

      ctx.restore();
    }

    renderShip();

    ctx.restore();

    renderHud();

    renderUpgradeSelection();

    renderGameOver();

    if (
      hitFlash > 0
    ) {
      ctx.save();

      ctx.fillStyle =
        `rgba(255,255,255,${
          hitFlash /
          30
        })`;

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );

      ctx.restore();
    }
  }

  const keyDown = (
    e: KeyboardEvent,
  ) => {
    const key =
      e.key.toLowerCase();

    if (
      key === " " ||
      key === "spacebar"
    ) {
      e.preventDefault();

      if (e.repeat) {
        return;
      }

      if (!alive) {
        reset();
      } else {
        fire();
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

      const index =
        Number(key) - 1;

      const upgrade =
        upgradeChoices[index];

      if (upgrade) {
        applyUpgrade(
          upgrade,
        );
      }

      return;
    }

    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "w",
        "a",
        "s",
        "d",
      ].includes(key)
    ) {
      keys.add(key);
      e.preventDefault();
    }

    if (
      key === "r" &&
      !alive
    ) {
      e.preventDefault();
      reset();
    }
  };

  const keyUp = (
    e: KeyboardEvent,
  ) => {
    keys.delete(
      e.key.toLowerCase(),
    );
  };

  const clearKeys = () => {
    keys.clear();
  };

  function reset() {
    clearKeys();

    rocks = [];
    bullets = [];
    particles = [];
    powerUps = [];
    boss = null;

    score = 0;
    lives = 3;
    level = 1;
    maxCombo = 0;

    alive = true;

    invuln = 110;
    fireCooldown = 0;
    nextWaveTimer = 0;
    gameOverTimer = 0;

    combo = 0;
    comboTimer = 0;

    fever = false;
    feverTimer = 0;

    screenShake = 0;
    hitFlash = 0;

    upgradeSelection = false;
    upgradeChoices = [];

    shieldCharges = 0;

    fireUpgrade = 0;
    engineUpgrade = 0;
    ammoUpgrade = 0;
    multiplierUpgrade = 0;
    piercingUpgrade = 0;

    resetPowerUps();
    resetShip();

    spawnWave();

    onScore(0);
    onStatus?.("");
  }

  window.addEventListener(
    "keydown",
    keyDown,
  );

  window.addEventListener(
    "keyup",
    keyUp,
  );

  window.addEventListener(
    "blur",
    clearKeys,
  );

  reset();

  const loop = createLoop(
    update,
    render,
  );

  return {
    pause: () => {
      clearKeys();
      loop.pause();
    },

    resume: () => {
      clearKeys();
      loop.resume();
    },

    restart: () => {
      reset();
    },

    destroy: () => {
      clearKeys();

      loop.stop();

      window.removeEventListener(
        "keydown",
        keyDown,
      );

      window.removeEventListener(
        "keyup",
        keyUp,
      );

      window.removeEventListener(
        "blur",
        clearKeys,
      );
    },
  };
};

export default asteroids;
