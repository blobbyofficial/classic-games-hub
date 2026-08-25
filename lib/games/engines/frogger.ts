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

  /*
   * Traffic/platform generation data.
   */
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

  /*
   * The visible board is no longer the world.
   *
   * The world itself is effectively infinite and rows are
   * generated as the frog progresses.
   */
  const rh = height / 13;
  const cw = width / COLS;

  const frogSize =
    Math.min(cw, rh) * 0.62;

  const frogRadius =
    frogSize * 0.42;

  const HOP_FRAMES = 8;

  const CAMERA_LEAD_ROWS = 5.8;
  const WORLD_BUFFER = 36;
  const WORLD_RETENTION = 14;

  const AREA_LENGTH = 22;

  const PACE = tune(difficulty, {
    easy: 0.78,
    regular: 1,
    hard: 1.25,
  });

  let particles: Particle[] = [];
  let floatingTexts: FloatingText[] = [];

  /*
   * World rows.
   *
   * Only a small section around the frog is kept active,
   * but new rows are generated forever.
   */
  let worldRows = new Map<number, WorldRow>();
  let lanes = new Map<number, Lane>();

  /*
   * Camera is expressed in world-row coordinates.
   */
  let cameraRow = 0;
  let cameraTargetRow = 0;

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

  /*
   * Used to stop the map from becoming visually repetitive.
   */
  let lastGeneratedType:
    | "road"
    | "river"
    | "safe"
    | null = null;

  let consecutiveDangerRows = 0;

  function rowY(row: number) {
    return (
      (row - cameraRow) *
        rh +
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
      Math.min(
        max,
        value,
      ),
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

    /*
     * Areas deliberately have different identities rather
     * than simply becoming progressively faster.
     */
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
          safe2: "#15803d",
          road: "#263238",
          river: "#155e75",
          goal: "#15803d",
        };

      case "suburb":
        return {
          safe: "#3f6212",
          safe2: "#4d7c0f",
          road: "#374151",
          river: "#155e75",
          goal: "#3f6212",
        };

      case "wetland":
        return {
          safe: "#14532d",
          safe2: "#166534",
          road: "#29333a",
          river: "#075985",
          goal: "#14532d",
        };

      case "city":
        return {
          safe: "#365314",
          safe2: "#4d7c0f",
          road: "#18181b",
          river: "#164e63",
          goal: "#365314",
        };

      case "night":
        return {
          safe: "#052e16",
          safe2: "#14532d",
          road: "#111827",
          river: "#0c4a6e",
          goal: "#14532d",
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
   * WORLD GENERATION
   * ---------------------------------------------------------
   */

  function chooseRowType(
    row: number,
  ):
    | "road"
    | "river"
    | "safe" {
    /*
     * Every area gets its own traffic/water character.
     */
    const theme =
      areaForRow(row);

    /*
     * Area transition rows are deliberately safer.
     */
    if (
      row % AREA_LENGTH ===
        0 ||
      row % AREA_LENGTH ===
        1
    ) {
      return "safe";
    }

    /*
     * Prevent long stretches of dangerous rows.
     */
    if (
      consecutiveDangerRows >=
      5
    ) {
      consecutiveDangerRows = 0;
      return "safe";
    }

    const roll =
      Math.random();

    let type:
      | "road"
      | "river"
      | "safe";

    switch (theme) {
      case "meadow":
        type =
          roll < 0.52
            ? "road"
            : roll < 0.77
              ? "river"
              : "safe";
        break;

      case "suburb":
        type =
          roll < 0.64
            ? "road"
            : roll < 0.80
              ? "safe"
              : "river";
        break;

      case "wetland":
        type =
          roll < 0.34
            ? "road"
            : roll < 0.76
              ? "river"
              : "safe";
        break;

      case "city":
        type =
          roll < 0.72
            ? "road"
            : roll < 0.84
              ? "safe"
              : "river";
        break;

      case "night":
        type =
          roll < 0.55
            ? "road"
            : roll < 0.80
              ? "river"
              : "safe";
        break;
    }

    /*
     * Don't generate a single isolated safe strip in a way
     * that makes the terrain look artificial.
     */
    if (
      lastGeneratedType ===
        "safe" &&
      type === "safe" &&
      Math.random() <
        0.7
    ) {
      type =
        Math.random() <
        0.6
          ? "road"
          : "river";
    }

    if (
      type === "safe"
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
  ) {
    const areaIndex =
      Math.floor(
        row /
          AREA_LENGTH,
      );

    const direction =
      Math.random() <
      0.5
        ? -1
        : 1;

    /*
     * Speed variation gets wider later, but never causes
     * ridiculous speeds.
     */
    const baseSpeeds =
      theme === "city"
        ? [
            1.55,
            1.9,
            2.25,
            2.65,
          ]
        : theme === "night"
          ? [
              1.45,
              1.8,
              2.15,
              2.5,
            ]
          : [
              1.2,
              1.55,
              1.9,
              2.25,
            ];

    const baseSpeed =
      randomItem(
        baseSpeeds,
      ) *
      PACE *
      (1 +
        Math.min(
          0.25,
          areaIndex *
            0.015,
        )) *
      direction;

    /*
     * IMPORTANT:
     *
     * The number of vehicles is explicitly bounded.
     * We never add vehicles during gameplay.
     */
    const vehicleCount =
      randomInt(
        2,
        theme === "city"
          ? 4
          : 3,
      );

    const kinds =
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

    const objects:
      LaneObject[] = [];

    /*
     * Random lane density.
     */
    const density =
      randomRange(
        0.82,
        1.18,
      );

    /*
     * Large random initial gaps.
     *
     * Vehicles are generated as a queue beyond the screen,
     * not in arbitrary visible positions.
     */
    const startingGap =
      randomRange(
        55,
        150,
      );

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
        randomItem(kinds) as VehicleKind;

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
          0.92,
          1.08,
        );

      const gap =
        Math.max(
          46,
          cw *
            randomRange(
              0.65,
              1.4,
            ) *
            density,
        );

      if (
        direction > 0
      ) {
        cursor -=
          i === 0
            ? randomRange(
                0,
                80,
              )
            : vehicleWidth +
              gap +
              randomRange(
                0,
                startingGap,
              );

        objects.push({
          x: cursor,
          speed:
            baseSpeed *
            randomRange(
              0.82,
              1.18,
            ),
          width:
            vehicleWidth,
          kind,
          color:
            getVehicleColor(
              kind,
            ),
          laneRow: row,
          minGap: gap,
          variant:
            randomInt(
              0,
              2,
            ),
          rotation:
            0,
          passed: false,
        });
      } else {
        cursor +=
          i === 0
            ? randomRange(
                0,
                80,
              )
            : vehicleWidth +
              gap +
              randomRange(
                0,
                startingGap,
              );

        objects.push({
          x:
            cursor -
            vehicleWidth,
          speed:
            baseSpeed *
            randomRange(
              0.82,
              1.18,
            ),
          width:
            vehicleWidth,
          kind,
          color:
            getVehicleColor(
              kind,
            ),
          laneRow: row,
          minGap: gap,
          variant:
            randomInt(
              0,
              2,
            ),
          rotation:
            0,
          passed: false,
        });
      }
    }

    return {
      row,
      type: "road",
      speed: baseSpeed,
      objects,
      density,
    };
  }

  function createRiverLane(
    row: number,
    theme: AreaTheme,
  ) {
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
     * A river lane uses ONLY ONE platform type.
     *
     * This is intentional: the previous mixed layouts could
     * cause visually overlapping logs/lily pads.
     */
    const kind: WaterKind =
      Math.random() <
      0.6
        ? "log"
        : Math.random() <
            0.5
          ? "smallLog"
          : "lily";

    const count =
      kind === "log"
        ? randomInt(2, 4)
        : randomInt(3, 5);

    const objects:
      LaneObject[] = [];

    const multiplier =
      kind === "log"
        ? 1.8
        : kind === "smallLog"
          ? 0.95
          : 1.25;

    /*
     * The platform track is generated with a guaranteed
     * minimum gap. This prevents horizontal overlap.
     */
    const minimumGap =
      Math.max(
        cw * 0.75,
        45,
      );

    let cursor =
      direction > 0
        ? -80
        : width + 80;

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
          1.1,
        );

      const gap =
        Math.max(
          minimumGap,
          randomRange(
            cw * 0.6,
            cw * 1.6,
          ),
        );

      if (
        direction > 0
      ) {
        cursor +=
          i === 0
            ? randomRange(
                -50,
                50,
              )
            : gap;

        const object =
          {
            x:
              cursor,
            speed:
              baseSpeed *
              randomRange(
                0.9,
                1.1,
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
            minGap: gap,
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
          };

        objects.push(
          object,
        );

        cursor +=
          objectWidth;
      } else {
        cursor -=
          i === 0
            ? randomRange(
                0,
                50,
              )
            : gap;

        const object =
          {
            x:
              cursor -
              objectWidth,
            speed:
              baseSpeed *
              randomRange(
                0.9,
                1.1,
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
            minGap: gap,
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
          };

        objects.push(
          object,
        );

        cursor -=
          objectWidth;
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
      worldRows.has(row)
    ) {
      return;
    }

    const theme =
      areaForRow(row);

    /*
     * First row is always safe.
     */
    const type =
      row === 0
        ? "safe"
        : chooseRowType(row);

    const worldRow: WorldRow =
      {
        row,
        type,
        theme,
        variation:
          randomInt(
            0,
            4,
          ),
      };

    worldRows.set(
      row,
      worldRow,
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
        Math.floor(
          frog.row -
            4,
        ),
      );

    const end =
      Math.floor(
        frog.row +
          WORLD_BUFFER,
      );

    for (
      let row = start;
      row <= end;
      row++
    ) {
      generateRow(row);
    }

    /*
     * Remove ancient terrain behind the player.
     *
     * This is what makes the world effectively infinite
     * without allowing memory usage to grow forever.
     */
    const pruneBefore =
      Math.floor(
        frog.row -
          WORLD_RETENTION,
      );

    for (
      const row of worldRows.keys()
    ) {
      if (
        row < pruneBefore
      ) {
        worldRows.delete(row);
        lanes.delete(row);
      }
    }
  }

  function resetFrog() {
    frog = {
      col: 6,
      row: Math.max(
        0,
        furthestRow,
      ),

      x: cw * 6.5,
      y: Math.max(
        0,
        furthestRow,
      ),

      targetX: cw * 6.5,
      targetY: Math.max(
        0,
        furthestRow,
      ),

      startX: cw * 6.5,
      startY: Math.max(
        0,
        furthestRow,
      ),

      hopFrame: HOP_FRAMES,
      hopping: false,

      facing: -1,
      squash: 0,

      riding: null,
    };

    queuedMove = null;

    cameraTargetRow =
      Math.max(
        0,
        frog.row -
          CAMERA_LEAD_ROWS,
      );

    cameraRow =
      cameraTargetRow;
  }

  /*
   * ---------------------------------------------------------
   * MOVEMENT
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

  function requestMove(
    dc: number,
    dr: number,
  ) {
    if (!alive) {
      return;
    }

    if (
      deathTimer > 0 ||
      busy
    ) {
      return;
    }

    if (frog.hopping) {
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

    syncFrogColumnFromWorld();

    /*
     * The frog's world row is authoritative.
     */
    const nextCol =
      clamp(
        frog.col +
          dc *
            distance,
        0,
        COLS - 1,
      );

    const nextRow =
      clamp(
        Math.round(
          frog.row +
            dr *
              distance,
        ),
        0,
        Number.MAX_SAFE_INTEGER,
      );

    if (
      nextCol ===
        frog.col &&
      nextRow ===
        frog.row
    ) {
      return;
    }

    /*
     * Generate the destination immediately.
     */
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

    if (dc !== 0) {
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

  function worldToScreenY(
    worldY: number,
  ) {
    return (
      (worldY -
        cameraRow) *
        rh +
      rh / 2
    );
  }

  function updateCamera() {
    cameraTargetRow =
      Math.max(
        0,
        frog.row -
          CAMERA_LEAD_ROWS,
      );

    /*
     * Gentle follow rather than a rigid snap.
     */
    cameraRow +=
      (cameraTargetRow -
        cameraRow) *
      0.12;

    if (
      Math.abs(
        cameraTargetRow -
          cameraRow,
      ) <
      0.01
    ) {
      cameraRow =
        cameraTargetRow;
    }
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
      progress <
      0.5
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
      (frog.targetX -
        frog.startX) *
        eased;

    frog.y =
      frog.startY +
      (frog.targetY -
        frog.startY) *
        eased;

    frog.squash =
      Math.sin(
        progress *
          Math.PI,
      );

    /*
     * Begin generating the world before the frog gets there.
     */
    ensureWorldAhead();

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

      frog.hopping =
        false;

      frog.squash =
        1;

      onLanding();

      if (
        queuedMove &&
        alive &&
        deathTimer <=
          0
      ) {
        const move =
          queuedMove;

        queuedMove =
          null;

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
          frog.y,
        ) -
          rh * 0.55,
      );

      updateAreaStatus();
    }

    collectIfNearby();

    const current =
      worldRows.get(
        frog.row,
      );

    if (
      !current
    ) {
      return;
    }

    if (
      current.type ===
      "road"
    ) {
      checkRoadCollision();
    } else if (
      current.type ===
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

    if (
      frog.row % AREA_LENGTH <
      2
    ) {
      onStatus?.(
        `Area ${areaNumber(
          frog.row,
        )}: ${areaName(theme)}`,
      );

      weather =
        theme === "night"
          ? "night"
          : frog.row %
                AREA_LENGTH >
              14
            ? "evening"
            : "day";
    }
  }

  function currentLane() {
    return lanes.get(
      frog.row,
    );
  }

  function isOnObject(
    object: LaneObject,
  ) {
    const margin =
      frogRadius *
      0.85;

    return (
      frog.x + margin >
        object.x &&
      frog.x - margin <
        object.x +
          object.width
    );
  }

  /*
   * ---------------------------------------------------------
   * ROAD COLLISION
   * ---------------------------------------------------------
   */

  function checkRoadCollision() {
    const lane =
      currentLane();

    if (
      !lane ||
      lane.type !==
        "road"
    ) {
      return;
    }

    const screenY =
      worldToScreenY(
        frog.y,
      );

    const top =
      screenY -
      frogRadius;

    const bottom =
      screenY +
      frogRadius;

    for (
      const object of lane.objects
    ) {
      const objectCenter =
        worldToScreenY(
          object.laneRow,
        );

      const objectTop =
        objectCenter -
        rh * 0.28;

      const objectBottom =
        objectCenter +
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
        shieldTimer =
          0;

        burst(
          frog.x,
          screenY,
          "#7dd3fc",
          18,
        );

        addFloatingText(
          frog.x,
          screenY -
            rh * 0.55,
          "SHIELD!",
          true,
        );

        /*
         * Push the vehicle away rather than teleporting it.
         */
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

  /*
   * ---------------------------------------------------------
   * RIVER COLLISION
   * ---------------------------------------------------------
   */

  function checkRiverSupport() {
    const lane =
      currentLane();

    if (
      !lane ||
      lane.type !==
        "river"
    ) {
      return;
    }

    const support =
      lane.objects.find(
        (
          object,
        ) =>
          isOnObject(
            object,
          ),
      );

    if (
      support ===
      undefined
    ) {
      if (
        shieldTimer >
        0
      ) {
        shieldTimer =
          0;

        const screenY =
          worldToScreenY(
            frog.y,
          );

        burst(
          frog.x,
          screenY,
          "#7dd3fc",
          20,
        );

        addFloatingText(
          frog.x,
          screenY -
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
      frog.riding ===
        null
    ) {
      return;
    }

    const object =
      frog.riding;

    const lane =
      currentLane();

    if (
      !lane ||
      lane.type !==
        "river" ||
      !lane.objects.includes(
        object,
      )
    ) {
      frog.riding =
        null;

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
      frog.riding =
        null;

      checkRiverSupport();
    }
  }

  /*
   * ---------------------------------------------------------
   * TRAFFIC / PLATFORM UPDATE
   * ---------------------------------------------------------
   */

  function respawnVehicle(
    lane: Lane,
    object: LaneObject,
  ) {
    const gap =
      Math.max(
        object.minGap,
        randomRange(
          cw * 0.65,
          cw * 1.5,
        ),
      );

    /*
     * Find the vehicle that is currently furthest behind
     * the incoming edge.
     *
     * Crucially, the new X coordinate is always outside
     * the screen.
     */
    if (
      object.speed > 0
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
       * ALWAYS outside the left edge first.
       *
       * We then check whether the nearest vehicle requires
       * an even larger gap.
       */
      let spawnX =
        -object.width -
        randomRange(
          30,
          110,
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
            45,
          );
      }

      /*
       * Never allow the recycling logic to accidentally place
       * a car inside the visible road.
       */
      spawnX =
        Math.min(
          spawnX,
          -object.width -
            8,
        );

      object.x =
        spawnX;
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
          110,
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
            45,
          );
      }

      /*
       * Never allow the recycling logic to accidentally place
       * a car inside the visible road.
       */
      spawnX =
        Math.max(
          spawnX,
          width + 8,
        );

      object.x =
        spawnX -
        object.width;
    }

    /*
     * Small random changes prevent repeated patterns.
     */
    object.speed *=
      randomRange(
        0.94,
        1.06,
      );

    object.minGap =
      randomRange(
        cw * 0.65,
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
    const activeMin =
      Math.floor(
        frog.row -
          WORLD_RETENTION,
      );

    const activeMax =
      Math.floor(
        frog.row +
          WORLD_BUFFER,
      );

    for (
      const lane of lanes.values()
    ) {
      if (
        lane.row <
          activeMin ||
        lane.row >
          activeMax
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
        multiplier *= 1.18;
      }

      if (
        specialEvent ===
          "FLOOD" &&
        lane.type ===
          "river"
      ) {
        multiplier *= 1.25;
      }

      /*
       * Prevent any accidental creation of additional
       * vehicles/platforms.
       */
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
          /*
           * A road vehicle is considered gone only after
           * its entire body is outside the screen.
           */
          if (
            object.speed > 0 &&
            object.x >
              width +
                object.width +
                20
          ) {
            respawnVehicle(
              lane,
              object,
            );
          } else if (
            object.speed < 0 &&
            object.x <
              -object.width -
                20
          ) {
            respawnVehicle(
              lane,
              object,
            );
          }
        } else {
          /*
           * River platforms.
           *
           * Unlike the old version, there is no possibility
           * of turning a river platform into a random object
           * in another lane.
           */
          if (
            object.speed > 0 &&
            object.x >
              width + 60
          ) {
            object.x =
              -object.width -
              randomRange(
                30,
                100,
              );
          } else if (
            object.speed < 0 &&
            object.x <
              -object.width -
                60
          ) {
            object.x =
              width +
              randomRange(
                30,
                100,
              );
          }
        }
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * DEATH / SCORING
   * ---------------------------------------------------------
   */

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
      const screenY =
        worldToScreenY(
          frog.y,
        );

      addFloatingText(
        frog.x,
        screenY -
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

    score +=
      value;

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

    deathTimer =
      34;

    queuedMove =
      null;

    frog.riding =
      null;

    resetCombo();

    screenShake =
      8;

    flash = 5;

    const screenY =
      worldToScreenY(
        frog.y,
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
        areaNumber(
          furthestRow,
        ),
      );

      return;
    }

    /*
     * Respawn at the furthest safe row reached.
     */
    const respawnRow =
      Math.max(
        0,
        Math.min(
          furthestRow,
          frog.row,
        ),
      );

    generateRow(
      respawnRow,
    );

    frog = {
      col: 6,
      row: respawnRow,

      x: cw * 6.5,
      y: respawnRow,

      targetX: cw * 6.5,
      targetY: respawnRow,

      startX: cw * 6.5,
      startY: respawnRow,

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
        lives === 1
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
    const minRow =
      Math.max(
        1,
        Math.floor(
          frog.row,
        ),
      );

    const maxRow =
      Math.floor(
        frog.row +
          12,
      );

    let row =
      randomInt(
        minRow,
        maxRow,
      );

    /*
     * Avoid putting collectibles in impossible
     * deep-water locations too often.
     */
    const terrain =
      worldRows.get(
        row,
      );

    if (
      terrain?.type ===
      "safe"
    ) {
      row =
        clamp(
          row + 1,
          1,
          maxRow,
        );
      generateRow(
        row,
      );
    }

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
        Math.floor(
          frog.row +
            10,
        ),
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
          frog.row -
            6
      ) {
        fly =
          null;
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
          frog.row -
            6
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
    const frogScreenY =
      worldToScreenY(
        frog.y,
      );

    if (
      fly &&
      Math.hypot(
        fly.x -
          frog.x,
        worldToScreenY(
          fly.row,
        ) -
          frogScreenY,
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
          frogScreenY,
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
    switch (
      pickup.type
    ) {
      case "shield":
        shieldTimer =
          720;

        addFloatingText(
          pickup.x,
          worldToScreenY(
            pickup.row,
          ),
          "SHIELD",
          true,
        );

        break;

      case "slow":
        slowTimer =
          420;

        addFloatingText(
          pickup.x,
          worldToScreenY(
            pickup.row,
          ),
          "SLOW TIME",
          true,
        );

        break;

      case "superHop":
        superHopTimer =
          360;

        addFloatingText(
          pickup.x,
          worldToScreenY(
            pickup.row,
          ),
          "SUPER HOP",
          true,
        );

        break;

      case "score":
        scoreBoostTimer =
          360;

        addFloatingText(
          pickup.x,
          worldToScreenY(
            pickup.row,
          ),
          "2X SCORE",
          true,
        );

        break;
    }

    burst(
      pickup.x,
      worldToScreenY(
        pickup.row,
      ),
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
   * EFFECTS
   * ---------------------------------------------------------
   */

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

  /*
   * ---------------------------------------------------------
   * SPECIAL EVENTS
   * ---------------------------------------------------------
   */

  function getSpecialEvent() {
    /*
     * Events become less common so the infinite world doesn't
     * feel like it is constantly throwing modifiers at the
     * player.
     */
    if (
      frog.row < 20 ||
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

    /*
     * Generate considerably farther ahead of the player
     * than the camera can see.
     */
    ensureWorldAhead();

    if (
      frog.hopping
    ) {
      updateHop();
    } else {
      updateRiding();

      collectIfNearby();

      const current =
        worldRows.get(
          frog.row,
        );

      if (
        current?.type ===
        "road"
      ) {
        checkRoadCollision();
      }

      if (
        current?.type ===
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
     * Occasionally introduce an event.
     */
    if (
      !specialEvent &&
      frog.row >
        25 &&
      frog.row %
          40 ===
        0
    ) {
      specialEvent =
        getSpecialEvent();

      specialEventTimer =
        specialEvent
          ? 600
          : 0;
    }
  }

  /*
   * ---------------------------------------------------------
   * BACKGROUND
   * ---------------------------------------------------------
   */

  function drawGrid() {
    /*
     * Crossy Road-style terrain doesn't have to expose a
     * perfectly uniform grid. Very subtle row divisions are
     * enough to communicate the tiles.
     */
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
          height / rh,
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
        );

      ctx.beginPath();

      ctx.moveTo(
        0,
        y -
          rh / 2,
      );

      ctx.lineTo(
        width,
        y -
          rh / 2,
      );

      ctx.stroke();
    }

    for (
      let col = 0;
      col <= COLS;
      col++
    ) {
      ctx.beginPath();

      ctx.moveTo(
        col * cw,
        0,
      );

      ctx.lineTo(
        col * cw,
        height,
      );

      ctx.stroke();
    }

    ctx.restore();
  }

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

      /*
       * Random subtle road surface variation.
       */
      ctx.fillStyle =
        "rgba(255,255,255,0.025)";

      if (
        rowData.variation %
          2 ===
        0
      ) {
        for (
          let x = 0;
          x < width;
          x += 70
        ) {
          ctx.fillRect(
            x +
              rowData.variation *
                9,
            y +
              rh *
                0.25,
            28,
            2,
          );
        }
      }

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

      ctx.setLineDash(
        [],
      );

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

      /*
       * Water currents are varied by row so adjacent water
       * lanes don't look synchronized.
       */
      ctx.strokeStyle =
        "rgba(125,211,252,0.12)";

      ctx.lineWidth = 1;

      const drift =
        rowData.row % 2 ===
        0
          ? 1
          : -1;

      for (
        let x =
          -80;
        x <
        width + 100;
        x +=
          100
      ) {
        const offset =
          ((x +
            rowData.row *
              31 +
            drift *
              Date.now() *
              0.00003) %
            (width + 180)) -
          80;

        ctx.beginPath();

        ctx.moveTo(
          offset,
          y +
            rh *
              0.3,
        );

        ctx.lineTo(
          offset +
            40,
          y +
            rh *
              0.3,
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
          offset +
            25,
          y +
            rh *
              0.72,
        );

        ctx.lineTo(
          offset +
            75,
          y +
            rh *
              0.72,
        );

        ctx.stroke();
      }

      return;
    }

    /*
     * Safe grass.
     */
    ctx.fillStyle =
      colors.safe;

    ctx.fillRect(
      0,
      y,
      width,
      rh,
    );

    /*
     * Random grass details.
     */
    ctx.fillStyle =
      "rgba(255,255,255,0.035)";

    for (
      let i = 0;
      i < 5;
      i++
    ) {
      const x =
        ((i * 127 +
          rowData.row *
            43) %
          width);

      ctx.fillRect(
        x,
        y +
          rh *
            (0.2 +
              (i %
                3) *
                0.22),
        3,
        3,
      );
    }
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

    const firstRow =
      Math.floor(
        cameraRow,
      ) - 2;

    const lastRow =
      Math.ceil(
        cameraRow +
          height /
            rh,
      ) + 2;

    for (
      let row =
        firstRow;
      row <=
      lastRow;
      row++
    ) {
      const data =
        worldRows.get(
          row,
        );

      if (
        data
      ) {
        drawRowBackground(
          data,
        );
      } else {
        /*
         * Fallback while the next chunk is being generated.
         */
        ctx.fillStyle =
          "#166534";

        ctx.fillRect(
          0,
          worldToScreenY(
            row,
          ) -
            rh / 2,
          width,
          rh,
        );
      }
    }
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

    /*
     * Small variant differences stop every car from looking
     * identical.
     */
    const bob =
      object.variant ===
      1
        ? Math.sin(
            object.x *
              0.02,
          ) *
          0.4
        : 0;

    ctx.translate(
      0,
      bob,
    );

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
    } else {
      ctx.fillStyle =
        "rgba(147,197,253,0.42)";

      roundRect(
        ctx,
        object.x +
          object.width *
            0.56,
        y +
          h * 0.15,
        object.width *
            0.22,
        h * 0.25,
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

    /*
     * Front lights.
     */
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

    ctx.strokeStyle =
      "rgba(217,164,107,0.28)";

    ctx.lineWidth = 1;

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const px =
        left +
        object.width *
          (0.25 +
            i *
              0.25);

      ctx.beginPath();

      ctx.moveTo(
        px,
        bodyY +
          h * 0.2,
      );

      ctx.lineTo(
        px +
          h * 0.08,
        bodyY +
          h * 0.72,
      );

      ctx.stroke();
    }

    /*
     * Cut ends.
     */
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

    /*
     * Growth rings.
     */
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

    /*
     * Knots.
     */
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
   * LILY PADS
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

    const rotation =
      object.rotation +
      object.variant *
        0.02;

    ctx.save();

    ctx.translate(
      centerX,
      centerY,
    );

    ctx.rotate(
      rotation,
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

      let localRadius =
        radius;

      localRadius *=
        0.96 +
        Math.sin(
          i * 2.3 +
            object.variant,
        ) *
          0.04;

      let px =
        Math.cos(angle) *
        localRadius;

      let py =
        Math.sin(angle) *
        localRadius;

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
          (0.24 -
            Math.abs(
              angleDifference,
            )) /
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

    const veinStart =
      -radius *
      0.05;

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
        veinStart *
          Math.cos(
            angle,
          ),
        veinStart *
          Math.sin(
            angle,
          ),
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
            (frog.hopFrame /
              HOP_FRAMES) *
              Math.PI,
          ) *
          rh *
          0.28
        : 0;

    const scale =
      frog.hopping
        ? 0.9
        : 1;

    ctx.save();

    ctx.globalAlpha =
      alpha;

    const screenY =
      worldToScreenY(
        frog.y,
      );

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

  /*
   * ---------------------------------------------------------
   * COLLECTIBLES DRAWING
   * ---------------------------------------------------------
   */

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
   * PARTICLES
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
      life: big
        ? 40
        : 28,
      maxLife: big
        ? 40
        : 28,
      big,
    });
  }

  /*
   * ---------------------------------------------------------
   * HUD / RENDER
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
     * Current cell.
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
     * Destination cell while hopping.
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

      ctx.setLineDash(
        [],
      );

      ctx.restore();
    }

    /*
     * Objects.
     */
    const firstRow =
      Math.floor(
        cameraRow,
      ) - 2;

    const lastRow =
      Math.ceil(
        cameraRow +
          height /
            rh,
      ) + 2;

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

    /*
     * Current area name.
     */
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

    const effects:
      string[] = [];

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
      scoreBoostTimer >
      0
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
          52,
      );

      ctx.fillStyle =
        "#ffffff";

      ctx.font =
        "14px system-ui";

      ctx.fillText(
        `Score ${score}`,
        width / 2,
        height / 2 -
          18,
      );

      ctx.fillText(
        `Distance ${furthestRow}`,
        width / 2,
        height / 2 +
          6,
      );

      ctx.fillText(
        `Area ${areaNumber(
          furthestRow,
        )}: ${areaName(
          areaForRow(
            furthestRow,
          ),
        )}`,
        width / 2,
        height / 2 +
          30,
      );

      ctx.fillText(
        `Best flow x${bestCombo}`,
        width / 2,
        height / 2 +
          54,
      );

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "12px system-ui";

      ctx.fillText(
        "Press SPACE or R to restart",
        width / 2,
        height / 2 +
          86,
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

    weather = "day";

    worldRows =
      new Map();

    lanes =
      new Map();

    lastGeneratedType =
      null;

    consecutiveDangerRows =
      0;

    /*
     * Generate a large initial buffer so there is never an
     * empty area while the camera begins moving.
     */
    for (
      let row = 0;
      row <=
      WORLD_BUFFER;
      row++
    ) {
      generateRow(
        row,
      );
    }

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

    cameraRow = 0;
    cameraTargetRow = 0;

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
   * KEYBOARD
   * ---------------------------------------------------------
   */

  const onKey = (
    event: KeyboardEvent,
  ) => {
    const key =
      event.key.toLowerCase();

    if (
      key ===
        "arrowup" ||
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
