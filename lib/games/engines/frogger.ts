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
  | "lily"
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

type AreaTheme =
  | "meadow"
  | "suburb"
  | "wetland"
  | "city"
  | "night";

interface LaneObject {
  x: number;
  speed: number;
  width: number;
  kind: VehicleKind | WaterKind;
  color: string;
  laneRow: number;

  minGap: number;
  variant: number;
  rotation: number;
  passed: boolean;
}

interface Lane {
  row: number;
  type: LaneType;
  speed: number;
  objects: LaneObject[];
  density: number;
}

interface WorldRow {
  row: number;
  type: "road" | "river" | "safe";
  theme: AreaTheme;
  variation: number;
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
  row: number;
  life: number;
  pulse: number;
}

interface PowerUp {
  x: number;
  row: number;
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

  startX: number;
  startY: number;

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
  const VISIBLE_ROWS = 13;

  const rh = height / VISIBLE_ROWS;
  const cw = width / COLS;

  const frogSize =
    Math.min(cw, rh) * 0.62;

  const frogRadius =
    frogSize * 0.42;

  const HOP_FRAMES = 8;

  const PACE = tune(difficulty, {
    easy: 0.78,
    regular: 1,
    hard: 1.25,
  });

  /*
   * Infinite-world settings.
   */
  const WORLD_AHEAD = 35;
  const WORLD_BEHIND = 12;
  const AREA_LENGTH = 24;

  /*
   * All mutable game state lives inside the engine closure.
   */
  let particles: Particle[] = [];
  let floatingTexts: FloatingText[] = [];

  let worldRows =
    new Map<number, WorldRow>();

  let lanes =
    new Map<number, Lane>();

  let score = 0;
  let lives = 3;

  let furthestRow = 0;

  let combo = 0;
  let comboTimer = 0;
  let bestCombo = 0;

  let alive = true;
  let busy = false;

  let deathTimer = 0;

  let screenShake = 0;
  let flash = 0;

  let weather: Weather = "day";

  let fly: Fly | null = null;
  let powerUp: PowerUp | null = null;

  let flyTimer = 320;
  let powerTimer = 520;

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

  let cameraRow = 0;
  let cameraTargetRow = 0;

  let lastGeneratedType:
    | "road"
    | "river"
    | "safe"
    | null = null;

  let consecutiveDangerRows = 0;

  let frog: Frog = {
    col: 6,
    row: 0,

    x: cw * 6.5,
    y: 0,

    targetX: cw * 6.5,
    targetY: 0,

    startX: cw * 6.5,
    startY: 0,

    hopFrame: HOP_FRAMES,
    hopping: false,

    facing: -1,
    squash: 0,

    riding: null,
  };

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

