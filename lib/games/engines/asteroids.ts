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
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
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

  let score = 0;
  let bestScore = 0;
  let lives = 3;
  let level = 1;

  let alive = true;
  let invuln = 0;
  let fireCooldown = 0;
  let nextWaveTimer = 0;

  const keys = new Set<string>();

  const MAX_BULLETS = 6;
  const BULLET_SPEED = 9;
  const BULLET_LIFE = 55;

  function wrap(o: { x: number; y: number }, margin = 0) {
    if (o.x < -margin) {
      o.x = width + margin;
    } else if (o.x > width + margin) {
      o.x = -margin;
    }

    if (o.y < -margin) {
      o.y = height + margin;
    } else if (o.y > height + margin) {
      o.y = -margin;
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
    if (size === 3) return 42;
    if (size === 2) return 25;
    return 14;
  }

  function createRock(
    x: number,
    y: number,
    size: number,
  ): Rock {
    const r = getRockRadius(size);

    const vertexCount =
      size === 3 ? 11 :
      size === 2 ? 10 :
      9;

    const verts = Array.from(
      { length: vertexCount },
      () => 0.75 + Math.random() * 0.4,
    );

    const angle = Math.random() * Math.PI * 2;

    const baseSpeed =
      size === 3 ? 0.7 :
      size === 2 ? 1.25 :
      2;

    const speed =
      baseSpeed +
      Math.random() * 0.9 +
      level * 0.03;

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r,
      verts,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.025,
      size,
    };
  }

  function spawnWave() {
    rocks = [];

    const count = Math.min(12, 3 + level);

    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);

      let x = 0;
      let y = 0;

      if (side === 0) {
        x = 0;
        y = Math.random() * height;
      } else if (side === 1) {
        x = width;
        y = Math.random() * height;
      } else if (side === 2) {
        x = Math.random() * width;
        y = 0;
      } else {
        x = Math.random() * width;
        y = height;
      }

      rocks.push(createRock(x, y, 3));
    }

    nextWaveTimer = 0;
    onStatus?.(`Wave ${level}`);
  }

  function createExplosion(
    x: number,
    y: number,
    amount: number,
    strength = 1,
  ) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed =
        (0.5 + Math.random() * 2.5) * strength;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 25,
        maxLife: 45,
        size: 1 + Math.random() * 2,
      });
    }
  }

  function resetShip() {
    ship.x = width / 2;
    ship.y = height / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    ship.thrust = false;
    invuln = 100;
    fireCooldown = 0;
  }

  function reset() {
    keys.clear();

    rocks = [];
    bullets = [];
    particles = [];

    score = 0;
    lives = 3;
    level = 1;
    alive = true;
    invuln = 100;
    fireCooldown = 0;
    nextWaveTimer = 0;

    resetShip();
    spawnWave();

    onScore(0);
    onStatus?.("");
  }

  function fire() {
    if (!alive) return;
    if (fireCooldown > 0) return;
    if (bullets.length >= MAX_BULLETS) return;

    const cos = Math.cos(ship.angle);
    const sin = Math.sin(ship.angle);

    bullets.push({
      x: ship.x + cos * 15,
      y: ship.y + sin * 15,
      vx: cos * BULLET_SPEED + ship.vx * 0.35,
      vy: sin * BULLET_SPEED + ship.vy * 0.35,
      life: BULLET_LIFE,
    });

    fireCooldown = 7;

    beep(880, 0.035);
  }

  function destroyRock(index: number) {
    const rock = rocks[index];

    if (!rock) return;

    rocks.splice(index, 1);

    const points =
      rock.size === 3 ? 20 :
      rock.size === 2 ? 50 :
      100;

    score += points;
    bestScore = Math.max(bestScore, score);

    onScore(score);

    createExplosion(
      rock.x,
      rock.y,
      rock.size === 3 ? 12 : 8,
      rock.size === 3 ? 1 : 0.8,
    );

    beep(
      rock.size === 3 ? 260 :
      rock.size === 2 ? 350 :
      500,
      0.05,
      "sawtooth",
    );

    if (rock.size > 1) {
      const childSize = rock.size - 1;

      rocks.push(
        createRock(rock.x, rock.y, childSize),
        createRock(rock.x, rock.y, childSize),
      );
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;

      p.vx *= 0.97;
      p.vy *= 0.97;

      p.life--;

      wrap(p);

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function update() {
    updateParticles();

    if (!alive) return;

    if (keys.has("arrowleft") || keys.has("a")) {
      ship.angle -= 0.085;
    }

    if (keys.has("arrowright") || keys.has("d")) {
      ship.angle += 0.085;
    }

    ship.thrust =
      keys.has("arrowup") ||
      keys.has("w");

    if (ship.thrust) {
      ship.vx += Math.cos(ship.angle) * 0.17;
      ship.vy += Math.sin(ship.angle) * 0.17;
    }

    ship.vx *= 0.992;
    ship.vy *= 0.992;

    const shipSpeed = Math.hypot(
      ship.vx,
      ship.vy,
    );

    const maxSpeed = 6.5;

    if (shipSpeed > maxSpeed) {
      ship.vx =
        (ship.vx / shipSpeed) * maxSpeed;

      ship.vy =
        (ship.vy / shipSpeed) * maxSpeed;
    }

    ship.x += ship.vx;
    ship.y += ship.vy;

    wrap(ship, 8);

    if (invuln > 0) {
      invuln--;
    }

    if (fireCooldown > 0) {
      fireCooldown--;
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];

      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      bullet.life--;

      wrap(bullet);

      if (bullet.life <= 0) {
        bullets.splice(i, 1);
      }
    }

    // Update rocks
    for (const rock of rocks) {
      rock.x += rock.vx;
      rock.y += rock.vy;
      rock.rotation += rock.spin;

      wrap(rock, rock.r);
    }

    // Bullet -> asteroid collision
    for (let i = rocks.length - 1; i >= 0; i--) {
      const rock = rocks[i];

      let hit = false;

      for (
        let j = bullets.length - 1;
        j >= 0;
        j--
      ) {
        const bullet = bullets[j];

        if (
          distanceWrapped(
            rock.x,
            rock.y,
            bullet.x,
            bullet.y,
          ) < rock.r
        ) {
          bullets.splice(j, 1);
          destroyRock(i);
          hit = true;
          break;
        }
      }

      if (hit) continue;
    }

    // Ship -> asteroid collision
    if (invuln <= 0) {
      for (const rock of rocks) {
        const distance = distanceWrapped(
          rock.x,
          rock.y,
          ship.x,
          ship.y,
        );

        if (distance < rock.r + 9) {
          lives--;

          createExplosion(
            ship.x,
            ship.y,
            24,
            1.6,
          );

          beep(120, 0.25, "sawtooth");

          if (lives <= 0) {
            alive = false;

            bestScore = Math.max(
              bestScore,
              score,
            );

            onStatus?.("Game over");
            onGameOver(score, 0);
          } else {
            resetShip();

            onStatus?.(
              `${lives} ${
                lives === 1 ? "life" : "lives"
              } remaining`,
            );
          }

          break;
        }
      }
    }

    // Next wave
    if (rocks.length === 0 && nextWaveTimer === 0) {
      nextWaveTimer = 45;
    }

    if (nextWaveTimer > 0) {
      nextWaveTimer--;

      if (nextWaveTimer === 1) {
        level++;
        spawnWave();
      }
    }
  }

  function renderRock(rock: Rock) {
    ctx.save();

    ctx.translate(
      rock.x,
      rock.y,
    );

    ctx.rotate(rock.rotation);

    ctx.strokeStyle = pal.neon;
    ctx.lineWidth =
      rock.size === 3 ? 1.6 : 1.3;

    ctx.lineJoin = "round";

    ctx.beginPath();

    for (
      let i = 0;
      i < rock.verts.length;
      i++
    ) {
      const angle =
        (i / rock.verts.length) *
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
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  function renderShip() {
    if (!alive) return;

    const blinking =
      invuln > 0 &&
      Math.floor(invuln / 6) % 2 === 0;

    if (blinking) return;

    ctx.save();

    ctx.translate(
      ship.x,
      ship.y,
    );

    ctx.rotate(ship.angle);

    if (ship.thrust) {
      ctx.strokeStyle = pal.gold;
      ctx.lineWidth = 2;

      const flameLength =
        8 + Math.random() * 8;

      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(
        -10 - flameLength,
        0,
      );
      ctx.stroke();
    }

    ctx.strokeStyle = pal.neon;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(
      0,
      0,
      width,
      height,
    );

    // Background stars
    ctx.save();

    ctx.fillStyle = pal.muted;
    ctx.globalAlpha = 0.18;

    for (let i = 0; i < 30; i++) {
      const x =
        (i * 83 + level * 11) % width;

      const y =
        (i * 47 + level * 17) % height;

      ctx.fillRect(
        x,
        y,
        1,
        1,
      );
    }

    ctx.restore();

    // Particles
    for (const particle of particles) {
      ctx.save();

      ctx.globalAlpha =
        Math.max(
          0,
          particle.life /
            particle.maxLife,
        );

      ctx.fillStyle = pal.gold;

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

    // Asteroids
    for (const rock of rocks) {
      renderRock(rock);
    }

    // Bullets
    for (const bullet of bullets) {
      ctx.save();

      ctx.globalAlpha =
        Math.max(
          0,
          bullet.life / BULLET_LIFE,
        );

      ctx.fillStyle = "#ffffff";

      ctx.beginPath();

      ctx.arc(
        bullet.x,
        bullet.y,
        2.4,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      ctx.restore();
    }

    renderShip();

    // HUD
    ctx.save();

    ctx.fillStyle = pal.muted;
    ctx.font = "13px system-ui";

    ctx.textAlign = "left";

    ctx.fillText(
      `LIVES ${"▲".repeat(
        Math.max(0, lives),
      )}`,
      12,
      20,
    );

    ctx.fillText(
      `WAVE ${level}`,
      12,
      39,
    );

    ctx.textAlign = "right";

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

    // Wave transition
    if (
      alive &&
      rocks.length === 0 &&
      nextWaveTimer > 0
    ) {
      ctx.textAlign = "center";

      ctx.fillStyle = pal.neon;
      ctx.font = "bold 18px system-ui";

      ctx.fillText(
        `WAVE ${level} CLEAR`,
        width / 2,
        height / 2 - 8,
      );

      ctx.fillStyle = pal.muted;
      ctx.font = "12px system-ui";

      ctx.fillText(
        "Get ready...",
        width / 2,
        height / 2 + 16,
      );
    }

    // Game over
    if (!alive) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );

      ctx.textAlign = "center";

      ctx.fillStyle = pal.neon;
      ctx.font = "bold 28px system-ui";

      ctx.fillText(
        "GAME OVER",
        width / 2,
        height / 2 - 28,
      );

      ctx.fillStyle = pal.muted;
      ctx.font = "14px system-ui";

      ctx.fillText(
        `Score: ${score}`,
        width / 2,
        height / 2 + 2,
      );

      ctx.fillText(
        "Press SPACE or R to restart",
        width / 2,
        height / 2 + 28,
      );
    }

    ctx.restore();
  }

  const keyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    if (key === " ") {
      e.preventDefault();

      if (e.repeat) return;

      if (alive) {
        fire();
      } else {
        reset();
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

    if (key === "r" && !alive) {
      e.preventDefault();
      reset();
    }
  };

  const keyUp = (e: KeyboardEvent) => {
    keys.delete(
      e.key.toLowerCase(),
    );
  };

  const clearKeys = () => {
    keys.clear();
  };

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
      clearKeys();
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