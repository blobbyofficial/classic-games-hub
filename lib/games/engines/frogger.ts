import type { GameEngineFactory } from "@/types";
import {
  beep,
  createLoop,
  palette,
  roundRect,
  tune,
} from "../helpers";

type LaneType = "road" | "river";

type VehicleKind =
  | "car"
  | "van"
  | "truck"
  | "bus"
  | "sports";

type WaterKind =
  | "log"
  | "turtle"
  | "smallLog";

type Weather =
  | "day"
  | "evening"
  | "night";

type PowerUpType =
  | "shield"
  | "slow"
  | "superHop"
  | "score";

interface LaneObject {
  x: number;
  speed: number;
  width: number;
  kind: VehicleKind | WaterKind;
  color: string;
  laneRow: number;
  passed: boolean;
  variant: number;
}

interface Lane {
  row: number;
  type: LaneType;
  speed: number;
  objects: LaneObject[];
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
  big: boolean;
}

interface Fly {
  x: number;
  y: number;
  life: number;
  pulse: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  life: number;
  pulse: number;
}

interface Frog {
  col: number;
  row: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hopFrame: number;
  hopping: boolean;
  facing: number;
  squash: number;
  riding: LaneObject | null;
}

const frogger: GameEngineFactory = ({
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

  const COLS = 13;
  const ROWS = 13;

  const rh = height / ROWS;
  const cw = width / COLS;

  const PACE = tune(difficulty, {
    easy: 0.78,
    regular: 1,
    hard: 1.25,
  });

  /*
   * IMPORTANT:
   * This game uses frame-based updates, matching the rest
   * of the Classic Games Hub engine. Speeds below are pixels
   * per update frame, not pixels per second.
   */

  const HOP_FRAMES = 8;

  const frogRadius =
    Math.min(cw, rh) * 0.27;

  let frog: Frog = {
    col: 6,
    row: 12,
    x: cw * 6.5,
    y: rowY(12),
    targetX: cw * 6.5,
    targetY: rowY(12),
    hopFrame: HOP_FRAMES,
    hopping: false,
    facing: -1,
    squash: 0,
    riding: null,
  };

  let lanes: Lane[] = [];

  let score = 0;
  let lives = 3;

  let crossing = 1;
  let furthestRow = 12;

  let combo = 0;
  let comboTimer = 0;
  let bestCombo = 0;

  let alive = true;
  let busy = false;

  let deathTimer = 0;
  let goalTimer = 0;

  let screenShake = 0;
  let flash = 0;

  let weather: Weather = "day";

  let fly: Fly | null = null;
  let powerUp: PowerUp | null = null;

  let flyTimer = 280;
  let powerTimer = 420;

  let shieldTimer = 0;
  let slowTimer = 0;
  let superHopTimer = 0;
  let scoreBoostTimer = 0;

  let queuedMove:
    | {
        dc: number;
        dr: number;
      }
    | null = null;

  let specialEvent = "";
  let specialEventTimer = 0;

  function rowY(row: number) {
    return (
      row * rh +
      rh / 2
    );
  }

  function randomRange(
    min: number,
    max: number,
  ) {
    return (
      min +
      Math.random() *
        (max - min)
    );
  }

  function randomItem<T>(
    values: T[],
  ): T {
    return values[
      Math.floor(
        Math.random() *
          values.length,
      )
    ];
  }

  function clamp(
    value: number,
    min: number,
    max: number,
  ) {
    return Math.max(
      min,
      Math.min(max, value),
    );
  }

  function zoneForRow(
    row: number,
  ) {
    if (row === 0) {
      return "goal";
    }

    if (
      row >= 1 &&
      row <= 5
    ) {
      return "river";
    }

    if (
      row >= 7 &&
      row <= 11
    ) {
      return "road";
    }

    return "safe";
  }

  function getVehicleColor(
    kind: VehicleKind,
  ) {
    switch (kind) {
      case "truck":
        return "#38bdf8";

      case "bus":
        return "#fbbf24";

      case "van":
        return "#a78bfa";

      case "sports":
        return "#f43f5e";

      default:
        return "#ef4444";
    }
  }

  function resetFrog() {
    frog = {
      col: 6,
      row: 12,
      x: cw * 6.5,
      y: rowY(12),
      targetX: cw * 6.5,
      targetY: rowY(12),
      hopFrame: HOP_FRAMES,
      hopping: false,
      facing: -1,
      squash: 0,
      riding: null,
    };

    furthestRow = 12;
    queuedMove = null;
  }

  function createParticle(
    x: number,
    y: number,
    color: string,
    amount = 1,
  ) {
    for (
      let i = 0;
      i < amount;
      i++
    ) {
      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        randomRange(
          0.5,
          2.8,
        );

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
          randomRange(
            15,
            32,
          ),
        maxLife: 32,
        size:
          randomRange(
            1,
            3,
          ),
        color,
      });
    }
  }

  function burst(
    x: number,
    y: number,
    color: string,
    count = 12,
  ) {
    createParticle(
      x,
      y,
      color,
      count,
    );
  }

  function addFloatingText(
    x: number,
    y: number,
    text: string,
    big = false,
  ) {
    floatingTexts.push({
      x,
      y,
      text,
      life: big ? 40 : 28,
      maxLife: big ? 40 : 28,
      big,
    });
  }

  function addScore(
    base: number,
    x?: number,
    y?: number,
    label?: string,
  ) {
    const comboMultiplier =
      combo >= 8
        ? 3
        : combo >= 5
          ? 2
          : 1;

    const scoreMultiplier =
      scoreBoostTimer > 0
        ? 2
        : 1;

    const value = Math.round(
      base *
        comboMultiplier *
        scoreMultiplier,
    );

    score += value;

    onScore(score);

    if (
      x !== undefined &&
      y !== undefined
    ) {
      addFloatingText(
        x,
        y,
        label
          ? `${label} +${value}`
          : `+${value}`,
        value >= 100,
      );
    }
  }

  function beginCombo() {
    combo++;
    comboTimer =
      100;

    bestCombo =
      Math.max(
        bestCombo,
        combo,
      );

    if (combo >= 4) {
      addFloatingText(
        frog.x,
        frog.y - rh * 0.7,
        `FLOW x${combo}`,
        true,
      );
    }
  }

  function resetCombo() {
    combo = 0;
    comboTimer = 0;
  }

  function buildLanes() {
    lanes = [];

    const crossingScale =
      1 +
      Math.min(
        0.28,
        (crossing - 1) *
          0.035,
      );

    const roadConfigs: {
      row: number;
      speed: number;
      spacing: number;
      kinds: VehicleKind[];
    }[] = [
      {
        row: 7,
        speed:
          -2.2 *
          PACE *
          crossingScale,
        spacing: 190,
        kinds: [
          "car",
          "sports",
        ],
      },
      {
        row: 8,
        speed:
          1.55 *
          PACE *
          crossingScale,
        spacing: 250,
        kinds: [
          "car",
          "van",
        ],
      },
      {
        row: 9,
        speed:
          -1.25 *
          PACE *
          crossingScale,
        spacing: 300,
        kinds: [
          "truck",
          "bus",
          "van",
        ],
      },
      {
        row: 10,
        speed:
          2.7 *
          PACE *
          crossingScale,
        spacing: 215,
        kinds: [
          "sports",
          "car",
        ],
      },
      {
        row: 11,
        speed:
          -1.9 *
          PACE *
          crossingScale,
        spacing: 240,
        kinds: [
          "car",
          "van",
          "truck",
        ],
      },
    ];

    for (
      const config of roadConfigs
    ) {
      const objects: LaneObject[] =
        [];

      const count =
        Math.ceil(
          width /
            config.spacing,
        ) + 2;

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const kind =
          randomItem(
            config.kinds,
          );

        const multiplier =
          kind === "truck"
            ? 1.7
            : kind === "bus"
              ? 2.0
              : kind === "van"
                ? 1.35
                : kind ===
                    "sports"
                  ? 0.78
                  : 1;

        objects.push({
          x:
            i *
              config.spacing +
            randomRange(
              -35,
              35,
            ),
          speed:
            config.speed *
            randomRange(
              0.9,
              1.1,
            ),
          width:
            cw * multiplier,
          kind,
          color:
            getVehicleColor(
              kind,
            ),
          laneRow:
            config.row,
          passed: false,
          variant:
            Math.floor(
              Math.random() *
                3,
            ),
        });
      }

      lanes.push({
        row: config.row,
        type: "road",
        speed:
          config.speed,
        objects,
      });
    }

    const riverConfigs: {
      row: number;
      speed: number;
      spacing: number;
      kind: WaterKind;
    }[] = [
      {
        row: 1,
        speed:
          1.45 *
          PACE *
          crossingScale,
        spacing: 205,
        kind: "log",
      },
      {
        row: 2,
        speed:
          -1.8 *
          PACE *
          crossingScale,
        spacing: 245,
        kind: "turtle",
      },
      {
        row: 3,
        speed:
          1.1 *
          PACE *
          crossingScale,
        spacing: 285,
        kind: "smallLog",
      },
      {
        row: 4,
        speed:
          -1.55 *
          PACE *
          crossingScale,
        spacing: 230,
        kind: "log",
      },
      {
        row: 5,
        speed:
          1.95 *
          PACE *
          crossingScale,
        spacing: 255,
        kind: "turtle",
      },
    ];

    for (
      const config of riverConfigs
    ) {
      const objects: LaneObject[] =
        [];

      const count =
        Math.ceil(
          width /
            config.spacing,
        ) + 2;

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const multiplier =
          config.kind ===
          "log"
            ? 1.8
            : config.kind ===
                "smallLog"
              ? 0.95
              : 1.35;

        objects.push({
          x:
            i *
              config.spacing +
            randomRange(
              -50,
              50,
            ),
          speed:
            config.speed *
            randomRange(
              0.92,
              1.08,
            ),
          width:
            cw * multiplier,
          kind:
            config.kind,
          color:
            config.kind ===
            "turtle"
              ? "#15803d"
              : config.kind ===
                  "smallLog"
                ? "#92400e"
                : "#a16207",
          laneRow:
            config.row,
          passed: false,
          variant:
            Math.floor(
              Math.random() *
                3,
            ),
        });
      }

      lanes.push({
        row: config.row,
        type: "river",
        speed:
          config.speed,
        objects,
      });
    }
  }

  function resetRun() {
    score = 0;
    lives = 3;
    crossing = 1;

    combo = 0;
    comboTimer = 0;
    bestCombo = 0;

    alive = true;
    busy = false;

    deathTimer = 0;
    goalTimer = 0;

    screenShake = 0;
    flash = 0;

    shieldTimer = 0;
    slowTimer = 0;
    superHopTimer = 0;
    scoreBoostTimer = 0;

    fly = null;
    powerUp = null;

    flyTimer = 300;
    powerTimer = 480;

    specialEvent = "";
    specialEventTimer = 0;

    particles = [];
    floatingTexts = [];

    weather = "day";

    buildLanes();
    resetFrog();

    onScore(0);

    onStatus?.(
      "Use the arrow keys to cross",
    );
  }

  function reset() {
    resetRun();
  }

  function currentFrogRow() {
    return frog.row;
  }

  function requestMove(
    dc: number,
    dr: number,
  ) {
    if (!alive) {
      return;
    }

    if (
      deathTimer > 0 ||
      goalTimer > 0
    ) {
      return;
    }

    if (frog.hopping) {
      // Queue only one move. This makes controls
      // responsive without allowing accidental
      // multi-hop spam.
      queuedMove = {
        dc,
        dr,
      };

      return;
    }

    startHop(
      dc,
      dr,
    );
  }

  function startHop(
    dc: number,
    dr: number,
  ) {
    const distance =
      superHopTimer > 0
        ? 2
        : 1;

    const nextCol = clamp(
      frog.col +
        dc *
          distance,
      0,
      COLS - 1,
    );

    const nextRow = clamp(
      frog.row +
        dr *
          distance,
      0,
      ROWS - 1,
    );

    if (
      nextCol ===
        frog.col &&
      nextRow ===
        frog.row
    ) {
      return;
    }

    frog.targetX =
      nextCol * cw +
      cw / 2;

    frog.targetY =
      rowY(nextRow);

    frog.hopFrame = 0;
    frog.hopping = true;
    frog.riding = null;

    frog.facing =
      dc === 0
        ? frog.facing
        : dc > 0
          ? 1
          : -1;

    beep(
      540,
      0.03,
    );
  }

  function updateHop() {
    if (
      !frog.hopping
    ) {
      return;
    }

    frog.hopFrame++;

    const p =
      clamp(
        frog.hopFrame /
          HOP_FRAMES,
        0,
        1,
      );

    const eased =
      p < 0.5
        ? 2 * p * p
        : 1 -
          Math.pow(
            -2 * p + 2,
            2,
          ) /
            2;

    const startX =
      frog.x;

    const startY =
      frog.y;

    frog.x =
      startX +
      (frog.targetX -
        startX) *
        Math.min(
          1,
          eased * 1.8,
        );

    frog.y =
      startY +
      (frog.targetY -
        startY) *
        eased;

    frog.squash =
      Math.sin(
        p * Math.PI,
      );

    if (
      frog.hopFrame >=
      HOP_FRAMES
    ) {
      frog.col =
        Math.round(
          frog.targetX /
            cw -
            0.5,
        );

      frog.row =
        clamp(
          Math.round(
            (frog.targetY -
              rh / 2) /
              rh,
          ),
          0,
          ROWS - 1,
        );

      frog.x =
        frog.targetX;

      frog.y =
        frog.targetY;

      frog.hopping =
        false;

      frog.squash = 1;

      onLanding();

      if (
        queuedMove &&
        alive &&
        deathTimer <=
          0 &&
        goalTimer <=
          0
      ) {
        const next =
          queuedMove;

        queuedMove =
          null;

        startHop(
          next.dc,
          next.dr,
        );
      }
    }
  }

  function onLanding() {
    const row =
      frog.row;

    if (
      row <
      furthestRow
    ) {
      const distance =
        furthestRow -
        row;

      furthestRow =
        row;

      beginCombo();

      addScore(
        10 +
          distance * 5,
        frog.x,
        frog.y -
          rh * 0.55,
      );
    }

    if (
      row === 0
    ) {
      reachGoal();
      return;
    }

    collectIfNearby();

    if (
      row >= 7 &&
      row <= 11
    ) {
      checkRoadCollision();
    }

    if (
      row >= 1 &&
      row <= 5
    ) {
      checkRiverSupport();
    }
  }

  function getCurrentLane() {
    return lanes.find(
      (lane) =>
        lane.row ===
        frog.row,
    );
  }

  function isOnObject(
    object: LaneObject,
  ) {
    const margin =
      frogSize * 0.42;

    return (
      frog.x +
        margin >
        object.x &&
      frog.x -
        margin <
        object.x +
          object.width
    );
  }

  function checkRoadCollision() {
    const lane =
      getCurrentLane();

    if (
      !lane ||
      lane.type !==
        "road"
    ) {
      return;
    }

    for (
      const object of lane.objects
    ) {
      const objectTop =
        rowY(
          lane.row,
        ) -
        rh * 0.28;

      const objectBottom =
        rowY(
          lane.row,
        ) +
        rh * 0.28;

      const hit =
        frog.x +
          frogSize *
            0.35 >
          object.x &&
        frog.x -
          frogSize *
            0.35 <
          object.x +
            object.width &&
        frog.y +
          frogSize *
            0.35 >
          objectTop &&
        frog.y -
          frogSize *
            0.35 <
          objectBottom;

      if (!hit) {
        continue;
      }

      if (
        shieldTimer > 0
      ) {
        shieldTimer = 0;

        burst(
          frog.x,
          frog.y,
          "#7dd3fc",
          18,
        );

        addFloatingText(
          frog.x,
          frog.y -
            rh * 0.55,
          "SHIELD!",
          true,
        );

        object.x +=
          object.speed >
          0
            ? 55
            : -55;

        screenShake = 5;

        return;
      }

      die("car");
      return;
    }
  }

  function checkRiverSupport() {
    const lane =
      getCurrentLane();

    if (
      !lane ||
      lane.type !==
        "river"
    ) {
      return;
    }

    const support =
      lane.objects.find(
        (object) =>
          isOnObject(
            object,
          ),
      );

    if (
      support ===
      undefined
    ) {
      if (
        shieldTimer > 0
      ) {
        shieldTimer = 0;

        burst(
          frog.x,
          frog.y,
          "#7dd3fc",
          20,
        );

        addFloatingText(
          frog.x,
          frog.y -
            rh * 0.55,
          "SAVED!",
          true,
        );

        return;
      }

      die("water");
      return;
    }

    frog.riding =
      support;
  }

  function updateRiding() {
    if (
      frog.hopping ||
      frog.riding ===
        null
    ) {
      return;
    }

    const object =
      frog.riding;

    const lane =
      getCurrentLane();

    if (
      !lane ||
      lane.type !==
        "river"
    ) {
      frog.riding =
        null;

      return;
    }

    const actualSpeed =
      slowTimer > 0
        ? object.speed *
          0.55
        : object.speed;

    frog.x +=
      actualSpeed;

    if (
      specialEvent ===
      "FLOOD"
    ) {
      frog.x +=
        actualSpeed *
        0.35;
    }

    if (
      frog.x <
        -frogSize ||
      frog.x >
        width +
          frogSize
    ) {
      die("water");
      return;
    }

    if (
      !isOnObject(
        object,
      )
    ) {
      frog.riding =
        null;

      checkRiverSupport();
    }
  }

  function updateLanes() {
    for (
      const lane of lanes
    ) {
      let speedMultiplier =
        slowTimer > 0
          ? 0.55
          : 1;

      if (
        specialEvent ===
        "RUSH HOUR" &&
        lane.type ===
          "road"
      ) {
        speedMultiplier *=
          1.35;
      }

      if (
        specialEvent ===
        "FLOOD" &&
        lane.type ===
          "river"
      ) {
        speedMultiplier *=
          1.35;
      }

      for (
        const object of lane.objects
      ) {
        object.x +=
          object.speed *
          speedMultiplier;

        if (
          object.x >
          width + 40
        ) {
          object.x =
            -object.width -
            randomRange(
              20,
              100,
            );

          object.passed =
            false;
        } else if (
          object.x <
          -object.width -
            40
        ) {
          object.x =
            width +
            randomRange(
              20,
              100,
            );

          object.passed =
            false;
        }
      }
    }
  }

  function die(
    reason:
      | "car"
      | "water"
      | "edge",
  ) {
    if (
      deathTimer > 0 ||
      !alive
    ) {
      return;
    }

    busy = true;
    deathTimer = 34;

    queuedMove = null;
    frog.riding = null;

    resetCombo();

    screenShake = 8;
    flash = 5;

    if (
      reason ===
      "water"
    ) {
      burst(
        frog.x,
        frog.y,
        "#60a5fa",
        24,
      );

      addFloatingText(
        frog.x,
        frog.y,
        "SPLASH!",
        true,
      );

      beep(
        180,
        0.18,
        "sawtooth",
      );
    } else {
      burst(
        frog.x,
        frog.y,
        "#f87171",
        22,
      );

      addFloatingText(
        frog.x,
        frog.y,
        "SMASH!",
        true,
      );

      beep(
        120,
        0.22,
        "sawtooth",
      );
    }
  }

  function finishDeath() {
    lives--;

    if (
      lives <= 0
    ) {
      alive = false;
      busy = false;
      deathTimer = 0;

      onStatus?.(
        "Game over",
      );

      onGameOver(
        score,
        crossing,
      );

      return;
    }

    resetFrog();

    busy = false;
    deathTimer = 0;

    onStatus?.(
      `${lives} ${
        lives === 1
          ? "life"
          : "lives"
      } remaining`,
    );
  }

  function reachGoal() {
    if (
      goalTimer > 0 ||
      !alive
    ) {
      return;
    }

    goalTimer = 50;
    busy = true;

    beginCombo();

    addScore(
      250 +
        crossing * 50,
      frog.x,
      frog.y,
      "CROSSING",
    );

    burst(
      frog.x,
      frog.y,
      "#4ade80",
      24,
    );

    addFloatingText(
      width / 2,
      height *
        0.18,
      "CROSSING COMPLETE!",
      true,
    );

    beep(
      660,
      0.08,
    );

    setTimeout(
      () =>
        beep(
          880,
          0.1,
        ),
      80,
    );
  }

  function finishGoal() {
    crossing++;

    weather =
      crossing >= 7
        ? "night"
        : crossing >= 4
          ? "evening"
          : "day";

    resetFrog();

    buildLanes();

    fly = null;
    powerUp = null;

    flyTimer =
      Math.max(
        180,
        380 -
          crossing * 12,
      );

    powerTimer =
      420;

    specialEvent =
      getSpecialEvent();

    specialEventTimer =
      specialEvent
        ? 600
        : 0;

    busy = false;
    goalTimer = 0;

    onStatus?.(
      specialEvent
        ? `${specialEvent}!`
        : `Crossing ${crossing}`,
    );
  }

  function getSpecialEvent() {
    if (
      crossing <
        3 ||
      Math.random() >
        0.38
    ) {
      return "";
    }

    return randomItem([
      "RUSH HOUR",
      "FLOOD",
      "NIGHT TRAFFIC",
    ]);
  }

  function updateCollectibles() {
    if (
      fly
    ) {
      fly.life--;

      fly.pulse +=
        0.12;

      if (
        fly.life <=
        0
      ) {
        fly = null;
      }
    }

    if (
      powerUp
    ) {
      powerUp.life--;

      powerUp.pulse +=
        0.1;

      if (
        powerUp.life <=
        0
      ) {
        powerUp =
          null;
      }
    }

    flyTimer--;

    if (
      flyTimer <= 0 &&
      fly ===
        null &&
      crossing >= 2
    ) {
      spawnFly();
    }

    powerTimer--;

    if (
      powerTimer <= 0 &&
      powerUp ===
        null &&
      crossing >= 2
    ) {
      spawnPowerUp();
    }
  }

  function spawnFly() {
    const row =
      randomItem([
        1,
        2,
        3,
        4,
        5,
        7,
        8,
        9,
        10,
        11,
      ]);

    fly = {
      x: randomRange(
        cw,
        width - cw,
      ),
      y: rowY(row),
      life: 260,
      pulse: 0,
    };

    flyTimer =
      randomRange(
        360,
        620,
      );
  }

  function spawnPowerUp() {
    const row =
      randomItem([
        6,
        7,
        8,
        9,
        10,
        11,
      ]);

    powerUp = {
      x: randomRange(
        cw,
        width - cw,
      ),
      y: rowY(row),
      type: randomItem([
        "shield",
        "slow",
        "superHop",
        "score",
      ]),
      life: 420,
      pulse: 0,
    };

    powerTimer =
      randomRange(
        500,
        780,
      );
  }

  function collectIfNearby() {
    if (
      fly &&
      Math.hypot(
        fly.x -
          frog.x,
        fly.y -
          frog.y,
      ) <
        frogSize *
          1.2
    ) {
      addScore(
        250,
        fly.x,
        fly.y,
        "FLY",
      );

      beginCombo();

      burst(
        fly.x,
        fly.y,
        "#facc15",
        18,
      );

      beep(
        900,
        0.06,
      );

      fly = null;
    }

    if (
      powerUp &&
      Math.hypot(
        powerUp.x -
          frog.x,
        powerUp.y -
          frog.y,
      ) <
        frogSize *
          1.2
    ) {
      collectPowerUp(
        powerUp,
      );

      powerUp = null;
    }
  }

  function collectPowerUp(
    pickup: PowerUp,
  ) {
    switch (
      pickup.type
    ) {
      case "shield":
        shieldTimer =
          720;

        addFloatingText(
          pickup.x,
          pickup.y,
          "SHIELD",
          true,
        );

        break;

      case "slow":
        slowTimer =
          420;

        addFloatingText(
          pickup.x,
          pickup.y,
          "SLOW TIME",
          true,
        );

        break;

      case "superHop":
        superHopTimer =
          360;

        addFloatingText(
          pickup.x,
          pickup.y,
          "SUPER HOP",
          true,
        );

        break;

      case "score":
        scoreBoostTimer =
          360;

        addFloatingText(
          pickup.x,
          pickup.y,
          "2X SCORE",
          true,
        );

        break;
    }

    burst(
      pickup.x,
      pickup.y,
      "#ffffff",
      18,
    );

    beep(
      760,
      0.08,
    );
  }

  function updateEffects() {
    if (
      comboTimer > 0
    ) {
      comboTimer--;

      if (
        comboTimer <=
        0
      ) {
        resetCombo();
      }
    }

    if (
      shieldTimer > 0
    ) {
      shieldTimer--;
    }

    if (
      slowTimer > 0
    ) {
      slowTimer--;
    }

    if (
      superHopTimer > 0
    ) {
      superHopTimer--;
    }

    if (
      scoreBoostTimer >
      0
    ) {
      scoreBoostTimer--;
    }

    if (
      specialEventTimer >
      0
    ) {
      specialEventTimer--;

      if (
        specialEventTimer <=
        0
      ) {
        specialEvent = "";
      }
    }

    if (
      screenShake > 0
    ) {
      screenShake *=
        0.85;

      if (
        screenShake <
        0.2
      ) {
        screenShake = 0;
      }
    }

    if (
      flash > 0
    ) {
      flash--;
    }

    for (
      const particle of particles
    ) {
      particle.x +=
        particle.vx;

      particle.y +=
        particle.vy;

      particle.vy +=
        0.025;

      particle.vx *=
        0.98;

      particle.life--;
    }

    particles =
      particles.filter(
        (particle) =>
          particle.life > 0,
      );

    for (
      const item of floatingTexts
    ) {
      item.y -=
        0.35;

      item.life--;
    }

    floatingTexts =
      floatingTexts.filter(
        (item) =>
          item.life > 0,
      );
  }

  function update() {
    if (!alive) {
      updateEffects();
      return;
    }

    updateEffects();
    updateCollectibles();

    if (
      deathTimer > 0
    ) {
      deathTimer--;

      if (
        deathTimer <=
        0
      ) {
        finishDeath();
      }

      return;
    }

    if (
      goalTimer > 0
    ) {
      goalTimer--;

      if (
        goalTimer <=
        0
      ) {
        finishGoal();
      }

      return;
    }

    updateLanes();

    if (
      frog.hopping
    ) {
      updateHop();
    } else {
      updateRiding();
      collectIfNearby();

      const row =
        currentFrogRow();

      if (
        row >= 7 &&
        row <= 11
      ) {
        checkRoadCollision();
      }

      if (
        row >= 1 &&
        row <= 5 &&
        frog.riding ===
          null
      ) {
        checkRiverSupport();
      }
    }

    frog.squash *=
      0.82;
  }

  function drawGrid() {
    ctx.save();

    ctx.strokeStyle =
      "rgba(255,255,255,0.055)";

    ctx.lineWidth = 1;

    for (
      let row = 0;
      row < ROWS;
      row++
    ) {
      for (
        let col = 0;
        col < COLS;
        col++
      ) {
        ctx.strokeRect(
          col * cw,
          row * rh,
          cw,
          rh,
        );
      }
    }

    ctx.restore();
  }

  function drawLaneSeparators() {
    ctx.save();

    ctx.strokeStyle =
      "rgba(255,255,255,0.16)";

    ctx.lineWidth = 2;

    for (
      let row = 0;
      row <= ROWS;
      row++
    ) {
      ctx.beginPath();

      ctx.moveTo(
        0,
        row * rh,
      );

      ctx.lineTo(
        width,
        row * rh,
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle =
      weather ===
      "night"
        ? "#0f172a"
        : weather ===
            "evening"
          ? "#292524"
          : pal.bg;

    ctx.fillRect(
      0,
      0,
      width,
      height,
    );

    // Goal
    ctx.fillStyle =
      weather ===
      "night"
        ? "#166534"
        : "#15803d";

    ctx.fillRect(
      0,
      0,
      width,
      rh,
    );

    // River
    ctx.fillStyle =
      "#155e75";

    ctx.fillRect(
      0,
      rh,
      width,
      rh * 5,
    );

    // Safe centre
    ctx.fillStyle =
      "#166534";

    ctx.fillRect(
      0,
      rh * 6,
      width,
      rh,
    );

    // Road
    ctx.fillStyle =
      "#1f2937";

    ctx.fillRect(
      0,
      rh * 7,
      width,
      rh * 5,
    );

    // Start
    ctx.fillStyle =
      "#065f46";

    ctx.fillRect(
      0,
      rh * 12,
      width,
      rh,
    );

    drawWaterLines();
    drawRoadMarkings();
  }

  function drawWaterLines() {
    ctx.save();

    ctx.strokeStyle =
      "rgba(125,211,252,0.13)";

    ctx.lineWidth = 1;

    for (
      let row = 1;
      row <= 5;
      row++
    ) {
      const baseY =
        row * rh;

      for (
        let i = -2;
        i < 12;
        i++
      ) {
        const x =
          ((i * 145 +
            row * 50 +
            crossing * 18) %
            (width +
              160)) -
          80;

        ctx.beginPath();

        ctx.moveTo(
          x,
          baseY +
            rh * 0.3,
        );

        ctx.lineTo(
          x + 50,
          baseY +
            rh * 0.3,
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
          x + 25,
          baseY +
            rh * 0.7,
        );

        ctx.lineTo(
          x + 80,
          baseY +
            rh * 0.7,
        );

        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawRoadMarkings() {
    ctx.save();

    ctx.strokeStyle =
      "rgba(255,255,255,0.16)";

    ctx.lineWidth = 2;

    ctx.setLineDash([
      16,
      20,
    ]);

    for (
      let row = 7;
      row <= 11;
      row++
    ) {
      ctx.beginPath();

      ctx.moveTo(
        0,
        rowY(row),
      );

      ctx.lineTo(
        width,
        rowY(row),
      );

      ctx.stroke();
    }

    ctx.setLineDash([]);

    ctx.restore();
  }

  function drawVehicle(
    object: LaneObject,
  ) {
    const y =
      rowY(
        object.laneRow,
      ) -
      rh * 0.28;

    const h =
      object.kind ===
      "bus"
        ? rh * 0.66
        : rh * 0.55;

    ctx.save();

    ctx.fillStyle =
      object.color;

    roundRect(
      ctx,
      object.x,
      y,
      object.width,
      h,
      6,
    );

    ctx.fill();

    // Windows
    if (
      object.kind !==
      "truck"
    ) {
      ctx.fillStyle =
        "rgba(147,197,253,0.7)";

      roundRect(
        ctx,
        object.x +
          object.width *
            0.2,
        y +
          h * 0.14,
        object.width *
          0.58,
        h * 0.28,
        3,
      );

      ctx.fill();
    }

    // Wheels
    ctx.fillStyle =
      "#111827";

    ctx.beginPath();

    ctx.arc(
      object.x +
        object.width *
          0.2,
      y + h,
      rh * 0.07,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
      object.x +
        object.width *
          0.8,
      y + h,
      rh * 0.07,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    // Headlights
    ctx.fillStyle =
      "#fef3c7";

    if (
      object.speed >
      0
    ) {
      ctx.fillRect(
        object.x +
          object.width -
          5,
        y +
          h * 0.38,
        3,
        4,
      );
    } else {
      ctx.fillRect(
        object.x + 2,
        y +
          h * 0.38,
        3,
        4,
      );
    }

    ctx.restore();
  }

  function drawRiverObject(
    object: LaneObject,
  ) {
    const y =
      rowY(
        object.laneRow,
      ) -
      rh * 0.25;

    ctx.save();

    if (
      object.kind ===
      "turtle"
    ) {
      ctx.fillStyle =
        "#166534";

      ctx.beginPath();

      ctx.ellipse(
        object.x +
          object.width *
            0.5,
        y +
          rh * 0.25,
        object.width *
          0.44,
        rh * 0.2,
        0,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      ctx.fillStyle =
        "#15803d";

      ctx.beginPath();

      ctx.arc(
        object.x +
          object.width *
            0.9,
        y +
          rh * 0.25,
        rh * 0.09,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      ctx.restore();

      return;
    }

    ctx.fillStyle =
      object.color;

    roundRect(
      ctx,
      object.x,
      y,
      object.width,
      rh * 0.5,
      8,
    );

    ctx.fill();

    ctx.strokeStyle =
      "rgba(255,255,255,0.14)";

    ctx.lineWidth = 2;

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      ctx.beginPath();

      ctx.moveTo(
        object.x +
          object.width *
            (0.2 +
              i *
                0.28),
        y + 4,
      );

      ctx.lineTo(
        object.x +
          object.width *
            (0.1 +
              i *
                0.28),
        y +
          rh *
            0.45,
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFrog(
    alpha = 1,
  ) {
    const jumpArc =
      frog.hopping
        ? Math.sin(
            (frog.hopFrame /
              HOP_FRAMES) *
              Math.PI,
          ) *
          rh *
          0.28
        : 0;

    const squash =
      frog.hopping
        ? 1
        : 0.92 +
          frog.squash *
            0.08;

    ctx.save();

    ctx.globalAlpha =
      alpha;

    ctx.translate(
      frog.x,
      frog.y -
        jumpArc,
    );

    ctx.scale(
      squash,
      1 /
        squash,
    );

    ctx.fillStyle =
      "#22c55e";

    ctx.shadowColor =
      "#22c55e";

    ctx.shadowBlur = 7;

    ctx.beginPath();

    ctx.ellipse(
      0,
      0,
      frogSize * 0.48,
      frogSize * 0.42,
      0,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle =
      "#4ade80";

    ctx.beginPath();

    ctx.ellipse(
      0,
      -frogSize * 0.25,
      frogSize * 0.42,
      frogSize * 0.27,
      0,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.fillStyle =
      "#dcfce7";

    for (
      const direction of [
        -1,
        1,
      ]
    ) {
      ctx.beginPath();

      ctx.arc(
        direction *
          frogSize *
          0.21,
        -frogSize *
          0.39,
        frogSize *
          0.13,
        0,
        Math.PI * 2,
      );

      ctx.fill();
    }

    ctx.fillStyle =
      "#052e16";

    for (
      const direction of [
        -1,
        1,
      ]
    ) {
      ctx.beginPath();

      ctx.arc(
        direction *
          frogSize *
          0.21,
        -frogSize *
          0.39,
        frogSize *
          0.05,
        0,
        Math.PI * 2,
      );

      ctx.fill();
    }

    ctx.restore();
  }

  function drawFly() {
    if (!fly) {
      return;
    }

    const scale =
      1 +
      Math.sin(
        fly.pulse,
      ) *
        0.12;

    ctx.save();

    ctx.translate(
      fly.x,
      fly.y,
    );

    ctx.scale(
      scale,
      scale,
    );

    ctx.fillStyle =
      "#f8fafc";

    ctx.beginPath();

    ctx.ellipse(
      -4,
      0,
      6,
      3,
      -0.25,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.beginPath();

    ctx.ellipse(
      4,
      0,
      6,
      3,
      0.25,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.fillStyle =
      "#171717";

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      3,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.restore();
  }

  function powerColor(
    type: PowerUpType,
  ) {
    switch (type) {
      case "shield":
        return "#7dd3fc";

      case "slow":
        return "#c084fc";

      case "superHop":
        return "#facc15";

      case "score":
        return "#4ade80";
    }
  }

  function powerLabel(
    type: PowerUpType,
  ) {
    switch (type) {
      case "shield":
        return "S";

      case "slow":
        return "T";

      case "superHop":
        return "H";

      case "score":
        return "2X";
    }
  }

  function drawPowerUp() {
    if (!powerUp) {
      return;
    }

    const color =
      powerColor(
        powerUp.type,
      );

    const radius =
      9 +
      Math.sin(
        powerUp.pulse,
      ) *
        1.5;

    ctx.save();

    ctx.strokeStyle =
      color;

    ctx.lineWidth = 2;

    ctx.globalAlpha =
      0.9;

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
      color;

    ctx.globalAlpha =
      0.18;

    ctx.beginPath();

    ctx.arc(
      powerUp.x,
      powerUp.y,
      radius + 7,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.globalAlpha =
      1;

    ctx.fillStyle =
      "#ffffff";

    ctx.font =
      "bold 8px system-ui";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.fillText(
      powerLabel(
        powerUp.type,
      ),
      powerUp.x,
      powerUp.y,
    );

    ctx.restore();
  }

  function render() {
    ctx.save();

    if (
      screenShake > 0
    ) {
      ctx.translate(
        randomRange(
          -screenShake,
          screenShake,
        ),
        randomRange(
          -screenShake,
          screenShake,
        ),
      );
    }

    drawBackground();

    drawGrid();

    drawLaneSeparators();

    // Goal row hint.
    ctx.save();

    ctx.fillStyle =
      "rgba(255,255,255,0.08)";

    ctx.font =
      "bold 10px system-ui";

    ctx.textAlign =
      "center";

    ctx.fillText(
      "GOAL",
      width / 2,
      rh * 0.72,
    );

    ctx.fillText(
      "START",
      width / 2,
      height -
        rh * 0.22,
    );

    ctx.restore();

    // Highlight the frog's current cell.
    if (
      alive
    ) {
      ctx.save();

      ctx.strokeStyle =
        "rgba(255,255,255,0.17)";

      ctx.lineWidth = 2;

      ctx.strokeRect(
        frog.col * cw + 2,
        frog.row * rh + 2,
        cw - 4,
        rh - 4,
      );

      ctx.restore();
    }

    // Highlight the target cell while hopping.
    if (
      frog.hopping
    ) {
      const targetCol =
        clamp(
          Math.round(
            frog.targetX /
              cw -
              0.5,
          ),
          0,
          COLS - 1,
        );

      const targetRow =
        clamp(
          Math.round(
            (frog.targetY -
              rh / 2) /
              rh,
          ),
          0,
          ROWS - 1,
        );

      ctx.save();

      ctx.strokeStyle =
        "rgba(250,204,21,0.65)";

      ctx.lineWidth = 2;

      ctx.setLineDash([
        5,
        5,
      ]);

      ctx.strokeRect(
        targetCol * cw + 4,
        targetRow * rh + 4,
        cw - 8,
        rh - 8,
      );

      ctx.setLineDash([]);

      ctx.restore();
    }

    for (
      const lane of lanes
    ) {
      for (
        const object of lane.objects
      ) {
        if (
          lane.type ===
          "road"
        ) {
          drawVehicle(
            object,
          );
        } else {
          drawRiverObject(
            object,
          );
        }
      }
    }

    drawFly();
    drawPowerUp();

    if (
      deathTimer > 0
    ) {
      drawFrog(
        Math.max(
          0,
          deathTimer /
            34,
        ),
      );
    } else {
      drawFrog();
    }

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

    // HUD
    ctx.save();

    ctx.fillStyle =
      "rgba(0,0,0,0.36)";

    roundRect(
      ctx,
      8,
      8,
      Math.min(
        205,
        width - 16,
      ),
      58,
      8,
    );

    ctx.fill();

    ctx.fillStyle =
      "#ffffff";

    ctx.font =
      "600 12px system-ui";

    ctx.textAlign =
      "left";

    ctx.fillText(
      `LIVES ${"♥".repeat(
        Math.max(
          0,
          lives,
        ),
      )}`,
      16,
      27,
    );

    ctx.fillText(
      `CROSSING ${crossing}`,
      16,
      47,
    );

    ctx.textAlign =
      "right";

    ctx.fillText(
      `SCORE ${score}`,
      width - 12,
      27,
    );

    if (
      combo >= 2
    ) {
      ctx.textAlign =
        "center";

      ctx.fillStyle =
        "#facc15";

      ctx.font =
        "bold 15px system-ui";

      ctx.fillText(
        `FLOW x${combo}`,
        width / 2,
        20,
      );
    }

    const effects: string[] =
      [];

    if (
      shieldTimer > 0
    ) {
      effects.push(
        "SHIELD",
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
      superHopTimer > 0
    ) {
      effects.push(
        "2-HOP",
      );
    }

    if (
      scoreBoostTimer > 0
    ) {
      effects.push(
        "2X",
      );
    }

    if (
      effects.length > 0
    ) {
      ctx.textAlign =
        "center";

      ctx.fillStyle =
        pal.neon;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        effects.join(
          " • ",
        ),
        width / 2,
        38,
      );
    }

    ctx.restore();

    if (
      specialEvent
    ) {
      ctx.save();

      ctx.textAlign =
        "center";

      ctx.fillStyle =
        "#facc15";

      ctx.font =
        "bold 14px system-ui";

      ctx.fillText(
        specialEvent,
        width / 2,
        height - 12,
      );

      ctx.restore();
    }

    for (
      const item of floatingTexts
    ) {
      ctx.save();

      ctx.globalAlpha =
        clamp(
          item.life /
            item.maxLife,
          0,
          1,
        );

      ctx.fillStyle =
        item.big
          ? "#facc15"
          : "#ffffff";

      ctx.font =
        item.big
          ? "bold 16px system-ui"
          : "600 11px system-ui";

      ctx.textAlign =
        "center";

      ctx.fillText(
        item.text,
        item.x,
        item.y,
      );

      ctx.restore();
    }

    if (
      !alive
    ) {
      ctx.save();

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
        height / 2 -
          42,
      );

      ctx.fillStyle =
        "#ffffff";

      ctx.font =
        "14px system-ui";

      ctx.fillText(
        `Score ${score}`,
        width / 2,
        height / 2 -
          8,
      );

      ctx.fillText(
        `Crossing ${crossing}`,
        width / 2,
        height / 2 +
          16,
      );

      ctx.fillText(
        `Best flow x${bestCombo}`,
        width / 2,
        height / 2 +
          40,
      );

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "12px system-ui";

      ctx.fillText(
        "Press SPACE or R to restart",
        width / 2,
        height / 2 +
          72,
      );

      ctx.restore();
    }

    if (
      flash > 0
    ) {
      ctx.save();

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

      ctx.restore();
    }

    ctx.restore();
  }

  const onKey = (
    event: KeyboardEvent,
  ) => {
    const key =
      event.key.toLowerCase();

    if (
      key === "arrowup" ||
      key === "w"
    ) {
      requestMove(
        0,
        -1,
      );

      event.preventDefault();
      return;
    }

    if (
      key === "arrowdown" ||
      key === "s"
    ) {
      requestMove(
        0,
        1,
      );

      event.preventDefault();
      return;
    }

    if (
      key === "arrowleft" ||
      key === "a"
    ) {
      requestMove(
        -1,
        0,
      );

      event.preventDefault();
      return;
    }

    if (
      key === "arrowright" ||
      key === "d"
    ) {
      requestMove(
        1,
        0,
      );

      event.preventDefault();
      return;
    }

    if (
      key === " " &&
      !alive
    ) {
      event.preventDefault();
      reset();
      return;
    }

    if (
      key === "r"
    ) {
      reset();
      return;
    }
  };

  window.addEventListener(
    "keydown",
    onKey,
  );

  reset();

  const loop =
    createLoop(
      update,
      render,
    );

  return {
    pause: () =>
      loop.pause(),

    resume: () =>
      loop.resume(),

    restart: () =>
      reset(),

    destroy: () => {
      loop.stop();

      window.removeEventListener(
        "keydown",
        onKey,
      );
    },
  };
};

export default frogger;