  function randomInt(
    min: number,
    max: number,
  ) {
    return Math.floor(
      randomRange(
        min,
        max + 1,
      ),
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

  /*
   * Converts a world row to screen Y.
   */
  function worldToScreenY(
    row: number,
  ) {
    return (
      (row - cameraRow) *
        rh +
      rh / 2
    );
  }

  function areaForRow(
    row: number,
  ): AreaTheme {
    const area =
      Math.floor(
        Math.max(0, row) /
          AREA_LENGTH,
      );

    const themes: AreaTheme[] = [
      "meadow",
      "suburb",
      "wetland",
      "city",
      "night",
    ];

    return themes[
      area %
        themes.length
    ];
  }

  function areaNumber(
    row: number,
  ) {
    return (
      Math.floor(
        Math.max(0, row) /
          AREA_LENGTH,
      ) + 1
    );
  }

  function areaName(
    theme: AreaTheme,
  ) {
    switch (theme) {
      case "meadow":
        return "MEADOWS";
      case "suburb":
        return "SUBURBS";
      case "wetland":
        return "WETLANDS";
      case "city":
        return "CITY";
      case "night":
        return "NIGHT DISTRICT";
    }
  }

  function areaPalette(
    theme: AreaTheme,
  ) {
    switch (theme) {
      case "meadow":
        return {
          safe: "#166534",
          road: "#263238",
          river: "#155e75",
        };

      case "suburb":
        return {
          safe: "#3f6212",
          road: "#374151",
          river: "#155e75",
        };

      case "wetland":
        return {
          safe: "#14532d",
          road: "#29333a",
          river: "#075985",
        };

      case "city":
        return {
          safe: "#365314",
          road: "#18181b",
          river: "#164e63",
        };

      case "night":
        return {
          safe: "#052e16",
          road: "#111827",
          river: "#0c4a6e",
        };
    }
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

  /*
   * ---------------------------------------------------------
   * EFFECTS
   * ---------------------------------------------------------
   */

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

  function updateEffects() {
    if (
      comboTimer >
      0
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
      shieldTimer >
      0
    ) {
      shieldTimer--;
    }

    if (
      slowTimer >
      0
    ) {
      slowTimer--;
    }

    if (
      superHopTimer >
      0
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
        specialEvent =
          "";
      }
    }

    if (
      screenShake >
      0
    ) {
      screenShake *=
        0.85;

      if (
        screenShake <
        0.2
      ) {
        screenShake =
          0;
      }
    }

    if (
      flash >
      0
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
          particle.life >
          0,
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
          item.life >
          0,
      );
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

    const value =
      Math.round(
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
    comboTimer = 100;

    bestCombo =
      Math.max(
        bestCombo,
        combo,
      );

    if (
      combo >= 4
    ) {
      addFloatingText(
        frog.x,
        worldToScreenY(
          frog.row,
        ) -
          rh * 0.7,
        `FLOW x${combo}`,
        true,
      );
    }
  }

  function resetCombo() {
    combo = 0;
    comboTimer = 0;
  }

  /*
   * ---------------------------------------------------------
   * WORLD GENERATION
   * ---------------------------------------------------------
   */

  function chooseRowType(
    row: number,
  ): "road" | "river" | "safe" {
    if (
      row === 0
    ) {
      return "safe";
    }

    if (
      row %
        AREA_LENGTH ===
        0 ||
      row %
        AREA_LENGTH ===
        1
    ) {
      return "safe";
    }

    if (
      consecutiveDangerRows >=
      5
    ) {
      consecutiveDangerRows = 0;
      return "safe";
    }

    const theme =
      areaForRow(row);

    const roll =
      Math.random();

    let type:
      | "road"
      | "river"
      | "safe";

    switch (theme) {
      case "meadow":
        type =
          roll < 0.5
            ? "road"
            : roll < 0.77
              ? "river"
              : "safe";
        break;

      case "suburb":
        type =
          roll < 0.64
            ? "road"
            : roll < 0.8
              ? "safe"
              : "river";
        break;

      case "wetland":
        type =
          roll < 0.33
            ? "road"
            : roll < 0.76
              ? "river"
              : "safe";
        break;

      case "city":
        type =
          roll < 0.72
            ? "road"
            : roll < 0.85
              ? "safe"
              : "river";
        break;

      case "night":
        type =
          roll < 0.55
            ? "road"
            : roll < 0.8
              ? "river"
              : "safe";
        break;
    }

    if (
      lastGeneratedType ===
        "safe" &&
      type ===
        "safe" &&
      Math.random() <
        0.65
    ) {
      type =
        Math.random() <
        0.55
          ? "road"
          : "river";
    }

    if (
      type ===
      "safe"
    ) {
      consecutiveDangerRows = 0;
    } else {
      consecutiveDangerRows++;
    }

    lastGeneratedType =
      type;

    return type;
  }

  function createRoadLane(
    row: number,
    theme: AreaTheme,
  ): Lane {
    const direction =
      Math.random() <
      0.5
        ? -1
        : 1;

    const areaIndex =
      Math.floor(
        row /
          AREA_LENGTH,
      );

    const baseSpeeds =
      theme === "city"
        ? [
            1.5,
            1.75,
            2.1,
            2.45,
          ]
        : theme === "night"
          ? [
              1.35,
              1.65,
              1.95,
              2.3,
            ]
          : [
              1.15,
              1.4,
              1.7,
              2.05,
            ];

    const baseSpeed =
      randomItem(
        baseSpeeds,
      ) *
      PACE *
      (
        1 +
        Math.min(
          0.22,
          areaIndex *
            0.012,
        )
      ) *
      direction;

    /*
     * Only 2–4 actual vehicles per lane.
     * They are never duplicated.
     */
    const vehicleCount =
      randomInt(
        2,
        theme === "city"
          ? 4
          : 3,
      );

    const kinds: VehicleKind[] =
      theme === "city"
        ? [
            "car",
            "van",
            "sports",
            "bus",
          ]
        : [
            "car",
            "van",
            "truck",
            "sports",
          ];

    const objects: LaneObject[] =
      [];

    let cursor =
      direction > 0
        ? -80
        : width + 80;

    for (
      let i = 0;
      i < vehicleCount;
      i++
    ) {
      const kind =
        randomItem(
          kinds,
        );

      const multiplier =
        kind === "truck"
          ? 1.65
          : kind === "bus"
            ? 1.9
            : kind === "van"
              ? 1.3
              : kind === "sports"
                ? 0.78
                : 1;

      const vehicleWidth =
        cw *
        multiplier *
        randomRange(
          0.9,
          1.08,
        );

      const gap =
        Math.max(
          cw * 0.65,
          randomRange(
            44,
            cw * 1.45,
          ),
        );

      const speed =
        baseSpeed *
        randomRange(
          0.84,
          1.16,
        );

      if (
        direction > 0
      ) {
        if (
          i === 0
        ) {
          cursor =
            -vehicleWidth -
            randomRange(
              20,
              90,
            );
        } else {
          cursor +=
            gap;
        }

        objects.push({
          x: cursor,
          speed,
          width:
            vehicleWidth,
          kind,
          color:
            getVehicleColor(
              kind,
            ),
          laneRow: row,
          minGap:
            gap,
          variant:
            randomInt(
              0,
              2,
            ),
          rotation: 0,
          passed: false,
        });

        cursor +=
          vehicleWidth;
      } else {
        if (
          i === 0
        ) {
          cursor =
            width +
            randomRange(
              20,
              90,
            );
        } else {
          cursor -=
            gap;
        }

        const x =
          cursor -
          vehicleWidth;

        objects.push({
          x,
          speed,
          width:
            vehicleWidth,
          kind,
          color:
            getVehicleColor(
              kind,
            ),
          laneRow: row,
          minGap:
            gap,
          variant:
            randomInt(
              0,
              2,
            ),
          rotation: 0,
          passed: false,
        });

        cursor =
          x;
      }
    }

    return {
      row,
      type: "road",
      speed: baseSpeed,
      objects,
      density:
        randomRange(
          0.85,
          1.15,
        ),
    };
  }

  function createRiverLane(
    row: number,
    _theme: AreaTheme,
  ): Lane {
    const direction =
      Math.random() <
      0.5
        ? -1
        : 1;

    const baseSpeed =
      randomRange(
        1.0,
        1.85,
      ) *
      PACE *
      direction;

    /*
     * One river row uses one platform type.
     *
     * This completely avoids log/lily cross-over.
     */
    const kind: WaterKind =
      randomItem([
        "log",
        "log",
        "smallLog",
        "lily",
      ]);

    const count =
      kind === "log"
        ? randomInt(2, 4)
        : randomInt(3, 5);

    const objects: LaneObject[] =
      [];

    const multiplier =
      kind === "log"
        ? 1.8
        : kind === "smallLog"
          ? 0.95
          : 1.25;

    let cursor =
      direction > 0
        ? -70
        : width + 70;

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const objectWidth =
        cw *
        multiplier *
        randomRange(
          0.9,
          1.08,
        );

      const gap =
        Math.max(
          cw * 0.65,
          randomRange(
            45,
            cw * 1.5,
          ),
        );

      if (
        direction > 0
      ) {
        if (
          i === 0
        ) {
          cursor =
            -objectWidth -
            randomRange(
              20,
              70,
            );
        } else {
          cursor +=
            gap;
        }

        objects.push({
          x: cursor,
          speed:
            baseSpeed *
            randomRange(
              0.92,
              1.08,
            ),
          width:
            objectWidth,
          kind,
          color:
            kind === "lily"
              ? "#3f8f3f"
              : kind ===
                  "smallLog"
                ? "#8b5a2b"
                : "#8f5a2a",
          laneRow: row,
          minGap:
            gap,
          variant:
            randomInt(
              0,
              2,
            ),
          rotation:
            randomRange(
              -0.08,
              0.08,
            ),
          passed: false,
        });

        cursor +=
          objectWidth;
      } else {
        if (
          i === 0
        ) {
          cursor =
            width +
            randomRange(
              20,
              70,
            );
        } else {
          cursor -=
            gap;
        }

        const x =
          cursor -
          objectWidth;

        objects.push({
          x,
          speed:
            baseSpeed *
            randomRange(
              0.92,
              1.08,
            ),
          width:
            objectWidth,
          kind,
          color:
            kind === "lily"
              ? "#3f8f3f"
              : kind ===
                  "smallLog"
                ? "#8b5a2b"
                : "#8f5a2a",
          laneRow: row,
          minGap:
            gap,
          variant:
            randomInt(
              0,
              2,
            ),
          rotation:
            randomRange(
              -0.08,
              0.08,
            ),
          passed: false,
        });

        cursor =
          x;
      }
    }

    return {
      row,
      type: "river",
      speed: baseSpeed,
      objects,
      density:
        randomRange(
          0.85,
          1.15,
        ),
    };
  }

  function generateRow(
    row: number,
  ) {
    if (
      row < 0 ||
      worldRows.has(row)
    ) {
      return;
    }

    const theme =
      areaForRow(row);

    const type =
      chooseRowType(row);

    worldRows.set(
      row,
      {
        row,
        type,
        theme,
        variation:
          randomInt(
            0,
            4,
          ),
      },
    );

    if (
      type === "road"
    ) {
      lanes.set(
        row,
        createRoadLane(
          row,
          theme,
        ),
      );
    } else if (
      type === "river"
    ) {
      lanes.set(
        row,
        createRiverLane(
          row,
          theme,
        ),
      );
    }
  }

  function ensureWorldAhead() {
    const start =
      Math.max(
        0,
        frog.row -
          WORLD_BEHIND,
      );

    const end =
      frog.row +
      WORLD_AHEAD;

    for (
      let row = start;
      row <= end;
      row++
    ) {
      generateRow(row);
    }

    const pruneBefore =
      Math.max(
        0,
        frog.row -
          WORLD_BEHIND,
      );

    for (
      const row of worldRows.keys()
    ) {
      if (
        row <
        pruneBefore
      ) {
        worldRows.delete(row);
        lanes.delete(row);
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * FROG / MOVEMENT
   * ---------------------------------------------------------
   */

  function syncFrogColumnFromWorld() {
    frog.col = clamp(
      Math.floor(
        frog.x / cw,
      ),
      0,
      COLS - 1,
    );
  }

  function updateCamera() {
    cameraTargetRow =
      Math.max(
        0,
        frog.row - 4.4,
      );

    cameraRow +=
      (
        cameraTargetRow -
        cameraRow
      ) *
      0.12;
  }

  function resetFrog() {
    frog = {
      col: 6,
      row: furthestRow,

      x: cw * 6.5,
      y: furthestRow,

      targetX: cw * 6.5,
      targetY: furthestRow,

      startX: cw * 6.5,
      startY: furthestRow,

      hopFrame: HOP_FRAMES,
      hopping: false,

      facing: -1,
      squash: 0,

      riding: null,
    };

    queuedMove = null;

    updateCamera();
  }

  function requestMove(
    dc: number,
    dr: number,
  ) {
    if (
      !alive ||
      busy ||
      deathTimer > 0
    ) {
      return;
    }

    if (
      frog.hopping
    ) {
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
      superHopTimer >
      0
        ? 2
        : 1;

    syncFrogColumnFromWorld();

    const nextCol =
      clamp(
        frog.col +
          dc *
            distance,
        0,
        COLS - 1,
      );

    const nextRow =
      Math.max(
        0,
        frog.row +
          dr *
            distance,
      );

    if (
      nextCol ===
        frog.col &&
      nextRow ===
        frog.row
    ) {
      return;
    }

    generateRow(
      nextRow,
    );

    frog.startX =
      frog.x;

    frog.startY =
      frog.y;

    frog.targetX =
      nextCol * cw +
      cw / 2;

    frog.targetY =
      nextRow;

    frog.hopFrame = 0;
    frog.hopping = true;
    frog.riding = null;

    if (
      dc !== 0
    ) {
      frog.facing =
        dc > 0
          ? 1
          : -1;
    }

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

    const progress =
      clamp(
        frog.hopFrame /
          HOP_FRAMES,
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
      frog.startX +
      (
        frog.targetX -
        frog.startX
      ) *
        eased;

    frog.y =
      frog.startY +
      (
        frog.targetY -
        frog.startY
      ) *
        eased;

    frog.squash =
      Math.sin(
        progress *
          Math.PI,
      );

    if (
      frog.hopFrame >=
      HOP_FRAMES
    ) {
      frog.col =
        clamp(
          Math.round(
            frog.targetX /
              cw -
              0.5,
          ),
          0,
          COLS - 1,
        );

      frog.row =
        Math.max(
          0,
          Math.round(
            frog.targetY,
          ),
        );

      frog.x =
        frog.targetX;

      frog.y =
        frog.targetY;

      frog.hopping = false;
      frog.squash = 1;

      onLanding();

      if (
        queuedMove &&
        alive &&
        deathTimer <=
          0
      ) {
        const move =
          queuedMove;

        queuedMove = null;

        startHop(
          move.dc,
          move.dr,
        );
      }
    }
  }

  function onLanding() {
    const row =
      frog.row;

    if (
      row >
      furthestRow
    ) {
      const distance =
        row -
        furthestRow;

      furthestRow =
        row;

      beginCombo();

      addScore(
        10 +
          Math.min(
            distance * 5,
            30,
          ),
        frog.x,
        worldToScreenY(
          row,
        ) -
          rh * 0.55,
      );

      const currentArea =
        areaNumber(
          row,
        );

      const previousArea =
        areaNumber(
          row - 1,
        );

      if (
        currentArea !==
        previousArea
      ) {
        updateAreaStatus();
      }
    }

    collectIfNearby();

    const rowData =
      worldRows.get(
        row,
      );

    if (
      rowData?.type ===
      "road"
    ) {
      checkRoadCollision();
    } else if (
      rowData?.type ===
      "river"
    ) {
      checkRiverSupport();
    }
  }

  function updateAreaStatus() {
    const theme =
      areaForRow(
        frog.row,
      );

    weather =
      theme === "night"
        ? "night"
        : frog.row %
              AREA_LENGTH >
            AREA_LENGTH *
              0.55
          ? "evening"
          : "day";

    onStatus?.(
      `Area ${areaNumber(
        frog.row,
      )}: ${areaName(theme)}`,
    );
  }

  /*
   * ---------------------------------------------------------
   * ROAD / RIVER
   * ---------------------------------------------------------
   */

  function getCurrentLane() {
    return lanes.get(
      frog.row,
    );
  }

  function isOnObject(
    object: LaneObject,
  ) {
    const margin =
      frogRadius *
      0.9;

    return (
      frog.x + margin >
        object.x &&
      frog.x - margin <
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

    const frogY =
      worldToScreenY(
        frog.row,
      );

    const top =
      frogY -
      frogRadius;

    const bottom =
      frogY +
      frogRadius;

    for (
      const object of lane.objects
    ) {
      const objectY =
        worldToScreenY(
          object.laneRow,
        );

      const objectTop =
        objectY -
        rh * 0.28;

      const objectBottom =
        objectY +
        rh * 0.28;

      const hit =
        frog.x +
          frogRadius >
          object.x &&
        frog.x -
          frogRadius <
          object.x +
            object.width &&
        bottom >
          objectTop &&
        top <
          objectBottom;

      if (!hit) {
        continue;
      }

      if (
        shieldTimer >
        0
      ) {
        shieldTimer = 0;

        burst(
          frog.x,
          frogY,
          "#7dd3fc",
          18,
        );

        addFloatingText(
          frog.x,
          frogY -
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
      !support
    ) {
      if (
        shieldTimer >
        0
      ) {
        shieldTimer = 0;

        const frogY =
          worldToScreenY(
            frog.row,
          );

        burst(
          frog.x,
          frogY,
          "#7dd3fc",
          20,
        );

        addFloatingText(
          frog.x,
          frogY -
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

    syncFrogColumnFromWorld();
  }

  function updateRiding() {
    if (
      frog.hopping ||
      !frog.riding
    ) {
      return;
    }

    const lane =
      getCurrentLane();

    if (
      !lane ||
      lane.type !==
        "river"
    ) {
      frog.riding = null;
      return;
    }

    const object =
      frog.riding;

    if (
      !lane.objects.includes(
        object,
      )
    ) {
      frog.riding = null;
      checkRiverSupport();
      return;
    }

    const multiplier =
      slowTimer > 0
        ? 0.55
        : 1;

    frog.x +=
      object.speed *
      multiplier;

    if (
      specialEvent ===
      "FLOOD"
    ) {
      frog.x +=
        object.speed *
        0.25;
    }

    syncFrogColumnFromWorld();

    if (
      frog.x <
        -frogRadius ||
      frog.x >
        width +
          frogRadius
    ) {
      die("edge");
      return;
    }

    if (
      !isOnObject(
        object,
      )
    ) {
      frog.riding = null;
      checkRiverSupport();
    }
  }

  /*
   * ---------------------------------------------------------
   * TRAFFIC UPDATE
   * ---------------------------------------------------------
   */

  function respawnVehicle(
    lane: Lane,
    object: LaneObject,
  ) {
    const gap =
      Math.max(
        44,
        randomRange(
          cw * 0.6,
          cw * 1.5,
        ),
        object.minGap,
      );

    if (
      object.speed >
      0
    ) {
      let leftmost =
        Infinity;

      for (
        const other of lane.objects
      ) {
        if (
          other ===
          object
        ) {
          continue;
        }

        leftmost =
          Math.min(
            leftmost,
            other.x,
          );
      }

      /*
       * IMPORTANT:
       *
       * The initial spawn point is always off-screen.
       * If another vehicle is further left, we move farther
       * left instead of putting this vehicle in the middle.
       */
      let spawnX =
        -object.width -
        randomRange(
          30,
          100,
        );

      if (
        leftmost !==
          Infinity &&
        spawnX +
          object.width +
          gap >
          leftmost
      ) {
        spawnX =
          leftmost -
          object.width -
          gap -
          randomRange(
            10,
            35,
          );
      }

      object.x =
        Math.min(
          spawnX,
          -object.width -
            8,
        );
    } else {
      let rightmost =
        -Infinity;

      for (
        const other of lane.objects
      ) {
        if (
          other ===
          object
        ) {
          continue;
        }

        rightmost =
          Math.max(
            rightmost,
            other.x +
              other.width,
          );
      }

      let spawnX =
        width +
        randomRange(
          30,
          100,
        );

      if (
        rightmost !==
          -Infinity &&
        spawnX -
          gap <
          rightmost
      ) {
        spawnX =
          rightmost +
          gap +
          randomRange(
            10,
            35,
          );
      }

      spawnX =
        Math.max(
          spawnX,
          width + 8,
        );

      object.x =
        spawnX -
        object.width;
    }

    object.speed *=
      randomRange(
        0.93,
        1.07,
      );

    object.minGap =
      randomRange(
        cw * 0.6,
        cw * 1.5,
      );

    object.variant =
      randomInt(
        0,
        2,
      );

    object.passed =
      false;
  }

  function updateLanes() {
    const minRow =
      Math.max(
        0,
        frog.row -
          WORLD_BEHIND,
      );

    const maxRow =
      frog.row +
      WORLD_AHEAD;

    for (
      const lane of lanes.values()
    ) {
      if (
        lane.row <
          minRow ||
        lane.row >
          maxRow
      ) {
        continue;
      }

      let multiplier =
        slowTimer > 0
          ? 0.55
          : 1;

      if (
        specialEvent ===
          "RUSH HOUR" &&
        lane.type ===
          "road"
      ) {
        multiplier *=
          1.18;
      }

      if (
        specialEvent ===
          "FLOOD" &&
        lane.type ===
          "river"
      ) {
        multiplier *=
          1.25;
      }

      for (
        const object of lane.objects
      ) {
        object.x +=
          object.speed *
          multiplier;

        if (
          lane.type ===
          "road"
        ) {
          if (
            object.speed > 0 &&
            object.x >
              width +
                object.width +
                25
          ) {
            respawnVehicle(
              lane,
              object,
            );
          } else if (
            object.speed < 0 &&
            object.x <
              -object.width -
                25
          ) {
            respawnVehicle(
              lane,
              object,
            );
          }
        } else {
          /*
           * River platforms wrap only after they completely
           * leave the screen.
           *
           * Their spacing is preserved because each platform
           * is moved to the outside of the river, not randomly
           * dropped into it.
           */
          if (
            object.speed > 0 &&
            object.x >
              width + 60
          ) {
            let leftmost =
              Infinity;

            for (
              const other of lane.objects
            ) {
              if (
                other ===
                object
              ) {
                continue;
              }

              leftmost =
                Math.min(
                  leftmost,
                  other.x,
                );
            }

            object.x =
              Math.min(
                -object.width -
                  randomRange(
                    20,
                    80,
                  ),
                leftmost -
                  object.width -
                  object.minGap,
              );
          } else if (
            object.speed < 0 &&
            object.x <
              -object.width -
                60
          ) {
            let rightmost =
              -Infinity;

            for (
              const other of lane.objects
            ) {
              if (
                other ===
                object
              ) {
                continue;
              }

              rightmost =
                Math.max(
                  rightmost,
                  other.x +
                    other.width,
                );
            }

            object.x =
              Math.max(
                width +
                  randomRange(
                    20,
                    80,
                  ),
                rightmost +
                  object.minGap,
              ) -
              object.width;
          }
        }
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * DEATH / RESET
   * ---------------------------------------------------------
   */

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

    const screenY =
      worldToScreenY(
        frog.row,
      );

    if (
      reason ===
      "water"
    ) {
      burst(
        frog.x,
        screenY,
        "#60a5fa",
        24,
      );

      addFloatingText(
        frog.x,
        screenY,
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
        screenY,
        "#f87171",
        22,
      );

      addFloatingText(
        frog.x,
        screenY,
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
      lives <=
      0
    ) {
      alive = false;
      busy = false;
      deathTimer = 0;

      onStatus?.(
        "Game over",
      );

      onGameOver(
        score,
        areaNumber(
          furthestRow,
        ),
      );

      return;
    }

    frog = {
      col: 6,
      row: furthestRow,

      x: cw * 6.5,
      y: furthestRow,

      targetX: cw * 6.5,
      targetY: furthestRow,

      startX: cw * 6.5,
      startY: furthestRow,

      hopFrame: HOP_FRAMES,
      hopping: false,

      facing: -1,
      squash: 0,

      riding: null,
    };

    busy = false;
    deathTimer = 0;

    updateCamera();

    onStatus?.(
      `${lives} ${
        lives ===
        1
          ? "life"
          : "lives"
      } remaining`,
    );
  }

  /*
   * ---------------------------------------------------------
   * COLLECTIBLES
   * ---------------------------------------------------------
   */

  function spawnFly() {
    const row =
      randomInt(
        Math.max(
          1,
          frog.row,
        ),
        frog.row + 10,
      );

    generateRow(
      row,
    );

    fly = {
      x: randomRange(
        cw,
        width -
          cw,
      ),
      row,
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
      randomInt(
        Math.max(
          1,
          frog.row,
        ),
        frog.row + 9,
      );

    generateRow(
      row,
    );

    powerUp = {
      x: randomRange(
        cw,
        width -
          cw,
      ),
      row,
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

  function updateCollectibles() {
    if (fly) {
      fly.life--;
      fly.pulse +=
        0.12;

      if (
        fly.life <=
        0 ||
        fly.row <
          frog.row - 8
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
          0 ||
        powerUp.row <
          frog.row - 8
      ) {
        powerUp = null;
      }
    }

    flyTimer--;

    if (
      flyTimer <=
        0 &&
      fly === null &&
      frog.row >= 4
    ) {
      spawnFly();
    }

    powerTimer--;

    if (
      powerTimer <=
        0 &&
      powerUp ===
        null &&
      frog.row >= 6
    ) {
      spawnPowerUp();
    }
  }

  function collectIfNearby() {
    const frogY =
      worldToScreenY(
        frog.row,
      );

    if (
      fly &&
      Math.hypot(
        fly.x -
          frog.x,
        worldToScreenY(
          fly.row,
        ) -
          frogY,
      ) <
        frogSize
    ) {
      addScore(
        250,
        fly.x,
        worldToScreenY(
          fly.row,
        ),
        "FLY",
      );

      beginCombo();

      burst(
        fly.x,
        worldToScreenY(
          fly.row,
        ),
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
        worldToScreenY(
          powerUp.row,
        ) -
          frogY,
      ) <
        frogSize
    ) {
      collectPowerUp(
        powerUp,
      );

      powerUp = null;
    }
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

  function collectPowerUp(
    pickup: PowerUp,
  ) {
    const screenY =
      worldToScreenY(
        pickup.row,
      );

    switch (
      pickup.type
    ) {
      case "shield":
        shieldTimer = 720;

        addFloatingText(
          pickup.x,
          screenY,
          "SHIELD",
          true,
        );
        break;

      case "slow":
        slowTimer = 420;

        addFloatingText(
          pickup.x,
          screenY,
          "SLOW TIME",
          true,
        );
        break;

      case "superHop":
        superHopTimer =
          360;

        addFloatingText(
          pickup.x,
          screenY,
          "SUPER HOP",
          true,
        );
        break;

      case "score":
        scoreBoostTimer =
          360;

        addFloatingText(
          pickup.x,
          screenY,
          "2X SCORE",
          true,
        );
        break;
    }

    burst(
      pickup.x,
      screenY,
      "#ffffff",
      18,
    );

    beep(
      760,
      0.08,
    );
  }

  /*
   * ---------------------------------------------------------
   * SPECIAL EVENTS
   * ---------------------------------------------------------
   */

  function getSpecialEvent() {
    if (
      frog.row <
        20 ||
      Math.random() >
        0.22
    ) {
      return "";
    }

    return randomItem([
      "RUSH HOUR",
      "FLOOD",
      "NIGHT TRAFFIC",
    ]);
  }

  /*
   * ---------------------------------------------------------
   * UPDATE
   * ---------------------------------------------------------
   */

  function update() {
    updateEffects();

    if (!alive) {
      return;
    }

    updateCollectibles();

    if (
      deathTimer >
      0
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

    ensureWorldAhead();

    if (
      frog.hopping
    ) {
      updateHop();
    } else {
      updateRiding();

      collectIfNearby();

      const rowData =
        worldRows.get(
          frog.row,
        );

      if (
        rowData?.type ===
        "road"
      ) {
        checkRoadCollision();
      } else if (
        rowData?.type ===
          "river" &&
        frog.riding ===
          null
      ) {
        checkRiverSupport();
      }
    }

    updateLanes();
    updateCamera();

    frog.squash *=
      0.82;

    /*
     * Trigger occasional special events.
     */
    if (
      !specialEvent &&
      frog.row > 30 &&
      frog.row %
          45 ===
        0
    ) {
      specialEvent =
        getSpecialEvent();

      specialEventTimer =
        specialEvent
          ? 600
          : 0;

      if (
        specialEvent
      ) {
        onStatus?.(
          `${specialEvent}!`,
        );
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * BACKGROUND
   * ---------------------------------------------------------
   */

  function drawRowBackground(
    rowData: WorldRow,
  ) {
    const colors =
      areaPalette(
        rowData.theme,
      );

    const y =
      worldToScreenY(
        rowData.row,
      ) -
      rh / 2;

    if (
      rowData.type ===
      "road"
    ) {
      ctx.fillStyle =
        colors.road;

      ctx.fillRect(
        0,
        y,
        width,
        rh,
      );

      ctx.strokeStyle =
        "rgba(255,255,255,0.11)";

      ctx.lineWidth = 2;

      ctx.setLineDash([
        15,
        22,
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

      return;
    }

    if (
      rowData.type ===
      "river"
    ) {
      ctx.fillStyle =
        colors.river;

      ctx.fillRect(
        0,
        y,
        width,
        rh,
      );

      ctx.strokeStyle =
        "rgba(125,211,252,0.11)";

      ctx.lineWidth = 1;

      const offset =
        (
          rowData.row *
            41 +
          rowData.variation *
            23
        ) %
        100;

      for (
        let x =
          -100 +
          offset;
        x <
        width + 100;
        x += 110
      ) {
        ctx.beginPath();

        ctx.moveTo(
          x,
          y +
            rh *
              0.3,
        );

        ctx.lineTo(
          x + 42,
          y +
            rh *
              0.3,
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
          x + 27,
          y +
            rh *
              0.7,
        );

        ctx.lineTo(
          x + 72,
          y +
            rh *
              0.7,
        );

        ctx.stroke();
      }

      return;
    }

    ctx.fillStyle =
      colors.safe;

    ctx.fillRect(
      0,
      y,
      width,
      rh,
    );

    ctx.fillStyle =
      "rgba(255,255,255,0.035)";

    for (
      let i = 0;
      i < 5;
      i++
    ) {
      const x =
        (
          rowData.row *
            29 +
          i * 137
        ) %
        width;

      ctx.fillRect(
        x,
        y +
          rh *
            (0.2 +
              (i %
                3) *
                0.2),
        3,
        3,
      );
    }
  }

  function drawBackground() {
    ctx.fillStyle =
      weather === "night"
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

    const firstRow =
      Math.floor(
        cameraRow,
      ) - 2;

    const lastRow =
      Math.ceil(
        cameraRow +
          VISIBLE_ROWS,
      ) + 2;

    for (
      let row =
        firstRow;
      row <=
      lastRow;
      row++
    ) {
      const rowData =
        worldRows.get(
          row,
        );

      if (
        rowData
      ) {
        drawRowBackground(
          rowData,
        );
      }
    }
  }

  function drawGrid() {
    ctx.save();

    ctx.strokeStyle =
      "rgba(255,255,255,0.035)";

    ctx.lineWidth = 1;

    const firstRow =
      Math.floor(
        cameraRow,
      ) - 1;

    const lastRow =
      Math.ceil(
        cameraRow +
          VISIBLE_ROWS,
      ) + 1;

    for (
      let row =
        firstRow;
      row <=
      lastRow;
      row++
    ) {
      const y =
        worldToScreenY(
          row,
        ) -
        rh / 2;

      ctx.beginPath();

      ctx.moveTo(
        0,
        y,
      );

      ctx.lineTo(
        width,
        y,
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  /*
   * ---------------------------------------------------------
   * VEHICLES
   * ---------------------------------------------------------
   */

  function drawVehicle(
    object: LaneObject,
  ) {
    const y =
      worldToScreenY(
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

  /*
   * ---------------------------------------------------------
   * LOGS
   * ---------------------------------------------------------
   */

  function drawLog(
    object: LaneObject,
  ) {
    const centerY =
      worldToScreenY(
        object.laneRow,
      );

    const h =
      object.kind ===
      "smallLog"
        ? rh * 0.34
        : rh * 0.48;

    const bodyY =
      centerY -
      h / 2;

    const left =
      object.x;

    const right =
      object.x +
      object.width;

    ctx.save();

    ctx.fillStyle =
      "#6f4324";

    roundRect(
      ctx,
      left,
      bodyY,
      object.width,
      h,
      h * 0.28,
    );

    ctx.fill();

    ctx.strokeStyle =
      "#4f2f1b";

    ctx.lineWidth =
      Math.max(
        1,
        h * 0.08,
      );

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const px =
        left +
        object.width *
          (0.18 +
            i *
              0.22);

      ctx.beginPath();

      ctx.moveTo(
        px,
        bodyY +
          h * 0.12,
      );

      ctx.lineTo(
        px -
          h * 0.1,
        bodyY +
          h * 0.86,
      );

      ctx.stroke();
    }

    ctx.fillStyle =
      "#a87543";

    ctx.beginPath();

    ctx.ellipse(
      left +
        h *
          0.12,
      centerY,
      h * 0.16,
      h * 0.43,
      0,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.beginPath();

    ctx.ellipse(
      right -
        h *
          0.12,
      centerY,
      h * 0.16,
      h * 0.43,
      0,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.strokeStyle =
      "#81562f";

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.ellipse(
      left +
        h *
          0.12,
      centerY,
      h * 0.08,
      h * 0.24,
      0,
      0,
      Math.PI * 2,
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.ellipse(
      right -
        h *
          0.12,
      centerY,
      h * 0.08,
      h * 0.24,
      0,
      0,
      Math.PI * 2,
    );

    ctx.stroke();

    ctx.fillStyle =
      "#4b2d18";

    ctx.beginPath();

    ctx.ellipse(
      left +
        object.width *
          0.42,
      centerY -
        h * 0.03,
      h * 0.06,
      h * 0.1,
      -0.25,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.beginPath();

    ctx.ellipse(
      left +
        object.width *
          0.74,
      centerY +
        h * 0.06,
      h * 0.05,
      h * 0.08,
      0.2,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.restore();
  }

  /*
   * ---------------------------------------------------------
   * LILY
   * ---------------------------------------------------------
   */

  function drawLily(
    object: LaneObject,
  ) {
    const centerX =
      object.x +
      object.width /
        2;

    const centerY =
      worldToScreenY(
        object.laneRow,
      );

    const radius =
      Math.min(
        object.width *
          0.42,
        rh * 0.34,
      );

    ctx.save();

    ctx.translate(
      centerX,
      centerY,
    );

    ctx.rotate(
      object.rotation,
    );

    ctx.fillStyle =
      "#3f8f3f";

    ctx.beginPath();

    const segments =
      20;

    for (
      let i = 0;
      i <= segments;
      i++
    ) {
      const angle =
        (Math.PI * 2 * i) /
        segments;

      let r =
        radius *
        (
          0.96 +
          Math.sin(
            i * 2.3 +
              object.variant,
          ) *
            0.04
        );

      let px =
        Math.cos(angle) *
        r;

      let py =
        Math.sin(angle) *
        r;

      const notchAngle =
        -Math.PI / 2;

      const angleDifference =
        Math.atan2(
          Math.sin(
            angle -
              notchAngle,
          ),
          Math.cos(
            angle -
              notchAngle,
          ),
        );

      if (
        Math.abs(
          angleDifference,
        ) <
        0.24
      ) {
        const notchFactor =
          1 -
          (
            0.24 -
            Math.abs(
              angleDifference,
            )
          ) /
            0.24 *
            0.72;

        px *=
          notchFactor;

        py *=
          notchFactor;
      }

      if (
        i === 0
      ) {
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
    ctx.fill();

    ctx.fillStyle =
      "rgba(134,239,135,0.18)";

    ctx.beginPath();

    ctx.arc(
      -radius * 0.1,
      radius * 0.08,
      radius * 0.62,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.strokeStyle =
      "rgba(20,83,45,0.5)";

    ctx.lineWidth =
      1.3;

    for (
      let i = 0;
      i < 6;
      i++
    ) {
      const angle =
        -Math.PI / 2 +
        i *
          (Math.PI / 3);

      ctx.beginPath();

      ctx.moveTo(
        0,
        0,
      );

      ctx.lineTo(
        radius *
          0.72 *
          Math.cos(
            angle,
          ),
        radius *
          0.72 *
          Math.sin(
            angle,
          ),
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  function drawRiverObject(
    object: LaneObject,
  ) {
    if (
      object.kind ===
        "log" ||
      object.kind ===
        "smallLog"
    ) {
      drawLog(
        object,
      );
    } else {
      drawLily(
        object,
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * FROG
   * ---------------------------------------------------------
   */

  function drawFrog(
    alpha = 1,
  ) {
    const jumpArc =
      frog.hopping
        ? Math.sin(
            (
              frog.hopFrame /
              HOP_FRAMES
            ) *
              Math.PI,
          ) *
          rh *
          0.28
        : 0;

    const scale =
      frog.hopping
        ? 0.9
        : 1;

    const screenY =
      worldToScreenY(
        frog.y,
      );

    ctx.save();

    ctx.globalAlpha =
      alpha;

    ctx.translate(
      frog.x,
      screenY -
        jumpArc,
    );

    ctx.scale(
      scale,
      1 / scale,
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
      worldToScreenY(
        fly.row,
      ),
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

  function drawPowerUp() {
    if (
      !powerUp
    ) {
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

    const screenY =
      worldToScreenY(
        powerUp.row,
      );

    ctx.save();

    ctx.strokeStyle =
      color;

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.arc(
      powerUp.x,
      screenY,
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
      screenY,
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
      screenY,
    );

    ctx.restore();
  }

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

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

    /*
     * Current frog cell.
     */
    if (alive) {
      syncFrogColumnFromWorld();

      const currentY =
        worldToScreenY(
          frog.row,
        );

      ctx.save();

      ctx.strokeStyle =
        "rgba(255,255,255,0.18)";

      ctx.lineWidth = 2;

      ctx.strokeRect(
        frog.col * cw + 2,
        currentY -
          rh / 2 +
          2,
        cw - 4,
        rh - 4,
      );

      ctx.restore();
    }

    /*
     * Destination cell.
     */
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

      const targetY =
        worldToScreenY(
          frog.targetY,
        );

      ctx.save();

      ctx.strokeStyle =
        "rgba(250,204,21,0.7)";

      ctx.lineWidth = 2;

      ctx.setLineDash([
        5,
        5,
      ]);

      ctx.strokeRect(
        targetCol * cw + 4,
        targetY -
          rh / 2 +
          4,
        cw - 8,
        rh - 8,
      );

      ctx.setLineDash([]);

      ctx.restore();
    }

    const firstRow =
      Math.floor(
        cameraRow,
      ) - 2;

    const lastRow =
      Math.ceil(
        cameraRow +
          VISIBLE_ROWS,
      ) + 2;

    /*
     * Draw roads/water objects.
     */
    for (
      let row =
        firstRow;
      row <=
      lastRow;
      row++
    ) {
      const lane =
        lanes.get(
          row,
        );

      if (!lane) {
        continue;
      }

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
      deathTimer >
      0
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

    /*
     * Particles.
     */
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

    /*
     * HUD.
     */
    ctx.save();

    ctx.fillStyle =
      "rgba(0,0,0,0.4)";

    roundRect(
      ctx,
      8,
      8,
      Math.min(
        235,
        width - 16,
      ),
      76,
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
      `DISTANCE ${furthestRow}`,
      16,
      47,
    );

    ctx.fillText(
      `AREA ${areaNumber(
        furthestRow,
      )}`,
      16,
      67,
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

    const effects:
      string[] = [];

    if (
      shieldTimer >
      0
    ) {
      effects.push(
        "SHIELD",
      );
    }

    if (
      slowTimer >
      0
    ) {
      effects.push(
        "SLOW",
      );
    }

    if (
      superHopTimer >
      0
    ) {
      effects.push(
        "2-HOP",
      );
    }

    if (
      scoreBoostTimer >
      0
    ) {
      effects.push(
        "2X",
      );
    }

    if (
      effects.length >
      0
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

    /*
     * Area label.
     */
    ctx.save();

    ctx.textAlign =
      "center";

    ctx.fillStyle =
      "rgba(255,255,255,0.75)";

    ctx.font =
      "600 10px system-ui";

    ctx.fillText(
      areaName(
        areaForRow(
          frog.row,
        ),
      ),
      width / 2,
      height - 28,
    );

    ctx.restore();

    /*
     * Special event.
     */
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

    /*
     * Floating text.
     */
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

    /*
     * Game over.
     */
    if (!alive) {
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
          55,
      );

      ctx.fillStyle =
        "#ffffff";

      ctx.font =
        "14px system-ui";

      ctx.fillText(
        `Score ${score}`,
        width / 2,
        height / 2 -
          20,
      );

      ctx.fillText(
        `Distance ${furthestRow}`,
        width / 2,
        height / 2 +
          4,
      );

      ctx.fillText(
        `Area ${areaNumber(
          furthestRow,
        )}`,
        width / 2,
        height / 2 +
          28,
      );

      ctx.fillText(
        `Best flow x${bestCombo}`,
        width / 2,
        height / 2 +
          52,
      );

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "12px system-ui";

      ctx.fillText(
        "Press SPACE or R to restart",
        width / 2,
        height / 2 +
          84,
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

  /*
   * ---------------------------------------------------------
   * RESET
   * ---------------------------------------------------------
   */

  function resetRun() {
    score = 0;
    lives = 3;

    furthestRow = 0;

    combo = 0;
    comboTimer = 0;
    bestCombo = 0;

    alive = true;
    busy = false;

    deathTimer = 0;

    screenShake = 0;
    flash = 0;

    shieldTimer = 0;
    slowTimer = 0;
    superHopTimer = 0;
    scoreBoostTimer = 0;

    fly = null;
    powerUp = null;

    flyTimer = 320;
    powerTimer = 520;

    specialEvent = "";
    specialEventTimer = 0;

    particles = [];
    floatingTexts = [];

    worldRows =
      new Map();

    lanes =
      new Map();

    lastGeneratedType =
      null;

    consecutiveDangerRows =
      0;

    cameraRow = 0;
    cameraTargetRow = 0;

    frog = {
      col: 6,
      row: 0,

      x: cw * 6.5,
      y: 0,

      targetX: cw * 6.5,
      targetY: 0,

      startX: cw * 6.5,
      startY: 0,

      hopFrame: HOP_FRAMES,
      hopping: false,

      facing: -1,
      squash: 0,

      riding: null,
    };

    /*
     * Initial world.
     */
    for (
      let row = 0;
      row <=
      WORLD_AHEAD;
      row++
    ) {
      generateRow(
        row,
      );
    }

    updateAreaStatus();

    onScore(0);

    onStatus?.(
      "Use the arrow keys to cross",
    );
  }

  function reset() {
    resetRun();
  }

  /*
   * ---------------------------------------------------------
   * INPUT
   * ---------------------------------------------------------
   */

  const onKey = (
    event: KeyboardEvent,
  ) => {
    const key =
      event.key.toLowerCase();

    /*
     * In this infinite version:
     *
     * UP = forward
     * DOWN = backward
     */
    if (
      key === "arrowup" ||
      key === "w"
    ) {
      requestMove(
        0,
        1,
      );

      event.preventDefault();
      return;
    }

    if (
      key ===
        "arrowdown" ||
      key === "s"
    ) {
      requestMove(
        0,
        -1,
      );

      event.preventDefault();
      return;
    }

    if (
      key ===
        "arrowleft" ||
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
      key ===
        "arrowright" ||
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
