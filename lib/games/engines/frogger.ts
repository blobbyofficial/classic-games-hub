import type { GameEngineFactory } from "@/types";
import {
  beep,
  createLoop,
  palette,
  roundRect,
  tune,
} from "../helpers";

type Zone =
  | "goal"
  | "river"
  | "safe"
  | "road";

type VehicleKind =
  | "car"
  | "van"
  | "truck"
  | "sports"
  | "bus";

type RiverObjectKind =
  | "log"
  | "turtle"
  | "smallLog"
  | "lily";

type PowerUpType =
  | "shield"
  | "slow"
  | "superHop"
  | "score";

type Weather =
  | "day"
  | "evening"
  | "night";

interface LaneObject {
  x: number;
  speed: number;
  width: number;
  kind: VehicleKind | RiverObjectKind;
  laneRow: number;
  color: string;
  variant: number;
  passed: boolean;
}

interface Lane {
  row: number;
  type: "road" | "river";
  speed: number;
  spacing: number;
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
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hopProgress: number;
  hopping: boolean;
  facing: number;
  squish: number;
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

  const ROWS = 13;
  const COLS = 13;
  const rh = height / ROWS;
  const cw = width / COLS;

  const PACE = tune(difficulty, {
    easy: 0.7,
    regular: 1,
    hard: 1.35,
  });

  const frogSize =
    Math.min(cw, rh) * 0.62;

  const safeRows = new Set([
    6,
    12,
  ]);

  const riverRows = new Set([
    1,
    2,
    3,
    4,
    5,
  ]);

  const roadRows = new Set([
    7,
    8,
    9,
    10,
    11,
  ]);

  let frog: Frog = {
    x: cw * 6.5,
    y: rh * 12.5,
    targetX: cw * 6.5,
    targetY: rh * 12.5,
    hopProgress: 1,
    hopping: false,
    facing: -1,
    squish: 0,
    riding: null,
  };

  let lanes: Lane[] = [];

  let particles: Particle[] = [];
  let floatingTexts: FloatingText[] = [];

  let flies: Fly[] = [];
  let powerUps: PowerUp[] = [];

  let score = 0;
  let lives = 3;

  let crossing = 1;
  let bestRow = 12;

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

  let specialEvent = "";

  let eventTimer = 0;

  let shieldTimer = 0;
  let slowTimer = 0;
  let superHopTimer = 0;
  let scoreBoostTimer = 0;

  let lastMoveTime = 0;

  let flySpawnTimer = 360;
  let powerUpSpawnTimer = 520;

  const nowTime = () =>
    typeof performance !==
    "undefined"
      ? performance.now()
      : Date.now();

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

  function zoneForRow(
    row: number,
  ): Zone {
    if (row === 0) return "goal";
    if (riverRows.has(row))
      return "river";
    if (roadRows.has(row))
      return "road";
    return "safe";
  }

  function rowY(row: number) {
    return (
      row * rh +
      rh / 2
    );
  }

  function resetFrog() {
    frog = {
      x: cw * 6.5,
      y: rh * 12.5,
      targetX: cw * 6.5,
      targetY: rh * 12.5,
      hopProgress: 1,
      hopping: false,
      facing: -1,
      squish: 0,
      riding: null,
    };

    bestRow = 12;
  }

