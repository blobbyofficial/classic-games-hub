import type { GameEngineFactory } from "@/types";
import { beep, createLoop, palette } from "../helpers";

type BubbleKind =
  | "normal"
  | "rainbow"
  | "bomb"
  | "lightning"
  | "stone";

interface Cell {
  color: number;
  kind: BubbleKind;
}

interface FlyingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  kind: BubbleKind;
  banked: boolean;
}

interface PopParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  life: number;
  maxLife: number;
  size: number;
}

interface DropParticle {
  x: number;
  y: number;
  vy: number;
  color: number;
  kind: BubbleKind;
  life: number;
  rot: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  big?: boolean;
}

interface Upgrade {
  id:
    | "combo"
    | "lucky"
    | "drop"
    | "preview"
    | "special";
  name: string;
  description: string;
}

const bubble: GameEngineFactory = ({
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
    "#60a5fa",
    "#4ade80",
    "#fbbf24",
    "#c084fc",
  ];

  const COLS = 10;
  const R = Math.max(
    14,
    width / COLS / 2,
  );

  const rowH = R * 1.72;
  const boardTop = 10;
  const shooterY =
    height - R - 16;

  const dangerOffset =
    Math.max(
      120,
      R * 3.5,
    );

  const dangerY =
    height - dangerOffset;

  const SPEED = 11.5;

  let grid: Cell[][] = [];

  let shooter: {
    color: number;
    kind: BubbleKind;
  } = {
    color: 0,
    kind: "normal",
  };

  let nextShot: {
    color: number;
    kind: BubbleKind;
  } = {
    color: 1,
    kind: "normal",
  };

  let flying: FlyingBubble | null =
    null;

  let pops: PopParticle[] = [];
  let drops: DropParticle[] = [];
  let floatingTexts: FloatingText[] =
    [];

  let score = 0;
  let bestScore = 0;
  let shots = 0;
  let misses = 0;

  let level = 1;
  let stage = 1;

  let alive = true;
  let aim = -Math.PI / 2;
  let bob = 0;

  let combo = 0;
  let comboTimer = 0;
  let maxCombo = 0;

  let chainReaction = false;
  let chainTimer = 0;

  let levelClearTimer = 0;

  let previewUpgrade = 0;
  let comboUpgrade = 0;
  let luckyUpgrade = 0;
  let dropUpgrade = 0;
  let specialUpgrade = 0;

  let upgradeSelection = false;
  let upgradeChoices: Upgrade[] = [];

  let boardPattern =
    "classic";

  const MAX_ROWS = 16;

  function randInt(max: number) {
    return Math.floor(
      Math.random() * max,
    );
  }

  function randomColor() {
    return randInt(
      getColorCount(),
    );
  }

  function getColorCount() {
    if (level <= 2) return 3;
    if (level <= 5) return 4;
    return 5;
  }

  function randomKind(
    forcedNormal = false,
  ): BubbleKind {
    if (forcedNormal) {
      return "normal";
    }

    const roll =
      Math.random();

    const bonus =
      specialUpgrade *
      0.01;

    if (
      roll <
      0.025 + bonus
    ) {
      return "rainbow";
    }

    if (
      roll <
      0.05 + bonus
    ) {
      return "bomb";
    }

    if (
      roll <
      0.072 + bonus
    ) {
      return "lightning";
    }

    if (
      level >= 4 &&
      roll <
        0.10 + bonus
    ) {
      return "stone";
    }

    return "normal";
  }

  function randomShot() {
    const normalChance =
      0.78 -
      specialUpgrade *
        0.02;

    let kind: BubbleKind =
      "normal";

    if (
      Math.random() >
      normalChance
    ) {
      kind = randomKind();
    }

    return {
      color: randomColor(),
      kind,
    };
  }

  function shade(
    hex: string,
    amount: number,
  ) {
    const component = (
      index: number,
    ) => {
      const value = Math.round(
        parseInt(
          hex.slice(index, index + 2),
          16,
        ) *
          (1 + amount),
      );

      return Math.max(
        0,
        Math.min(255, value),
      )
        .toString(16)
        .padStart(2, "0");
    };

    return `#${component(1)}${component(
      3,
    )}${component(5)}`;
  }

  function cellPos(
    r: number,
    c: number,
  ) {
    const offset =
      (r % 2) * R;

    return {
      x:
        offset +
        c * 2 * R +
        R,
      y:
        boardTop +
        r * rowH +
        R,
    };
  }

  function getRowLength(r: number) {
    return COLS - (r % 2);
  }

  function ensureRows(count: number) {
    while (
      grid.length < count
    ) {
      grid.push(
        new Array(
          getRowLength(grid.length),
        ).fill(null),
      );
    }
  }

  function randomPattern() {
    const patterns = [
      "classic",
      "classic",
      "checker",
      "diamond",
      "pyramid",
      "arch",
      "split",
      "islands",
    ];

    return patterns[
      randInt(patterns.length)
    ];
  }

  function shouldPlace(
    pattern: string,
    r: number,
    c: number,
    rows: number,
  ) {
    const center =
      (getRowLength(r) - 1) /
      2;

    switch (pattern) {
      case "checker":
        return (
          (r + c) % 2 ===
          0
        );

      case "diamond":
        return (
          Math.abs(c - center) +
            Math.abs(
              r -
                (rows -
                  1) /
                  2,
            ) <
          rows * 0.72
        );

      case "pyramid":
        return (
          Math.abs(
            c - center,
          ) <=
          r + 0.8
        );

      case "arch":
        return (
          r < 2 ||
          c === 0 ||
          c ===
            getRowLength(r) - 1 ||
          r === rows - 1
        );

      case "split":
        return (
          c <= 2 ||
          c >=
            getRowLength(r) - 3 ||
          r < 2
        );

      case "islands":
        return (
          (c <= 2 &&
            r % 2 ===
              0) ||
          (c >=
            getRowLength(r) - 3 &&
            r % 2 ===
              1) ||
          r === 0 ||
          r === 1
        );

      default:
        return true;
    }
  }

  function makeInitialGrid() {
    grid = [];

    const rows = Math.min(
      5 +
        Math.floor(
          level / 2,
        ),
      9,
    );

    boardPattern =
      randomPattern();

    for (
      let r = 0;
      r < rows;
      r++
    ) {
      const row: (
        | Cell
        | null
      )[] = [];

      for (
        let c = 0;
        c < getRowLength(r);
        c++
      ) {
        if (
          shouldPlace(
            boardPattern,
            r,
            c,
            rows,
          )
        ) {
          let color =
            randomColor();

          // Avoid making the opening board
          // completely chaotic.
          if (
            r < 2 &&
            c > 0 &&
            Math.random() < 0.55
          ) {
            const left =
              row[c - 1];

            if (left) {
              color =
                left.color;
            }
          }

          const kind =
            level >= 4 &&
            Math.random() < 0.035
              ? randomKind()
              : "normal";

          row.push({
            color,
            kind,
          });
        } else {
          row.push(null);
        }
      }

      grid.push(row);
    }

    // Make sure there is always something
    // playable near the top.
    if (
      grid.length > 0 &&
      grid[0].every(
        (cell) =>
          cell == null,
      )
    ) {
      for (
        let c = 0;
        c < getRowLength(0);
        c++
      ) {
        grid[0][c] = {
          color:
            randomColor(),
          kind: "normal",
        };
      }
    }
  }

  function reset() {
    alive = true;

    score = 0;
    shots = 0;
    misses = 0;

    level = 1;
    stage = 1;

    aim = -Math.PI / 2;
    bob = 0;

    combo = 0;
    comboTimer = 0;
    maxCombo = 0;

    chainReaction = false;
    chainTimer = 0;

    levelClearTimer = 0;

    previewUpgrade = 0;
    comboUpgrade = 0;
    luckyUpgrade = 0;
    dropUpgrade = 0;
    specialUpgrade = 0;

    upgradeSelection = false;
    upgradeChoices = [];

    flying = null;

    pops = [];
    drops = [];
    floatingTexts = [];

    boardPattern = "classic";

    makeInitialGrid();

    shooter = randomShot();
    nextShot = randomShot();

    onScore(0);
    onStatus?.(
      "Match 3+ to pop",
    );
  }

  function neighbors(
    r: number,
    c: number,
  ): [number, number][] {
    const even =
      r % 2 === 0;

    const deltas: [
      number,
      number,
    ][] = even
      ? [
          [0, -1],
          [0, 1],
          [-1, -1],
          [-1, 0],
          [1, -1],
          [1, 0],
        ]
      : [
          [0, -1],
          [0, 1],
          [-1, 0],
          [-1, 1],
          [1, 0],
          [1, 1],
        ];

    return deltas
      .map(
        ([dr, dc]) =>
          [
            r + dr,
            c + dc,
          ] as [
            number,
            number,
          ],
      )
      .filter(
        ([nr, nc]) =>
          nr >= 0 &&
          nr < grid.length &&
          nc >= 0 &&
          nc <
            getRowLength(nr),
      );
  }

  function findColorCluster(
    r: number,
    c: number,
    color: number,
  ) {
    const seen =
      new Set<string>();

    const stack: [
      number,
      number,
    ][] = [[r, c]];

    const out: [
      number,
      number,
    ][] = [];

    while (
      stack.length > 0
    ) {
      const current =
        stack.pop()!;

      const cr =
        current[0];
      const cc =
        current[1];

      const key = `${cr},${cc}`;

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      const cell =
        grid[cr]?.[cc];

      if (
        !cell ||
        cell.color !== color
      ) {
        continue;
      }

      out.push([
        cr,
        cc,
      ]);

      for (const n of neighbors(
        cr,
        cc,
      )) {
        stack.push(n);
      }
    }

    return out;
  }

  function findConnectedCells() {
    const connected =
      new Set<string>();

    const stack: [
      number,
      number,
    ][] = [];

    if (grid.length > 0) {
      for (
        let c = 0;
        c <
        getRowLength(0);
        c++
      ) {
        if (
          grid[0]?.[c]
        ) {
          stack.push([
            0,
            c,
          ]);
        }
      }
    }

    while (
      stack.length > 0
    ) {
      const [
        r,
        c,
      ] = stack.pop()!;

      const key = `${r},${c}`;

      if (
        connected.has(
          key,
        )
      ) {
        continue;
      }

      if (
        !grid[r]?.[c]
      ) {
        continue;
      }

      connected.add(key);

      for (const n of neighbors(
        r,
        c,
      )) {
        stack.push(n);
      }
    }

    return connected;
  }

  function spawnPop(
    x: number,
    y: number,
    color: number,
    amount = 8,
  ) {
    for (
      let i = 0;
      i < amount;
      i++
    ) {
      const a =
        Math.random() *
        Math.PI *
        2;

      const speed =
        1 +
        Math.random() * 3.6;

      pops.push({
        x,
        y,
        vx:
          Math.cos(a) *
          speed,
        vy:
          Math.sin(a) *
            speed -
          1,
        color,
        life:
          0.8 +
          Math.random() * 0.3,
        maxLife: 1,
        size:
          1.5 +
          Math.random() *
            2.4,
      });
    }
  }

  function spawnDrop(
    x: number,
    y: number,
    cell: Cell,
  ) {
    drops.push({
      x,
      y,
      vy:
        -1 -
        Math.random() * 1.5,
      color:
        cell.color,
      kind:
        cell.kind,
      life: 1,
      rot:
        Math.random() *
        Math.PI *
        2,
    });
  }

  function floatingText(
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
        ? 42
        : 32,
      maxLife: big
        ? 42
        : 32,
      big,
    });
  }

  function scorePoints(
    base: number,
    x?: number,
    y?: number,
    label?: string,
  ) {
    const comboMultiplier =
      combo >= 20
        ? 5
        : combo >= 12
          ? 4
          : combo >= 8
            ? 3
            : combo >= 4
              ? 2
              : 1;

    const chainMultiplier =
      chainReaction
        ? 2
        : 1;

    const amount =
      Math.max(
        1,
        Math.round(
          base *
            comboMultiplier *
            chainMultiplier *
            (1 +
              dropUpgrade *
                0.08),
        ),
      );

    score += amount;
    bestScore =
      Math.max(
        bestScore,
        score,
      );

    onScore(score);

    if (
      x !== undefined &&
      y !== undefined
    ) {
      floatingText(
        x,
        y,
        label
          ? `${label} +${amount}`
          : `+${amount}`,
        amount >= 100,
      );
    }
  }

  function beginCombo() {
    combo++;
    comboTimer =
      95 +
      comboUpgrade *
        18;

    maxCombo =
      Math.max(
        maxCombo,
        combo,
      );

    if (
      combo >= 10 &&
      !chainReaction
    ) {
      chainReaction = true;
      chainTimer = 320;

      floatingText(
        width / 2,
        height * 0.36,
        "CHAIN REACTION!",
        true,
      );

      beep(
        960,
        0.08,
        "sine",
        0.06,
      );
    }
  }

  function endCombo() {
    combo = 0;
    comboTimer = 0;
    chainReaction = false;
    chainTimer = 0;
  }

  function triggerSpecial(
    r: number,
    c: number,
  ) {
    const cell =
      grid[r]?.[c];

    if (!cell) {
      return;
    }

    if (
      cell.kind ===
      "rainbow"
    ) {
      return;
    }

    if (
      cell.kind ===
      "bomb"
    ) {
      const affected =
        [
          [r, c],
          ...neighbors(
            r,
            c,
          ),
        ];

      for (const [
        ar,
        ac,
      ] of affected) {
        const target =
          grid[ar]?.[ac];

        if (target) {
          const p =
            cellPos(
              ar,
              ac,
            );

          spawnPop(
            p.x,
            p.y,
            target.color,
            5,
          );

          grid[ar][ac] =
            null;

          scorePoints(
            12,
            p.x,
            p.y,
          );
        }
      }

      floatingText(
        cellPos(r, c).x,
        cellPos(r, c).y,
        "BOMB",
        true,
      );

      beep(
        240,
        0.11,
      );

      return;
    }

    if (
      cell.kind ===
      "lightning"
    ) {
      const row =
        r;

      for (
        let c2 = 0;
        c2 <
        getRowLength(row);
        c2++
      ) {
        const target =
          grid[row]?.[c2];

        if (target) {
          const p =
            cellPos(
              row,
              c2,
            );

          spawnPop(
            p.x,
            p.y,
            target.color,
            4,
          );

          grid[row][c2] =
            null;

          scorePoints(
            10,
            p.x,
            p.y,
          );
        }
      }

      floatingText(
        cellPos(r, c).x,
        cellPos(r, c).y,
        "ROW CLEAR",
        true,
      );

      beep(
        760,
        0.08,
      );
    }
  }

  function dropFloating() {
    const connected =
      findConnectedCells();

    let dropped = 0;

    for (
      let r = 0;
      r < grid.length;
      r++
    ) {
      for (
        let c = 0;
        c <
        getRowLength(r);
        c++
      ) {
        const cell =
          grid[r]?.[c];

        if (!cell) {
          continue;
        }

        const key =
          `${r},${c}`;

        if (
          connected.has(
            key,
          )
        ) {
          continue;
        }

        const p =
          cellPos(
            r,
            c,
          );

        spawnDrop(
          p.x,
          p.y,
          cell,
        );

        spawnPop(
          p.x,
          p.y,
          cell.color,
          3,
        );

        grid[r][c] =
          null;

        dropped++;
      }
    }

    if (dropped > 0) {
      const base =
        20 * dropped;

      const dropBonus =
        dropped >= 20
          ? 300
          : dropped >= 12
            ? 180
            : dropped >= 8
              ? 100
              : dropped >= 5
                ? 50
                : 0;

      scorePoints(
        base +
          dropBonus,
        width / 2,
        height * 0.45,
        dropped >= 8
          ? `DROP CHAIN (${dropped})`
          : undefined,
      );

      if (
        dropped >= 8
      ) {
        floatingText(
          width / 2,
          height * 0.4,
          `${dropped} DROPPED`,
          true,
        );

        chainReaction = true;
        chainTimer =
          Math.max(
            chainTimer,
            180,
          );

        beep(
          800,
          0.1,
          "sine",
        );
      }
    }
  }

  function removeCell(
    r: number,
    c: number,
  ) {
    const cell =
      grid[r]?.[c];

    if (!cell) {
      return;
    }

    const p =
      cellPos(
        r,
        c,
      );

    spawnPop(
      p.x,
      p.y,
      cell.color,
    );

    grid[r][c] =
      null;
  }

  function checkBoardClear() {
    return grid.every(
      (row) =>
        row.every(
          (cell) =>
            cell == null,
        ),
    );
  }

  function removeEmptyBottomRows() {
    while (
      grid.length > 0 &&
      grid[
        grid.length - 1
      ].every(
        (cell) =>
          cell == null,
      )
    ) {
      grid.pop();
    }
  }

  function resolveSpecialCluster(
    cluster: [
      number,
      number,
    ][],
  ) {
    const specialCells =
      new Set<string>();

    for (const [
      r,
      c,
    ] of cluster) {
      specialCells.add(
        `${r},${c}`,
      );
    }

    for (const [
      r,
      c,
    ] of cluster) {
      const cell =
        grid[r]?.[c];

      if (
        cell &&
        (
          cell.kind ===
            "bomb" ||
          cell.kind ===
            "lightning"
        )
      ) {
        triggerSpecial(
          r,
          c,
        );
      }
    }

    // Rainbow match:
    // delete one additional adjacent
    // bubble of the most common nearby colour.
    for (const [
      r,
      c,
    ] of cluster) {
      const cell =
        grid[r]?.[c];

      if (
        !cell ||
        cell.kind !==
          "rainbow"
      ) {
        continue;
      }

      const candidates =
        neighbors(
          r,
          c,
        )
          .map(
            ([nr, nc]) =>
              grid[nr]?.[nc],
          )
          .filter(
            (
              target,
            ): target is Cell =>
              !!target,
          );

      if (
        candidates.length ===
        0
      ) {
        continue;
      }

      const counts =
        new Map<
          number,
          number
        >();

      for (const candidate of candidates) {
        counts.set(
          candidate.color,
          (counts.get(
            candidate.color,
          ) ?? 0) + 1,
        );
      }

      let bestColor =
        candidates[0].color;

      let bestCount = 0;

      for (const [
        color,
        count,
      ] of counts) {
        if (
          count > bestCount
        ) {
          bestCount =
            count;

          bestColor =
            color;
        }
      }

      for (const [
        nr,
        nc,
      ] of neighbors(
        r,
        c,
      )) {
        const target =
          grid[nr]?.[nc];

        if (
          target &&
          target.color ===
            bestColor
        ) {
          removeCell(
            nr,
            nc,
          );

          break;
        }
      }
    }

    for (const [
      r,
      c,
    ] of cluster) {
      specialCells.delete(
        `${r},${c}`,
      );
    }
  }

  function chooseSnapCell() {
    if (!flying) {
      return null;
    }

    let bestR = 0;
    let bestC = 0;
    let bestD =
      Infinity;

    const maxRows =
      Math.min(
        MAX_ROWS,
        grid.length + 2,
      );

    for (
      let r = 0;
      r < maxRows;
      r++
    ) {
      const cols =
        getRowLength(r);

      for (
        let c = 0;
        c < cols;
        c++
      ) {
        if (
          grid[r]?.[c]
        ) {
          continue;
        }

        const p =
          cellPos(
            r,
            c,
          );

        const d =
          Math.hypot(
            p.x -
              flying.x,
            p.y -
              flying.y,
          );

        if (
          d < bestD
        ) {
          bestD = d;
          bestR = r;
          bestC = c;
        }
      }
    }

    return {
      r: bestR,
      c: bestC,
    };
  }

  function snap() {
    if (!flying) {
      return;
    }

    const shot =
      flying;

    const target =
      chooseSnapCell();

    if (!target) {
      flying =
        null;

      return;
    }

    ensureRows(
      target.r + 1,
    );

    if (
      grid[target.r]?.[
        target.c
      ]
    ) {
      flying = null;
      return;
    }

    grid[target.r][
      target.c
    ] = {
      color:
        shot.color,
      kind:
        shot.kind,
    };

    const anchor =
      cellPos(
        target.r,
        target.c,
      );

    if (
      shot.banked
    ) {
      scorePoints(
        10,
        anchor.x,
        anchor.y,
        "BANK",
      );
    }

    const cluster =
      shot.kind ===
        "rainbow"
        ? findRainbowCluster(
            target.r,
            target.c,
          )
        : findColorCluster(
            target.r,
            target.c,
            shot.color,
          );

    if (
      cluster.length >= 3
    ) {
      beginCombo();

      cluster.forEach(
        ([r, c]) => {
          const cell =
            grid[r]?.[c];

          if (!cell) {
            return;
          }

          const p =
            cellPos(
              r,
              c,
            );

          spawnPop(
            p.x,
            p.y,
            cell.color,
          );

          grid[r][c] =
            null;
        },
      );

      const clusterBase =
        cluster.length *
          12 +
        Math.max(
          0,
          cluster.length -
            3,
        ) *
          20;

      scorePoints(
        clusterBase,
        anchor.x,
        anchor.y,
        cluster.length >=
          6
          ? `${cluster.length} MATCH`
          : undefined,
      );

      if (
        cluster.length >=
        5
      ) {
        floatingText(
          anchor.x,
          anchor.y - R,
          "GREAT!",
          true,
        );
      }

      if (
        cluster.length >=
        7
      ) {
        chainReaction = true;
        chainTimer =
          Math.max(
            chainTimer,
            220,
          );

        floatingText(
          anchor.x,
          anchor.y -
            R * 2,
          "MASSIVE!",
          true,
        );
      }

      resolveSpecialCluster(
        cluster,
      );

      dropFloating();

      misses = Math.max(
        0,
        misses - 1,
      );

      beep(
        620 +
          cluster.length *
            45,
        0.08,
        "sine",
        0.05,
      );
    } else {
      misses++;

      endCombo();

      const message =
        shot.banked
          ? "BANK SHOT"
          : "MISS";

      floatingText(
        anchor.x,
        anchor.y,
        message,
        false,
      );

      beep(
        shot.banked
          ? 350
          : 290,
        0.04,
        "triangle",
        0.04,
      );

      handleSpecialMiss(
        target.r,
        target.c,
      );
    }

    flying = null;

    removeEmptyBottomRows();

    shots++;

    maybeAddPenaltyRow();

    if (
      checkBoardClear()
    ) {
      scorePoints(
        350 + level * 50,
        width / 2,
        height * 0.35,
        "CLEAR",
      );

      floatingText(
        width / 2,
        height * 0.3,
        "BOARD CLEAR!",
        true,
      );

      onStatus?.(
        "Board cleared!",
      );

      alive = false;

      onGameOver(
        score,
        shots,
      );

      return;
    }

    if (
      isDangerReached()
    ) {
      alive = false;

      onStatus?.(
        "Bubbles hit the line! Tap to retry",
      );

      onGameOver(
        score,
        shots,
      );

      return;
    }

    if (
      misses >=
      getMissThreshold()
    ) {
      misses = 0;
      addPenaltyRow();

      onStatus?.(
        "NEW ROW!",
      );
    }
  }

  function findRainbowCluster(
    r: number,
    c: number,
  ): [number, number][] {
    const attached =
      grid[r]?.[c];

    if (!attached) {
      return [];
    }

    let targetColor:
      | number
      | null = null;

    const around =
      neighbors(r, c);

    for (const [
      nr,
      nc,
    ] of around) {
      const cell =
        grid[nr]?.[nc];

      if (
        cell &&
        cell.kind !==
          "rainbow"
      ) {
        targetColor =
          cell.color;

        break;
      }
    }

    if (
      targetColor == null
    ) {
      return [[
        r,
        c,
      ]];
    }

    return [
      [r, c],
      ...findColorCluster(
        r,
        c,
        targetColor,
      ),
    ];
  }

  function handleSpecialMiss(
    r: number,
    c: number,
  ) {
    const cell =
      grid[r]?.[c];

    if (!cell) {
      return;
    }

    if (
      cell.kind ===
      "bomb"
    ) {
      triggerSpecial(
        r,
        c,
      );
    } else if (
      cell.kind ===
      "lightning"
    ) {
      triggerSpecial(
        r,
        c,
      );
    }
  }

  function getMissThreshold() {
    return Math.max(
      4,
      7 -
        Math.floor(
          level / 3,
        ),
    );
  }

  function maybeAddPenaltyRow() {
    if (
      misses ===
        0 &&
      shots > 0 &&
      shots % 6 ===
        0 &&
      level >= 3
    ) {
      // Small chance of an extra pressure row
      // without requiring a full miss streak.
      if (
        Math.random() <
        0.25
      ) {
        addPenaltyRow();
      }
    }
  }

  function addPenaltyRow() {
    if (
      grid.length >=
      MAX_ROWS
    ) {
      return;
    }

    const newRow: (
      | Cell
      | null
    )[] = [];

    const newRowIndex =
      grid.length;

    for (
      let c = 0;
      c <
      getRowLength(
        newRowIndex,
      );
      c++
    ) {
      let color =
        randomColor();

      if (
        c > 0 &&
        newRow[c - 1] &&
        Math.random() <
          0.48
      ) {
        color =
          newRow[c - 1]!.color;
      }

      let kind: BubbleKind =
        "normal";

      if (
        level >= 4 &&
        Math.random() <
          0.05
      ) {
        kind =
          randomKind();
      }

      newRow.push({
        color,
        kind,
      });
    }

    // Shift every row downward.
    grid.unshift(
      new Array(
        getRowLength(0),
      ).fill(null),
    );

    for (
      let r = grid.length - 1;
      r > 0;
      r--
    ) {
      const source =
        grid[r - 1];

      const target =
        grid[r];

      for (
        let c = 0;
        c <
        getRowLength(r);
        c++
      ) {
        if (
          c <
          source.length
        ) {
          target[c] =
            source[c];
        }
      }
    }

    grid[0] =
      newRow.map(
        (cell) =>
          cell ?? null,
      );

    // Guarantee at least one bubble.
    if (
      grid[0].every(
        (cell) =>
          cell == null,
      )
    ) {
      grid[0][
        randInt(
          getRowLength(0),
        )
      ] = {
        color:
          randomColor(),
        kind: "normal",
      };
    }

    misses = 0;

    createPenaltyEffect();

    if (
      isDangerReached()
    ) {
      alive = false;

      onStatus?.(
        "Bubbles hit the line!",
      );

      onGameOver(
        score,
        shots,
      );
    }
  }

  function createPenaltyEffect() {
    for (
      let c = 0;
      c <
      getRowLength(0);
      c++
    ) {
      const cell =
        grid[0]?.[c];

      if (!cell) {
        continue;
      }

      const p =
        cellPos(
          0,
          c,
        );

      spawnPop(
        p.x,
        p.y,
        cell.color,
        3,
      );
    }

    floatingText(
      width / 2,
      dangerY - 12,
      "NEW ROW",
      true,
    );

    beep(
      180,
      0.1,
      "square",
      0.04,
    );
  }

  function isDangerReached() {
    return grid.some(
      (row, r) =>
        row.some(
          (cell) =>
            cell != null,
        ) &&
        cellPos(
          r,
          0,
        ).y +
          R >=
          dangerY,
    );
  }

  function update(dt: number) {
    bob +=
      dt * 3.2;

    if (
      comboTimer >
      0
    ) {
      comboTimer -=
        dt * 60;

      if (
        comboTimer <= 0
      ) {
        endCombo();
      }
    }

    if (
      chainTimer >
      0
    ) {
      chainTimer -=
        dt * 60;

      if (
        chainTimer <= 0
      ) {
        chainReaction =
          false;
      }
    }

    if (
      levelClearTimer >
      0
    ) {
      levelClearTimer -=
        dt * 60;

      if (
        levelClearTimer <=
        0
      ) {
        level++;
        stage++;
        makeInitialGrid();

        shooter =
          randomShot();

        nextShot =
          randomShot();

        onStatus?.(
          `Level ${level}`,
        );
      }
    }

    if (
      flying &&
      alive &&
      !upgradeSelection
    ) {
      // Sub-step to prevent tunnelling.
      for (
        let s = 0;
        s < 3 &&
        flying;
        s++
      ) {
        const current =
          flying;

        current.x +=
          current.vx /
          3;

        current.y +=
          current.vy /
          3;

        if (
          current.x < R
        ) {
          current.x =
            R;

          current.vx =
            Math.abs(
              current.vx,
            );

          current.banked =
            true;
        } else if (
          current.x >
          width - R
        ) {
          current.x =
            width - R;

          current.vx =
            -Math.abs(
              current.vx,
            );

          current.banked =
            true;
        }

        if (
          current.y <
          boardTop + R
        ) {
          snap();
          break;
        }

        let hit = false;

        for (
          let r = 0;
          r <
            grid.length &&
            !hit;
          r++
        ) {
          for (
            let c = 0;
            c <
              getRowLength(
                r,
              );
            c++
          ) {
            const cell =
              grid[r]?.[c];

            if (!cell) {
              continue;
            }

            const p =
              cellPos(
                r,
                c,
              );

            if (
              Math.hypot(
                p.x -
                  current.x,
                p.y -
                  current.y,
              ) <
              R * 1.72
            ) {
              snap();
              hit = true;
              break;
            }
          }
        }
      }
    }

    pops =
      pops.filter(
        (p) => {
          p.x +=
            p.vx *
            dt *
            60;

          p.y +=
            p.vy *
            dt *
            60;

          p.vy +=
            0.2 *
            dt *
            60;

          p.vx *=
            0.985;

          p.life -=
            dt * 2.2;

          return (
            p.life > 0
          );
        },
      );

    drops =
      drops.filter(
        (drop) => {
          drop.vy +=
            0.5 *
            dt *
            60;

          drop.y +=
            drop.vy *
            dt *
            60;

          drop.rot +=
            0.08 *
            dt *
            60;

          drop.life -=
            dt * 0.45;

          return (
            drop.y <
              height +
                R &&
            drop.life > 0
          );
        },
      );

    floatingTexts =
      floatingTexts.filter(
        (item) => {
          item.y -=
            0.45 *
            dt *
            60;

          item.life -=
            dt * 1.6;

          return (
            item.life > 0
          );
        },
      );
  }

  function drawBubble(
    x: number,
    y: number,
    color: number,
    kind: BubbleKind,
    radius = R - 1.5,
    alpha = 1,
  ) {
    ctx.save();

    ctx.globalAlpha =
      alpha;

    const baseColor =
      COLORS[
        color %
          COLORS.length
      ];

    const gradient =
      ctx.createRadialGradient(
        x -
          radius *
            0.35,
        y -
          radius *
            0.35,
        radius *
          0.1,
        x,
        y,
        radius,
      );

    gradient.addColorStop(
      0,
      "rgba(255,255,255,0.88)",
    );

    gradient.addColorStop(
      0.23,
      baseColor,
    );

    gradient.addColorStop(
      1,
      shade(
        baseColor,
        -0.35,
      ),
    );

    if (
      kind ===
      "rainbow"
    ) {
      gradient.addColorStop(
        0,
        "#ffffff",
      );

      gradient.addColorStop(
        0.35,
        "#f0abfc",
      );

      gradient.addColorStop(
        0.7,
        "#60a5fa",
      );

      gradient.addColorStop(
        1,
        "#4ade80",
      );
    }

    if (
      kind ===
      "bomb"
    ) {
      gradient.addColorStop(
        0,
        "#ffffff",
      );

      gradient.addColorStop(
        0.3,
        "#fb923c",
      );

      gradient.addColorStop(
        1,
        "#dc2626",
      );
    }

    if (
      kind ===
      "lightning"
    ) {
      gradient.addColorStop(
        0,
        "#ffffff",
      );

      gradient.addColorStop(
        0.35,
        "#fef08a",
      );

      gradient.addColorStop(
        1,
        "#f59e0b",
      );
    }

    if (
      kind ===
      "stone"
    ) {
      gradient.addColorStop(
        0,
        "#e2e8f0",
      );

      gradient.addColorStop(
        1,
        "#64748b",
      );
    }

    ctx.fillStyle =
      gradient;

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
      "rgba(255,255,255,0.48)";

    ctx.beginPath();

    ctx.arc(
      x -
        radius *
          0.32,
      y -
        radius *
          0.32,
      radius *
        0.22,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    if (
      kind !==
      "normal"
    ) {
      ctx.strokeStyle =
        kind ===
        "rainbow"
          ? "#ffffff"
          : kind ===
              "bomb"
            ? "#ef4444"
            : kind ===
                "lightning"
              ? "#facc15"
              : "#cbd5e1";

      ctx.lineWidth =
        1.5;

      ctx.globalAlpha =
        Math.min(
          1,
          alpha *
            0.8,
        );

      if (
        kind ===
        "bomb"
      ) {
        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius *
            0.48,
          0,
          Math.PI * 2,
        );

        ctx.stroke();

        ctx.fillStyle =
          "#ffffff";

        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius *
            0.12,
          0,
          Math.PI * 2,
        );

        ctx.fill();
      } else if (
        kind ===
        "lightning"
      ) {
        ctx.beginPath();

        ctx.moveTo(
          x -
            radius *
              0.08,
          y -
            radius *
              0.48,
        );

        ctx.lineTo(
          x -
            radius *
              0.28,
          y -
            radius *
              0.02,
        );

        ctx.lineTo(
          x +
            radius *
              0.02,
          y -
            radius *
              0.02,
        );

        ctx.lineTo(
          x -
            radius *
              0.12,
          y +
            radius *
              0.48,
        );

        ctx.stroke();
      } else if (
        kind ===
        "rainbow"
      ) {
        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius *
            0.5,
          0,
          Math.PI * 1.5,
        );

        ctx.stroke();
      } else {
        ctx.beginPath();

        ctx.moveTo(
          x -
            radius *
              0.32,
          y -
            radius *
              0.16,
        );

        ctx.lineTo(
          x +
            radius *
              0.32,
          y +
            radius *
              0.16,
        );

        ctx.moveTo(
          x +
            radius *
              0.32,
          y -
            radius *
              0.16,
        );

        ctx.lineTo(
          x -
            radius *
              0.32,
          y +
            radius *
              0.16,
        );

        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawTrajectory() {
    let x =
      width / 2;

    let y =
      shooterY;

    let vx =
      Math.cos(aim);

    let vy =
      Math.sin(aim);

    const step =
      R * 0.82;

    ctx.fillStyle =
      "rgba(255,255,255,0.36)";

    const previewLength =
      48 +
      previewUpgrade *
        14;

    for (
      let i = 0;
      i < previewLength;
      i++
    ) {
      x +=
        vx * step;

      y +=
        vy * step;

      if (
        x < R ||
        x >
          width - R
      ) {
        vx *= -1;

        x = Math.max(
          R,
          Math.min(
            width - R,
            x,
          ),
        );

        if (
          i > 2
        ) {
          floatingText;
        }
      }

      if (
        y <
        boardTop + R
      ) {
        break;
      }

      let blocked =
        false;

      for (
        let r = 0;
        r <
          grid.length &&
        !blocked;
        r++
      ) {
        for (
          let c = 0;
          c <
            getRowLength(
              r,
            );
          c++
        ) {
          const cell =
            grid[r]?.[c];

          if (!cell) {
            continue;
          }

          const p =
            cellPos(
              r,
              c,
            );

          if (
            Math.hypot(
              p.x - x,
              p.y - y,
            ) <
            R * 1.7
          ) {
            blocked = true;
            break;
          }
        }
      }

      if (
        blocked
      ) {
        break;
      }

      if (
        i % 2 ===
        0
      ) {
        ctx.beginPath();

        ctx.arc(
          x,
          y,
          2.2,
          0,
          Math.PI * 2,
        );

        ctx.fill();
      }
    }

    // Show where this shot is expected
    // to attach.
    if (
      previewUpgrade > 0
    ) {
      const preview =
        simulateSnapTarget(
          aim,
        );

      if (preview) {
        const p =
          cellPos(
            preview.r,
            preview.c,
          );

        ctx.save();

        ctx.globalAlpha =
          0.28;

        ctx.strokeStyle =
          "#ffffff";

        ctx.lineWidth = 1.5;

        ctx.beginPath();

        ctx.arc(
          p.x,
          p.y,
          R - 2,
          0,
          Math.PI * 2,
        );

        ctx.stroke();

        ctx.restore();
      }
    }
  }

  function simulateSnapTarget(
    angle: number,
  ) {
    let x =
      width / 2;

    let y =
      shooterY;

    let vx =
      Math.cos(angle);

    let vy =
      Math.sin(angle);

    for (
      let i = 0;
      i < 500;
      i++
    ) {
      x +=
        vx *
        (R * 0.7);

      y +=
        vy *
        (R * 0.7);

      if (
        x < R
      ) {
        x = R;
        vx = Math.abs(vx);
      } else if (
        x >
        width - R
      ) {
        x =
          width - R;
        vx =
          -Math.abs(vx);
      }

      if (
        y <
        boardTop + R
      ) {
        break;
      }

      for (
        let r = 0;
        r < grid.length;
        r++
      ) {
        for (
          let c = 0;
          c <
          getRowLength(r);
          c++
        ) {
          if (
            !grid[r]?.[c]
          ) {
            continue;
          }

          const p =
            cellPos(
              r,
              c,
            );

          if (
            Math.hypot(
              p.x - x,
              p.y - y,
            ) <
            R * 1.7
          ) {
            let bestR =
              r;

            let bestC =
              c;

            let bestD =
              Infinity;

            for (const [
              nr,
              nc,
            ] of neighbors(
              r,
              c,
            )) {
              if (
                grid[nr]?.[nc]
              ) {
                continue;
              }

              const np =
                cellPos(
                  nr,
                  nc,
                );

              const d =
                Math.hypot(
                  np.x - x,
                  np.y - y,
                );

              if (
                d < bestD
              ) {
                bestD = d;
                bestR = nr;
                bestC = nc;
              }
            }

            return {
              r: bestR,
              c: bestC,
            };
          }
        }
      }
    }

    return {
      r: 0,
      c: Math.max(
        0,
        Math.min(
          getRowLength(0) -
            1,
          Math.floor(
            x /
              (2 * R),
          ),
        ),
      ),
    };
  }

  function getSpecialShotLabel(
    kind: BubbleKind,
  ) {
    switch (kind) {
      case "rainbow":
        return "RAINBOW";

      case "bomb":
        return "BOMB";

      case "lightning":
        return "LIGHTNING";

      case "stone":
        return "STONE";

      default:
        return "";
    }
  }

  function renderHud() {
    ctx.save();

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "600 13px system-ui";

    ctx.textAlign =
      "left";

    ctx.fillText(
      `Level ${level}`,
      12,
      22,
    );

    ctx.fillText(
      `Score ${score}`,
      12,
      42,
    );

    ctx.fillText(
      `Misses ${
        misses
      }/${getMissThreshold()}`,
      12,
      62,
    );

    ctx.textAlign =
      "right";

    ctx.fillText(
      `Best ${bestScore}`,
      width - 12,
      22,
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

      const multiplier =
        combo >= 20
          ? 5
          : combo >= 12
            ? 4
            : combo >= 8
              ? 3
              : combo >= 4
                ? 2
                : 1;

      ctx.fillText(
        `COMBO x${multiplier}`,
        width / 2,
        22,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        `${combo} hits`,
        width / 2,
        39,
      );
    }

    if (
      chainReaction
    ) {
      ctx.textAlign =
        "center";

      ctx.fillStyle =
        "#facc15";

      ctx.font =
        "bold 16px system-ui";

      ctx.fillText(
        "CHAIN REACTION",
        width / 2,
        59,
      );
    }

    ctx.restore();
  }

  function renderShooter() {
    const by =
      shooterY +
      Math.sin(bob) *
        1.5;

    drawBubble(
      width / 2,
      by,
      shooter.color,
      shooter.kind,
    );

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "600 11px system-ui";

    ctx.textAlign =
      "right";

    ctx.fillText(
      "NEXT",
      width -
        R * 2 -
        10,
      shooterY - 2,
    );

    drawBubble(
      width -
        R -
        8,
      shooterY,
      nextShot.color,
      nextShot.kind,
      R * 0.72,
    );

    if (
      shooter.kind !==
      "normal"
    ) {
      ctx.textAlign =
        "center";

      ctx.fillStyle =
        "#ffffff";

      ctx.font =
        "bold 9px system-ui";

      ctx.fillText(
        getSpecialShotLabel(
          shooter.kind,
        ),
        width / 2,
        shooterY +
          R +
          17,
      );
    }
  }

  function renderDangerLine() {
    ctx.save();

    const danger =
      grid.some(
        (row, r) =>
          row.some(
            (cell) =>
              cell != null,
          ) &&
          cellPos(
            r,
            0,
          ).y +
            R >=
            dangerY,
      );

    ctx.strokeStyle =
      danger
        ? "rgba(248,113,113,0.72)"
        : "rgba(248,113,113,0.34)";

    ctx.lineWidth =
      danger ? 3 : 2;

    ctx.setLineDash([
      10,
      8,
    ]);

    ctx.beginPath();

    ctx.moveTo(
      0,
      dangerY,
    );

    ctx.lineTo(
      width,
      dangerY,
    );

    ctx.stroke();

    ctx.setLineDash([]);

    ctx.restore();
  }

  function renderUpgradeSelection() {
    if (
      !upgradeSelection
    ) {
      return;
    }

    ctx.save();

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
        width * 0.29,
      );

    const gap = 10;

    const total =
      cardWidth * 3 +
      gap * 2;

    const startX =
      width / 2 -
      total / 2;

    for (
      let i = 0;
      i <
      upgradeChoices.length;
      i++
    ) {
      const item =
        upgradeChoices[i];

      const x =
        startX +
        i *
          (cardWidth +
            gap);

      const y =
        height / 2 -
        58;

      ctx.strokeStyle =
        pal.neon;

      ctx.lineWidth = 1.5;

      ctx.strokeRect(
        x,
        y,
        cardWidth,
        118,
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
        item.name,
        x +
          cardWidth / 2,
        y + 50,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        item.description,
        x +
          cardWidth / 2,
        y + 78,
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

    ctx.restore();
  }

  function buildUpgradeChoices() {
    const pool: Upgrade[] = [
      {
        id: "combo",
        name: "COMBO MASTER",
        description:
          "Combos last longer",
      },
      {
        id: "lucky",
        name: "LUCKY SHOTS",
        description:
          "More useful bubble colours",
      },
      {
        id: "drop",
        name: "DROP BONUS",
        description:
          "Detached bubbles score more",
      },
      {
        id: "preview",
        name: "SMART AIM",
        description:
          "Better trajectory preview",
      },
      {
        id: "special",
        name: "SPECIALIST",
        description:
          "Special bubbles appear more",
      },
    ];

    upgradeChoices = [];

    while (
      upgradeChoices.length <
        3 &&
      pool.length >
        0
    ) {
      const index =
        randInt(
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
      "Choose an upgrade",
    );
  }

  function applyUpgrade(
    upgrade: Upgrade,
  ) {
    switch (
      upgrade.id
    ) {
      case "combo":
        comboUpgrade++;
        break;

      case "lucky":
        luckyUpgrade++;
        break;

      case "drop":
        dropUpgrade++;
        break;

      case "preview":
        previewUpgrade++;
        break;

      case "special":
        specialUpgrade++;
        break;
    }

    upgradeSelection =
      false;

    upgradeChoices = [];

    levelClearTimer = 40;

    onStatus?.(
      `Upgrade: ${upgrade.name}`,
    );

    beep(
      760,
      0.08,
      "sine",
    );
  }

  function swapShotQueue() {
    const old =
      shooter;

    shooter =
      nextShot;

    nextShot =
      old;

    if (
      luckyUpgrade > 0 &&
      nextShot.kind ===
        "normal" &&
      Math.random() <
        luckyUpgrade *
          0.07
    ) {
      nextShot =
        randomShot();
    }
  }

  function shoot() {
    if (
      flying ||
      !alive ||
      upgradeSelection ||
      levelClearTimer >
        0
    ) {
      return;
    }

    flying = {
      x:
        width / 2,
      y:
        shooterY,
      vx:
        Math.cos(aim) *
        SPEED,
      vy:
        Math.sin(aim) *
        SPEED,
      color:
        shooter.color,
      kind:
        shooter.kind,
      banked: false,
    };

    swapShotQueue();
  }

  function onMove(
    e: PointerEvent,
  ) {
    const rect =
      canvas.getBoundingClientRect();

    const mx =
      ((e.clientX -
        rect.left) /
        rect.width) *
      width;

    const my =
      ((e.clientY -
        rect.top) /
        rect.height) *
      height;

    let angle =
      Math.atan2(
        my -
          shooterY,
        mx -
          width / 2,
      );

    angle = Math.max(
      -Math.PI +
        0.22,
      Math.min(
        -0.22,
        angle,
      ),
    );

    aim = angle;
  }

  function onDown(
    e: PointerEvent,
  ) {
    if (!alive) {
      reset();
      return;
    }

    if (
      upgradeSelection
    ) {
      return;
    }

    onMove(e);
    shoot();
  }

  function onKey(
    e: KeyboardEvent,
  ) {
    const key =
      e.key.toLowerCase();

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

    if (
      key === "arrowleft"
    ) {
      aim = Math.max(
        -Math.PI + 0.22,
        aim - 0.06,
      );

      e.preventDefault();
      return;
    }

    if (
      key ===
      "arrowright"
    ) {
      aim = Math.min(
        -0.22,
        aim + 0.06,
      );

      e.preventDefault();
      return;
    }

    if (
      key === " "
    ) {
      e.preventDefault();

      if (!alive) {
        reset();
      } else {
        shoot();
      }

      return;
    }

    if (
      key === "r"
    ) {
      reset();
    }
  }

  function render() {
    ctx.fillStyle =
      pal.bg;

    ctx.fillRect(
      0,
      0,
      width,
      height,
    );

    renderDangerLine();

    // Subtle background dots.
    ctx.save();

    ctx.fillStyle =
      pal.muted;

    ctx.globalAlpha =
      0.08;

    for (
      let i = 0;
      i < 28;
      i++
    ) {
      const x =
        (i * 73 +
          level * 13) %
        width;

      const y =
        (i * 47 +
          level * 19) %
        height;

      ctx.fillRect(
        x,
        y,
        1,
        1,
      );
    }

    ctx.restore();

    grid.forEach(
      (
        row,
        r,
      ) => {
        row.forEach(
          (
            cell,
            c,
          ) => {
            if (!cell) {
              return;
            }

            const p =
              cellPos(
                r,
                c,
              );

            drawBubble(
              p.x,
              p.y,
              cell.color,
              cell.kind,
            );
          },
        );
      },
    );

    drops.forEach(
      (drop) => {
        drawBubble(
          drop.x,
          drop.y,
          drop.color,
          drop.kind,
          R - 1.5,
          Math.max(
            0,
            drop.life,
          ),
        );
      },
    );

    pops.forEach(
      (pop) => {
        ctx.save();

        ctx.globalAlpha =
          Math.max(
            0,
            pop.life,
          );

        ctx.fillStyle =
          COLORS[
            pop.color %
              COLORS.length
          ];

        ctx.beginPath();

        ctx.arc(
          pop.x,
          pop.y,
          pop.size +
            pop.life *
              2.5,
          0,
          Math.PI * 2,
        );

        ctx.fill();

        ctx.restore();
      },
    );

    if (
      alive &&
      !flying &&
      !upgradeSelection &&
      levelClearTimer <=
        0
    ) {
      drawTrajectory();
    }

    if (flying) {
      drawBubble(
        flying.x,
        flying.y,
        flying.color,
        flying.kind,
      );
    }

    floatingTexts.forEach(
      (item) => {
        ctx.save();

        ctx.globalAlpha =
          Math.max(
            0,
            item.life /
              item.maxLife,
          );

        ctx.fillStyle =
          item.big
            ? pal.gold
            : pal.neon;

        ctx.font = item.big
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
      },
    );

    renderShooter();
    renderHud();

    if (
      levelClearTimer >
      0 &&
      alive
    ) {
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
        pal.gold;

      ctx.font =
        "bold 24px system-ui";

      ctx.fillText(
        "LEVEL CLEAR",
        width / 2,
        height / 2,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "12px system-ui";

      ctx.fillText(
        `Next: ${
          boardPattern
        }`,
        width / 2,
        height / 2 + 24,
      );

      ctx.restore();
    }

    renderUpgradeSelection();

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
        score > bestScore
          ? "BOARD CLEAR!"
          : "GAME OVER",
        width / 2,
        height / 2 - 38,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "14px system-ui";

      ctx.fillText(
        `Score: ${score}`,
        width / 2,
        height / 2 - 5,
      );

      ctx.fillText(
        `Level: ${level}`,
        width / 2,
        height / 2 + 18,
      );

      ctx.fillText(
        `Best combo: ${maxCombo}`,
        width / 2,
        height / 2 + 41,
      );

      ctx.fillStyle =
        pal.neon;

      ctx.font =
        "12px system-ui";

      ctx.fillText(
        "Press SPACE or R to restart",
        width / 2,
        height / 2 + 72,
      );

      ctx.restore();
    }
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
    },
  };
};

export default bubble;