  function createParticle(
    x: number,
    y: number,
    color: string,
    strength = 1,
  ) {
    const angle =
      Math.random() *
      Math.PI *
      2;

    const speed =
      randomRange(
        0.8,
        3.4,
      ) *
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
        randomRange(
          18,
          40,
        ),
      maxLife: 40,
      size:
        randomRange(
          1.5,
          3.5,
        ),
      color,
    });
  }

  function burst(
    x: number,
    y: number,
    color: string,
    amount = 12,
    strength = 1,
  ) {
    for (
      let i = 0;
      i < amount;
      i++
    ) {
      createParticle(
        x,
        y,
        color,
        strength,
      );
    }
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
      life: big ? 44 : 30,
      maxLife: big ? 44 : 30,
      big,
    });
  }

  function addScore(
    amount: number,
    x?: number,
    y?: number,
    label?: string,
  ) {
    const multiplier =
      scoreBoostTimer > 0
        ? 2
        : 1;

    const comboMultiplier =
      combo >= 8
        ? 3
        : combo >= 5
          ? 2
          : 1;

    const total = Math.round(
      amount *
        multiplier *
        comboMultiplier,
    );

    score += total;

    onScore(score);

    if (
      x !== undefined &&
      y !== undefined
    ) {
      addFloatingText(
        x,
        y,
        label
          ? `${label} +${total}`
          : `+${total}`,
        total >= 100,
      );
    }
  }

  function breakCombo() {
    combo = 0;
    comboTimer = 0;
  }

  function advanceCombo() {
    combo++;
    comboTimer = 150;

    bestCombo = Math.max(
      bestCombo,
      combo,
    );

    if (combo >= 5) {
      addFloatingText(
        frog.x,
        frog.y - rh * 0.7,
        `FLOW x${combo}`,
        true,
      );
    }
  }

  function buildLanes() {
    lanes = [];

    const base =
      crossing >= 4
        ? 1.1
        : crossing >= 2
          ? 1.05
          : 1;

    const roadLayouts = [
      {
        row: 7,
        speed:
          -2.1 *
          PACE *
          base,
        spacing: 190,
        kinds: [
          "car",
          "sports",
        ] as VehicleKind[],
      },
      {
        row: 8,
        speed:
          1.45 *
          PACE *
          base,
        spacing: 250,
        kinds: [
          "van",
          "car",
        ] as VehicleKind[],
      },
      {
        row: 9,
        speed:
          -1.25 *
          PACE *
          base,
        spacing: 290,
        kinds: [
          "truck",
          "bus",
          "van",
        ] as VehicleKind[],
      },
      {
        row: 10,
        speed:
          2.45 *
          PACE *
          base,
        spacing: 210,
        kinds: [
          "car",
          "sports",
        ] as VehicleKind[],
      },
      {
        row: 11,
        speed:
          -1.8 *
          PACE *
          base,
        spacing: 230,
        kinds: [
          "van",
          "car",
          "truck",
        ] as VehicleKind[],
      },
    ];

    for (
      const config of roadLayouts
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

        const widthMultiplier =
          kind === "truck"
            ? 1.7
            : kind === "bus"
              ? 2.1
              : kind === "van"
                ? 1.35
                : kind ===
                    "sports"
                  ? 0.8
                  : 1;

        const objectWidth =
          cw *
          widthMultiplier;

        objects.push({
          x:
            i *
              config.spacing +
            randomRange(
              -45,
              45,
            ),
          speed:
            config.speed *
            randomRange(
              0.9,
              1.1,
            ),
          width:
            objectWidth,
          kind,
          laneRow:
            config.row,
          color:
            getVehicleColor(
              kind,
            ),
          variant:
            Math.floor(
              Math.random() *
                3,
            ),
          passed:
            false,
        });
      }

      lanes.push({
        row: config.row,
        type: "road",
        speed:
          config.speed,
        spacing:
          config.spacing,
        objects,
      });
    }

    const riverLayouts = [
      {
        row: 1,
        speed:
          1.2 *
          PACE *
          base,
        spacing: 210,
        kind: "log",
      },
      {
        row: 2,
        speed:
          -1.65 *
          PACE *
          base,
        spacing: 245,
        kind: "turtle",
      },
      {
        row: 3,
        speed:
          0.95 *
          PACE *
          base,
        spacing: 275,
        kind: "smallLog",
      },
      {
        row: 4,
        speed:
          -1.35 *
          PACE *
          base,
        spacing: 225,
        kind: "log",
      },
      {
        row: 5,
        speed:
          1.9 *
          PACE *
          base,
        spacing: 255,
        kind: "turtle",
      },
    ] as const;

    for (
      const config of riverLayouts
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
          config.kind;

        let widthMultiplier = 1;

        if (kind === "log")
          widthMultiplier =
            1.8;
        if (
          kind === "smallLog"
        )
          widthMultiplier =
            1.05;
        if (
          kind === "turtle"
        )
          widthMultiplier =
            1.35;

        const objectWidth =
          cw *
          widthMultiplier;

        objects.push({
          x:
            i *
              config.spacing +
            randomRange(
              -55,
              55,
            ),
          speed:
            config.speed *
            randomRange(
              0.9,
              1.08,
            ),
          width:
            objectWidth,
          kind,
          laneRow:
            config.row,
          color:
            kind ===
            "turtle"
              ? "#15803d"
              : kind ===
                  "smallLog"
                ? "#92400e"
                : "#a16207",
          variant:
            Math.floor(
              Math.random() *
                3,
            ),
          passed:
            false,
        });
      }

      lanes.push({
        row:
          config.row,
        type: "river",
        speed:
          config.speed,
        spacing:
          config.spacing,
        objects,
      });
    }
  }

  function getVehicleColor(
    kind: VehicleKind,
  ) {
    switch (kind) {
      case "sports":
        return "#f43f5e";

      case "truck":
        return "#60a5fa";

      case "bus":
        return "#fbbf24";

      case "van":
        return "#a78bfa";

      default:
        return "#ef4444";
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

    specialEvent = "";
    eventTimer = 0;

    flies = [];
    powerUps = [];
    particles = [];
    floatingTexts = [];

    flySpawnTimer = 360;
    powerUpSpawnTimer = 520;

    weather =
      crossing >= 7
        ? "night"
        : crossing >= 4
          ? "evening"
          : "day";

    buildLanes();
    resetFrog();

    onScore(0);

    onStatus?.(
      "Cross the road and river!",
    );
  }

  function reset() {
    resetRun();
  }

  function frogBoundingBox() {
    const scale =
      frog.hopping
        ? 0.52
        : 0.62;

    const widthHalf =
      frogSize * scale;

    return {
      left:
        frog.x -
        widthHalf,
      right:
        frog.x +
        widthHalf,
      top:
        frog.y -
        widthHalf,
      bottom:
        frog.y +
        widthHalf,
    };
  }

  function objectBoundingBox(
    object: LaneObject,
  ) {
    return {
      left:
        object.x,
      right:
        object.x +
        object.width,
      top:
        rowY(
          object.laneRow,
        ) -
        rh * 0.3,
      bottom:
        rowY(
          object.laneRow,
        ) +
        rh * 0.3,
    };
  }

  function overlaps(
    a: ReturnType<
      typeof frogBoundingBox
    >,
    b: ReturnType<
      typeof objectBoundingBox
    >,
  ) {
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  }

  function frogOnObject(
    object: LaneObject,
  ) {
    const frogWidth =
      frogSize * 0.34;

    return (
      frog.x +
        frogWidth >
        object.x &&
      frog.x -
        frogWidth <
        object.x +
          object.width
    );
  }

  function getCurrentLane() {
    const row =
      Math.round(
        (frog.y -
          rh / 2) /
          rh,
      );

    return lanes.find(
      (lane) =>
        lane.row === row,
    );
  }

  function hop(
    dc: number,
    dr: number,
  ) {
    if (
      !alive ||
      busy ||
      frog.hopping
    ) {
      return;
    }

    const maxColumn =
      COLS - 1;

    const hopDistance =
      superHopTimer > 0
        ? 2
        : 1;

    const targetCol =
      clamp(
        Math.round(
          frog.x /
            cw -
            0.5,
        ) +
          dc *
            hopDistance,
        0,
        maxColumn,
      );

    const currentRow =
      clamp(
        Math.round(
          (frog.y -
            rh / 2) /
            rh,
        ),
        0,
        ROWS - 1,
      );

    const targetRow =
      clamp(
        currentRow +
          dr *
            hopDistance,
        0,
        ROWS - 1,
      );

    if (
      targetCol ===
        Math.round(
          frog.x /
            cw -
            0.5,
        ) &&
      targetRow ===
        currentRow
    ) {
      return;
    }

    frog.targetX =
      targetCol * cw +
      cw / 2;

    frog.targetY =
      rowY(targetRow);

    frog.hopProgress = 0;
    frog.hopping = true;

    frog.riding =
      null;

    frog.facing =
      dc === 0
        ? frog.facing
        : dc > 0
          ? 1
          : -1;

    lastMoveTime =
      nowTime();

    beep(
      500 +
        Math.random() *
          80,
      0.035,
    );
  }

  function completeHop() {
    frog.x =
      frog.targetX;

    frog.y =
      frog.targetY;

    frog.hopping =
      false;

    frog.squish = 1;

    const row =
      Math.round(
        (frog.y -
          rh / 2) /
          rh,
      );

    if (
      row < bestRow
    ) {
      const distance =
        bestRow - row;

      bestRow = row;

      advanceCombo();

      addScore(
        10 +
          distance *
            5,
        frog.x,
        frog.y -
          rh * 0.55,
      );
    }

    const zone =
      zoneForRow(row);

    if (
      zone === "goal"
    ) {
      reachGoal();
      return;
    }

    const flyIndex =
      flies.findIndex(
        (fly) =>
          Math.hypot(
            fly.x - frog.x,
            fly.y - frog.y,
          ) <
          frogSize * 0.8,
      );

    if (
      flyIndex >= 0
    ) {
      collectFly(
        flyIndex,
      );
    }

    const powerIndex =
      powerUps.findIndex(
        (power) =>
          Math.hypot(
            power.x - frog.x,
            power.y - frog.y,
          ) <
          frogSize * 0.8,
      );

    if (
      powerIndex >= 0
    ) {
      collectPowerUp(
        powerIndex,
      );
    }

    if (
      zone === "road"
    ) {
      checkRoadCollision();
    }

    if (
      zone === "river"
    ) {
      checkRiverSupport();
    }
  }

  function moveFrogWithRide(
    dt: number,
    laneObject: LaneObject,
  ) {
    frog.x +=
      laneObject.speed *
      dt;

    if (
      frog.x <
      -frogSize
    ) {
      frog.x =
        width +
        frogSize;
    }

    if (
      frog.x >
      width +
        frogSize
    ) {
      frog.x =
        -frogSize;
    }
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

    const box =
      frogBoundingBox();

    for (
      const object of lane.objects
    ) {
      const objectBox =
        objectBoundingBox(
          object,
        );

      if (
        overlaps(
          box,
          objectBox,
        )
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
            1.5,
          );

          addFloatingText(
            frog.x,
            frog.y -
              rh * 0.5,
            "SHIELD!",
            true,
          );

          screenShake = 5;

          object.x +=
            object.speed >
            0
              ? 40
              : -40;

          break;
        }

        die(
          "car",
        );

        return;
      }
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
          frogOnObject(
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
          18,
          1.3,
        );

        addFloatingText(
          frog.x,
          frog.y -
            rh * 0.5,
          "SAVED!",
          true,
        );

        return;
      }

      die(
        "water",
      );

      return;
    }

    frog.riding =
      support;
  }

  function die(
    reason:
      | "car"
      | "water"
      | "edge"
      | "unknown",
  ) {
    if (
      !alive ||
      deathTimer > 0
    ) {
      return;
    }

    deathTimer = 42;
    busy = true;
    breakCombo();

    screenShake = 9;
    flash = 5;

    if (
      reason ===
      "water"
    ) {
      burst(
        frog.x,
        frog.y,
        "#60a5fa",
        25,
        1.2,
      );

      addFloatingText(
        frog.x,
        frog.y,
        "SPLASH!",
        true,
      );

      beep(
        170,
        0.18,
        "sawtooth",
      );
    } else {
      burst(
        frog.x,
        frog.y,
        "#f87171",
        22,
        1.4,
      );

      addFloatingText(
        frog.x,
        frog.y,
        "SMASH!",
        true,
      );

      beep(
        130,
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

    goalTimer = 70;
    busy = true;

    advanceCombo();

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
      1.3,
    );

    addFloatingText(
      width / 2,
      height * 0.2,
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
      90,
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

    flies = [];
    powerUps = [];

    flySpawnTimer =
      Math.max(
        180,
        420 -
          crossing * 12,
      );

    powerUpSpawnTimer =
      520;

    busy = false;
    goalTimer = 0;

    specialEvent =
      getSpecialEvent();

    eventTimer =
      specialEvent ===
      ""
        ? 0
        : 600;

    onStatus?.(
      specialEvent
        ? `${specialEvent}!`
        : `Crossing ${crossing}`,
    );
  }

  function getSpecialEvent() {
    if (
      crossing < 3 ||
      Math.random() >
        0.4
    ) {
      return "";
    }

    return randomItem([
      "RUSH HOUR",
      "FLOOD",
      "NIGHT TRAFFIC",
      "WILDLIFE",
    ]);
  }

  function updateSpecialEvent() {
    if (
      eventTimer <= 0
    ) {
      specialEvent = "";
      return;
    }

    eventTimer--;

    if (
      eventTimer <= 0
    ) {
      specialEvent = "";
    }
  }

  function spawnFly() {
    const rowOptions =
      [
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
      ];

    const row =
      randomItem(
        rowOptions,
      );

    flies.push({
      x:
        randomRange(
          cw,
          width - cw,
        ),
      y:
        rowY(row),
      life: 300,
      pulse: 0,
    });

    flySpawnTimer =
      randomRange(
        420,
        760,
      );
  }

  function collectFly(
    index: number,
  ) {
    const fly =
      flies[index];

    if (
      fly === undefined
    ) {
      return;
    }

    flies.splice(
      index,
      1,
    );

    addScore(
      250,
      fly.x,
      fly.y,
      "FLY",
    );

    advanceCombo();

    burst(
      fly.x,
      fly.y,
      "#facc15",
      16,
      1,
    );

    beep(
      900,
      0.06,
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

    powerUps.push({
      x:
        randomRange(
          cw,
          width - cw,
        ),
      y:
        rowY(row),
      type:
        randomItem([
          "shield",
          "slow",
          "superHop",
          "score",
        ]),
      life: 420,
      pulse: 0,
    });

    powerUpSpawnTimer =
      randomRange(
        520,
        850,
      );
  }

  function collectPowerUp(
    index: number,
  ) {
    const power =
      powerUps[index];

    if (
      power === undefined
    ) {
      return;
    }

    powerUps.splice(
      index,
      1,
    );

    switch (
      power.type
    ) {
      case "shield":
        shieldTimer =
          900;

        addFloatingText(
          power.x,
          power.y,
          "SHIELD",
          true,
        );

        break;

      case "slow":
        slowTimer =
          480;

        addFloatingText(
          power.x,
          power.y,
          "SLOW TIME",
          true,
        );

        break;

      case "superHop":
        superHopTimer =
          420;

        addFloatingText(
          power.x,
          power.y,
          "SUPER HOP",
          true,
        );

        break;

      case "score":
        scoreBoostTimer =
          420;

        addFloatingText(
          power.x,
          power.y,
          "2X SCORE",
          true,
        );

        break;
    }

    burst(
      power.x,
      power.y,
      "#ffffff",
      16,
      1.1,
    );

    beep(
      760,
      0.08,
    );
  }

  function updateObjects(
    dt: number,
  ) {
    for (
      const lane of lanes
    ) {
      let laneSpeed =
        lane.speed;

      if (
        slowTimer > 0
      ) {
        laneSpeed *=
          0.58;
      }

      if (
        specialEvent ===
        "RUSH HOUR"
      ) {
        if (
          lane.type ===
          "road"
        ) {
          laneSpeed *=
            1.3;
        }
      }

      if (
        specialEvent ===
        "FLOOD"
      ) {
        if (
          lane.type ===
          "river"
        ) {
          laneSpeed *=
            1.35;
        }
      }

      for (
        const object of lane.objects
      ) {
        object.x +=
          laneSpeed *
          dt;

        object.speed =
          laneSpeed;

        const wrapSize =
          object.width +
          width +
          100;

        if (
          object.x >
          width + 20
        ) {
          object.x =
            -wrapSize *
            0.35;

          object.passed =
            false;
        }

        if (
          object.x <
          -object.width -
            20
        ) {
          object.x =
            width +
            wrapSize *
            0.35;

          object.passed =
            false;
        }
      }
    }
  }

  function updateFrogRide(
    dt: number,
  ) {
    if (
      frog.hopping ||
      !frog.riding
    ) {
      return;
    }

    const riding =
      frog.riding;

    const lane =
      lanes.find(
        (candidate) =>
          candidate.row ===
          riding.laneRow,
      );

    if (
      !lane ||
      lane.type !==
        "river"
    ) {
      frog.riding =
        null;

      return;
    }

    moveFrogWithRide(
      dt,
      riding,
    );

    const row =
      Math.round(
        (frog.y -
          rh / 2) /
          rh,
      );

    if (
      row !==
      riding.laneRow
    ) {
      frog.riding =
        null;

      return;
    }

    if (
      frog.x <
        -frogSize ||
      frog.x >
        width +
          frogSize
    ) {
      die("edge");

      return;
    }

    if (
      !frogOnObject(
        riding,
      )
    ) {
      checkRiverSupport();
    }
  }

  function updateHopping(
    dt: number,
  ) {
    if (
      !frog.hopping
    ) {
      return;
    }

    frog.hopProgress +=
      dt * 4.8;

    const progress =
      clamp(
        frog.hopProgress,
        0,
        1,
      );

    const eased =
      progress < 0.5
        ? 2 *
          progress *
          progress
        : 1 -
          Math.pow(
            -2 *
              progress +
              2,
            2,
          ) /
            2;

    frog.x =
      frog.x +
      (frog.targetX -
        frog.x) *
        Math.min(
          1,
          eased *
            4,
        );

    const startY =
      frog.y;

    const endY =
      frog.targetY;

    const arc =
      Math.sin(
        progress *
          Math.PI,
      ) *
      rh *
      0.42;

    const centerY =
      startY +
      (endY -
        startY) *
        eased;

    frog.y =
      centerY -
      arc;

    if (
      progress >=
      1
    ) {
      completeHop();
    }
  }

  function updateEffects(
    dt: number,
  ) {
    if (
      comboTimer > 0
    ) {
      comboTimer -=
        dt *
        60;

      if (
        comboTimer <=
        0
      ) {
        breakCombo();
      }
    }

    if (
      shieldTimer > 0
    ) {
      shieldTimer -=
        dt *
        60;
    }

    if (
      slowTimer > 0
    ) {
      slowTimer -=
        dt *
        60;
    }

    if (
      superHopTimer > 0
    ) {
      superHopTimer -=
        dt *
        60;
    }

    if (
      scoreBoostTimer > 0
    ) {
      scoreBoostTimer -=
        dt *
        60;
    }

    if (
      flySpawnTimer > 0
    ) {
      flySpawnTimer -=
        dt *
        60;
    } else if (
      flies.length ===
      0
    ) {
      spawnFly();
    }

    if (
      powerUpSpawnTimer >
      0
    ) {
      powerUpSpawnTimer -=
        dt *
        60;
    } else if (
      powerUps.length ===
      0 &&
      crossing >= 2
    ) {
      spawnPowerUp();
    }

    if (
      screenShake > 0
    ) {
      screenShake *=
        0.86;

      if (
        screenShake <
        0.25
      ) {
        screenShake = 0;
      }
    }

    if (flash > 0) {
      flash--;
    }
  }

  function updateCollectibles(
    dt: number,
  ) {
    flies =
      flies.filter(
        (fly) => {
          fly.life -=
            dt * 60;

          fly.pulse +=
            dt * 8;

          return (
            fly.life > 0
          );
        },
      );

    powerUps =
      powerUps.filter(
        (power) => {
          power.life -=
            dt * 60;

          power.pulse +=
            dt * 7;

          return (
            power.life > 0
          );
        },
      );
  }

  function updateParticles(
    dt: number,
  ) {
    particles =
      particles.filter(
        (particle) => {
          particle.x +=
            particle.vx *
            dt *
            60;

          particle.y +=
            particle.vy *
            dt *
            60;

          particle.vy +=
            0.04 *
            dt *
            60;

          particle.vx *=
            0.98;

          particle.life -=
            dt * 60;

          return (
            particle.life >
            0
          );
        },
      );

    floatingTexts =
      floatingTexts.filter(
        (item) => {
          item.y -=
            dt * 20;

          item.life -=
            dt * 60;

          return (
            item.life >
            0
          );
        },
      );
  }

  function update(dt: number) {
    if (!alive) {
      updateParticles(dt);
      updateEffects(dt);
      return;
    }

    updateEffects(dt);
    updateParticles(dt);
    updateCollectibles(dt);
    updateSpecialEvent();

    if (
      deathTimer > 0
    ) {
      deathTimer -=
        dt * 60;

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
      goalTimer -=
        dt * 60;

      if (
        goalTimer <=
        0
      ) {
        finishGoal();
      }

      return;
    }

    updateObjects(dt);
    updateHopping(dt);
    updateFrogRide(dt);

    if (
      !frog.hopping
    ) {
      const row =
        Math.round(
          (frog.y -
            rh / 2) /
            rh,
        );

      if (
        zoneForRow(row) ===
        "road"
      ) {
        checkRoadCollision();
      }

      if (
        zoneForRow(row) ===
        "river" &&
        frog.riding ===
          null
      ) {
        checkRiverSupport();
      }
    }

    frog.squish *=
      0.82;
  }

  function drawRoad(
    row: number,
  ) {
    const y =
      row * rh;

    ctx.fillStyle =
      "#1f2937";

    ctx.fillRect(
      0,
      y,
      width,
      rh,
    );

    ctx.strokeStyle =
      "rgba(255,255,255,0.18)";

    ctx.lineWidth = 2;

    ctx.setLineDash([
      14,
      18,
    ]);

    ctx.beginPath();

    ctx.moveTo(
      0,
      y +
        rh / 2,
    );

    ctx.lineTo(
      width,
      y +
        rh / 2,
    );

    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle =
      "rgba(255,255,255,0.1)";

    ctx.fillRect(
      0,
      y + 2,
      width,
      2,
    );

    ctx.fillRect(
      0,
      y +
        rh -
        4,
      width,
      2,
    );
  }

  function drawRiver(
    row: number,
  ) {
    const y =
      row * rh;

    ctx.fillStyle =
      "#155e75";

    ctx.fillRect(
      0,
      y,
      width,
      rh,
    );

    ctx.strokeStyle =
      "rgba(125,211,252,0.17)";

    ctx.lineWidth = 1;

    for (
      let i = 0;
      i < 7;
      i++
    ) {
      const waveX =
        ((i * 130 +
          crossing * 27 +
          row * 41) %
          (width +
            180)) -
        90;

      ctx.beginPath();

      ctx.moveTo(
        waveX,
        y +
          rh *
            (0.2 +
              i * 0.08),
      );

      ctx.lineTo(
        waveX + 55,
        y +
          rh *
            (0.2 +
              i * 0.08),
      );

      ctx.stroke();
    }
  }

  function drawSafeZone(
    row: number,
    color: string,
  ) {
    ctx.fillStyle =
      color;

    ctx.fillRect(
      0,
      row * rh,
      width,
      rh,
    );

    ctx.strokeStyle =
      "rgba(255,255,255,0.06)";

    ctx.lineWidth = 1;

    for (
      let x = 0;
      x < width;
      x += cw
    ) {
      ctx.strokeRect(
        x + 1,
        row * rh + 1,
        cw - 2,
        rh - 2,
      );
    }
  }

  function drawVehicle(
    object: LaneObject,
  ) {
    const y =
      rowY(
        object.laneRow,
      ) -
      rh * 0.28;

    let h =
      rh * 0.56;

    if (
      object.kind ===
      "bus"
    ) {
      h =
        rh * 0.68;
    }

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

    const wheelR =
      Math.max(
        3,
        rh * 0.08,
      );

    ctx.fillStyle =
      "#111827";

    ctx.beginPath();

    ctx.arc(
      object.x +
        object.width *
          0.2,
      y + h,
      wheelR,
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
      wheelR,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    if (
      object.kind !==
      "truck"
    ) {
      ctx.fillStyle =
        "rgba(147,197,253,0.65)";

      roundRect(
        ctx,
        object.x +
          object.width *
            0.22,
        y +
          h * 0.16,
        object.width *
          0.56,
        h * 0.28,
        3,
      );

      ctx.fill();
    }

    ctx.fillStyle =
      "#fef3c7";

    if (
      object.speed > 0
    ) {
      ctx.fillRect(
        object.x +
          object.width -
          4,
        y +
          h * 0.38,
        3,
        4,
      );
    } else {
      ctx.fillRect(
        object.x + 1,
        y + h * 0.38,
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
      rh * 0.27;

    ctx.save();

    if (
      object.kind ===
      "turtle"
    ) {
      const wobble =
        Math.sin(
          performance.now() *
            0.005 +
            object.variant,
        ) *
        1.5;

      ctx.fillStyle =
        object.color;

      ctx.beginPath();

      ctx.ellipse(
        object.x +
          object.width *
            0.5,
        y +
          rh * 0.3 +
          wobble,
        object.width *
          0.46,
        rh *
          0.23,
        0,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      ctx.fillStyle =
        "#166534";

      ctx.beginPath();

      ctx.arc(
        object.x +
          object.width *
            0.88,
        y +
          rh * 0.28 +
          wobble,
        rh * 0.1,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      return;
    }

    ctx.fillStyle =
      object.color;

    roundRect(
      ctx,
      object.x,
      y +
        rh * 0.06,
      object.width,
      rh * 0.46,
      rh * 0.14,
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
            (0.18 +
              i *
                0.28),
        y +
          rh *
            0.12,
      );

      ctx.lineTo(
        object.x +
          object.width *
            (0.1 +
              i *
                0.28),
        y +
          rh *
            0.42,
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFrog(
    alpha = 1,
  ) {
    const jumpHeight =
      frog.hopping
        ? Math.sin(
            frog.hopProgress *
              Math.PI,
          ) *
          rh *
          0.18
        : 0;

    const scaleY =
      frog.hopping
        ? 1.08
        : 0.94 +
          frog.squish *
            0.08;

    const scaleX =
      frog.hopping
        ? 0.88
        : 1.06 -
          frog.squish *
            0.05;

    ctx.save();

    ctx.globalAlpha =
      alpha;

    ctx.translate(
      frog.x,
      frog.y -
        jumpHeight,
    );

    ctx.scale(
      scaleX,
      scaleY,
    );

    ctx.fillStyle =
      "#22c55e";

    ctx.shadowColor =
      "#22c55e";

    ctx.shadowBlur = 8;

    ctx.beginPath();

    ctx.ellipse(
      0,
      0,
      frogSize *
        0.48,
      frogSize *
        0.42,
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
      -frogSize * 0.3,
      frogSize * 0.42,
      frogSize * 0.28,
      0,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    const eyeOffset =
      frogSize * 0.22;

    ctx.fillStyle =
      "#dcfce7";

    ctx.beginPath();

    ctx.arc(
      -eyeOffset,
      -frogSize * 0.45,
      frogSize * 0.14,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
      eyeOffset,
      -frogSize * 0.45,
      frogSize * 0.14,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.fillStyle =
      "#052e16";

    ctx.beginPath();

    ctx.arc(
      -eyeOffset,
      -frogSize * 0.45,
      frogSize * 0.055,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
      eyeOffset,
      -frogSize * 0.45,
      frogSize * 0.055,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.fillStyle =
      "#14532d";

    ctx.beginPath();

    ctx.arc(
      0,
      frogSize * 0.06,
      frogSize * 0.2,
      0,
      Math.PI,
    );

    ctx.fill();

    ctx.restore();
  }

  function drawFly(
    fly: Fly,
  ) {
    const scale =
      1 +
      Math.sin(
        fly.pulse,
      ) *
        0.15;

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
      -5,
      0,
      6,
      3,
      -0.3,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.beginPath();

    ctx.ellipse(
      5,
      0,
      6,
      3,
      0.3,
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
      4,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.restore();
  }

  function powerUpColor(
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

  function powerUpLabel(
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

  function drawPowerUp(
    power: PowerUp,
  ) {
    const color =
      powerUpColor(
        power.type,
      );

    const radius =
      8 +
      Math.sin(
        power.pulse,
      ) *
        1.5;

    ctx.save();

    ctx.fillStyle =
      color;

    ctx.globalAlpha =
      0.15;

    ctx.beginPath();

    ctx.arc(
      power.x,
      power.y,
      radius + 7,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.globalAlpha =
      1;

    ctx.strokeStyle =
      color;

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.arc(
      power.x,
      power.y,
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

    ctx.fillText(
      powerUpLabel(
        power.type,
      ),
      power.x,
      power.y,
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

    // Background
    if (
      weather ===
      "night"
    ) {
      ctx.fillStyle =
        "#0f172a";
    } else if (
      weather ===
      "evening"
    ) {
      ctx.fillStyle =
        "#292524";
    } else {
      ctx.fillStyle =
        pal.bg;
    }

    ctx.fillRect(
      -20,
      -20,
      width + 40,
      height + 40,
    );

    // Goal
    drawSafeZone(
      0,
      weather ===
        "night"
        ? "#166534"
        : "#15803d",
    );

    ctx.save();

    ctx.fillStyle =
      "rgba(255,255,255,0.09)";

    for (
      let i = 0;
      i < 5;
      i++
    ) {
      ctx.beginPath();

      ctx.arc(
        cw *
          (1 +
            i *
              3),
        rowY(0),
        cw *
          0.42,
        0,
        Math.PI * 2,
      );

      ctx.fill();
    }

    ctx.restore();

    // River
    for (
      let row = 1;
      row <= 5;
      row++
    ) {
      drawRiver(row);
    }

    // Safe middle strip
    drawSafeZone(
      6,
      "#166534",
    );

    // Road
    for (
      let row = 7;
      row <= 11;
      row++
    ) {
      drawRoad(row);
    }

    // Start
    drawSafeZone(
      12,
      "#065f46",
    );

    // Objects
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

    // Collectibles
    for (
      const fly of flies
    ) {
      drawFly(fly);
    }

    for (
      const power of powerUps
    ) {
      drawPowerUp(
        power,
      );
    }

    // Frog
    if (
      deathTimer <= 0
    ) {
      drawFrog();
    } else {
      drawFrog(
        Math.max(
          0,
          deathTimer /
            42,
        ),
      );
    }

    // Particles
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
      "rgba(0,0,0,0.26)";

    roundRect(
      ctx,
      8,
      8,
      Math.min(
        180,
        width - 16,
      ),
      54,
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
      46,
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
        19,
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
        "SUPER HOP",
      );
    }

    if (
      scoreBoostTimer >
      0
    ) {
      effects.push(
        "2X SCORE",
      );
    }

    if (
      effects.length > 0
    ) {
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
        "bold 15px system-ui";

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
        "rgba(0,0,0,0.58)";

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
      (
        key ===
        "arrowup" ||
        key ===
        "w"
      ) &&
      alive
    ) {
      hop(0, -1);
      event.preventDefault();
      return;
    }

    if (
      (
        key ===
        "arrowdown" ||
        key ===
        "s"
      ) &&
      alive
    ) {
      hop(0, 1);
      event.preventDefault();
      return;
    }

    if (
      (
        key ===
        "arrowleft" ||
        key ===
        "a"
      ) &&
      alive
    ) {
      hop(-1, 0);
      event.preventDefault();
      return;
    }

    if (
      (
        key ===
        "arrowright" ||
        key ===
        "d"
      ) &&
      alive
    ) {
      hop(1, 0);
      event.preventDefault();
      return;
    }

    if (
      key ===
        " " &&
      !alive
    ) {
      event.preventDefault();
      reset();
      return;
    }

    if (
      key === "r" &&
      !alive
    ) {
      reset();
      return;
    }
  };

  function resetGame() {
    reset();
  }

  window.addEventListener(
    "keydown",
    onKey,
  );

  resetGame();

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
      resetGame(),

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
