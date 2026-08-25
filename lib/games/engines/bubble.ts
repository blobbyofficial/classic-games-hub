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

type GridCell = Cell | null;
type Grid = GridCell[][];

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
  rotation: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  big: boolean;
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
  const R = Math.max(14, width / COLS / 2);
  const ROW_H = R * 1.72;
  const BOARD_TOP = 10;
  const SHOOTER_Y = height - R - 16;
  const DANGER_Y =
    height - Math.max(120, R * 3.5);
  const SPEED = 11.5;
  const MAX_ROWS = 16;

  let grid: Grid = [];

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

  let flying: FlyingBubble | null = null;

  let pops: PopParticle[] = [];
  let drops: DropParticle[] = [];
  let floatingTexts: FloatingText[] = [];

  let score = 0;
  let bestScore = 0;
  let shots = 0;
  let misses = 0;
  let level = 1;

  let alive = true;
  let aim = -Math.PI / 2;
  let bob = 0;

  let combo = 0;
  let comboTimer = 0;
  let maxCombo = 0;

  let chainReaction = false;
  let chainTimer = 0;

  let levelClearTimer = 0;

  let comboUpgrade = 0;
  let luckyUpgrade = 0;
  let dropUpgrade = 0;
  let previewUpgrade = 0;
  let specialUpgrade = 0;

  let upgradeSelection = false;
  let upgradeChoices: Upgrade[] = [];

  let boardPattern = "classic";

  function randInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  function getColorCount() {
    if (level <= 2) return 3;
    if (level <= 5) return 4;
    return 5;
  }

  function randomColor() {
    return randInt(getColorCount());
  }

  function getRowLength(row: number) {
    return COLS - (row % 2);
  }

  function createEmptyRow(row: number): GridCell[] {
    const rowData: GridCell[] = [];

    for (
      let col = 0;
      col < getRowLength(row);
      col++
    ) {
      rowData.push(null);
    }

    return rowData;
  }

  function ensureRows(count: number) {
    while (grid.length < count) {
      grid.push(
        createEmptyRow(grid.length),
      );
    }
  }

  function randomKind(
    forceNormal = false,
  ): BubbleKind {
    if (forceNormal) {
      return "normal";
    }

    const roll = Math.random();
    const bonus =
      specialUpgrade * 0.01;

    if (roll < 0.025 + bonus) {
      return "rainbow";
    }

    if (roll < 0.05 + bonus) {
      return "bomb";
    }

    if (roll < 0.075 + bonus) {
      return "lightning";
    }

    if (
      level >= 4 &&
      roll < 0.1 + bonus
    ) {
      return "stone";
    }

    return "normal";
  }

  function randomShot() {
    const normalChance =
      0.8 - specialUpgrade * 0.02;

    let kind: BubbleKind = "normal";

    if (Math.random() > normalChance) {
      kind = randomKind();
    }

    return {
      color: randomColor(),
      kind,
    };
  }

  function cellPos(
    row: number,
    col: number,
  ) {
    const offset =
      (row % 2) * R;

    return {
      x:
        offset +
        col * 2 * R +
        R,
      y:
        BOARD_TOP +
        row * ROW_H +
        R,
    };
  }

  function shade(
    hex: string,
    amount: number,
  ) {
    const part = (index: number) => {
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

    return `#${part(1)}${part(3)}${part(5)}`;
  }

  function choosePattern() {
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
    row: number,
    col: number,
    rowCount: number,
  ) {
    const center =
      (getRowLength(row) - 1) / 2;

    switch (pattern) {
      case "checker":
        return (
          (row + col) % 2 ===
          0
        );

      case "diamond":
        return (
          Math.abs(
            col - center,
          ) +
            Math.abs(
              row -
                (rowCount - 1) /
                  2,
            ) <
          rowCount * 0.72
        );

      case "pyramid":
        return (
          Math.abs(
            col - center,
          ) <=
          row + 0.8
        );

      case "arch":
        return (
          row < 2 ||
          col === 0 ||
          col ===
            getRowLength(row) - 1 ||
          row ===
            rowCount - 1
        );

      case "split":
        return (
          col <= 2 ||
          col >=
            getRowLength(row) - 3 ||
          row < 2
        );

      case "islands":
        return (
          (col <= 2 &&
            row % 2 === 0) ||
          (col >=
            getRowLength(row) - 3 &&
            row % 2 === 1) ||
          row === 0 ||
          row === 1
        );

      default:
        return true;
    }
  }

  function buildBoard() {
    grid = [];

    const rowCount = Math.min(
      5 +
        Math.floor(level / 2),
      9,
    );

    boardPattern =
      choosePattern();

    for (
      let row = 0;
      row < rowCount;
      row++
    ) {
      const rowData: GridCell[] =
        [];

      for (
        let col = 0;
        col < getRowLength(row);
        col++
      ) {
        if (
          !shouldPlace(
            boardPattern,
            row,
            col,
            rowCount,
          )
        ) {
          rowData.push(null);
          continue;
        }

        let color =
          randomColor();

        if (
          row < 2 &&
          col > 0 &&
          Math.random() < 0.55
        ) {
          const previous =
            rowData[col - 1];

          if (
            previous !== null &&
            previous !== undefined
          ) {
            color = previous.color;
          }
        }

        let kind: BubbleKind =
          "normal";

        if (
          level >= 4 &&
          Math.random() < 0.035
        ) {
          kind =
            randomKind();
        }

        rowData.push({
          color,
          kind,
        });
      }

      grid.push(rowData);
    }

    if (grid.length > 0) {
      const firstRow = grid[0];

      let hasBubble = false;

      for (
        const cell of firstRow
      ) {
        if (cell !== null) {
          hasBubble = true;
          break;
        }
      }

      if (!hasBubble) {
        const index =
          randInt(
            getRowLength(0),
          );

        firstRow[index] = {
          color: randomColor(),
          kind: "normal",
        };
      }
    }
  }

  function reset() {
    score = 0;
    shots = 0;
    misses = 0;
    level = 1;

    alive = true;
    aim = -Math.PI / 2;
    bob = 0;

    combo = 0;
    comboTimer = 0;
    maxCombo = 0;

    chainReaction = false;
    chainTimer = 0;

    levelClearTimer = 0;

    comboUpgrade = 0;
    luckyUpgrade = 0;
    dropUpgrade = 0;
    previewUpgrade = 0;
    specialUpgrade = 0;

    upgradeSelection = false;
    upgradeChoices = [];

    flying = null;

    pops = [];
    drops = [];
    floatingTexts = [];

    buildBoard();

    shooter = randomShot();
    nextShot = randomShot();

    onScore(0);
    onStatus?.(
      "Match 3+ to pop",
    );
  }

  function neighbors(
    row: number,
    col: number,
  ): [number, number][] {
    const even =
      row % 2 === 0;

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
            row + dr,
            col + dc,
          ] as [
            number,
            number,
          ],
      )
      .filter(
        ([nextRow, nextCol]) =>
          nextRow >= 0 &&
          nextRow <
            grid.length &&
          nextCol >= 0 &&
          nextCol <
            getRowLength(
              nextRow,
            ),
      );
  }

  function findColorCluster(
    row: number,
    col: number,
    color: number,
  ): [number, number][] {
    const seen =
      new Set<string>();

    const stack: [
      number,
      number,
    ][] = [[row, col]];

    const result: [
      number,
      number,
    ][] = [];

    while (
      stack.length > 0
    ) {
      const current =
        stack.pop()!;

      const currentRow =
        current[0];

      const currentCol =
        current[1];

      const key = `${currentRow},${currentCol}`;

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      const cell =
        grid[currentRow]?.[
          currentCol
        ];

      if (
        cell === null ||
        cell === undefined ||
        cell.color !== color
      ) {
        continue;
      }

      result.push([
        currentRow,
        currentCol,
      ]);

      for (
        const neighbour of neighbors(
          currentRow,
          currentCol,
        )
      ) {
        stack.push(
          neighbour,
        );
      }
    }

    return result;
  }

  function findRainbowCluster(
    row: number,
    col: number,
  ): [number, number][] {
    const start =
      grid[row]?.[col];

    if (
      start === null ||
      start === undefined
    ) {
      return [];
    }

    let targetColor:
      | number
      | null = null;

    for (
      const [
        nextRow,
        nextCol,
      ] of neighbors(
        row,
        col,
      )
    ) {
      const cell =
        grid[nextRow]?.[
          nextCol
        ];

      if (
        cell !== null &&
        cell !== undefined &&
        cell.kind !==
          "rainbow"
      ) {
        targetColor =
          cell.color;

        break;
      }
    }

    if (
      targetColor === null
    ) {
      return [[
        row,
        col,
      ]];
    }

    const cluster =
      findColorCluster(
        row,
        col,
        targetColor,
      );

    if (
      !cluster.some(
        ([r, c]) =>
          r === row &&
          c === col,
      )
    ) {
      cluster.unshift([
        row,
        col,
      ]);
    }

    return cluster;
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
        let col = 0;
        col <
        getRowLength(0);
        col++
      ) {
        const cell =
          grid[0]?.[col];

        if (
          cell !== null &&
          cell !== undefined
        ) {
          stack.push([
            0,
            col,
          ]);
        }
      }
    }

    while (
      stack.length > 0
    ) {
      const current =
        stack.pop()!;

      const row =
        current[0];

      const col =
        current[1];

      const key = `${row},${col}`;

      if (
        connected.has(key)
      ) {
        continue;
      }

      const cell =
        grid[row]?.[col];

      if (
        cell === null ||
        cell === undefined
      ) {
        continue;
      }

      connected.add(key);

      for (
        const neighbour of neighbors(
          row,
          col,
        )
      ) {
        stack.push(
          neighbour,
        );
      }
    }

    return connected;
  }

  function spawnPop(
    x: number,
    y: number,
    color: number,
    count = 8,
  ) {
    for (
      let i = 0;
      i < count;
      i++
    ) {
      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        1 +
        Math.random() *
          3.6;

      pops.push({
        x,
        y,
        vx:
          Math.cos(angle) *
          speed,
        vy:
          Math.sin(angle) *
            speed -
          1,
        color,
        life:
          0.8 +
          Math.random() *
            0.3,
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
        Math.random() *
          1.5,
      color: cell.color,
      kind: cell.kind,
      life: 1,
      rotation:
        Math.random() *
        Math.PI *
        2,
    });
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
      life: big ? 42 : 32,
      maxLife: big ? 42 : 32,
      big,
    });
  }

  function getScoreMultiplier() {
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

    return (
      comboMultiplier *
      (chainReaction ? 2 : 1)
    );
  }

  function addScore(
    base: number,
    x?: number,
    y?: number,
    label?: string,
  ) {
    const amount =
      Math.max(
        1,
        Math.round(
          base *
            getScoreMultiplier() *
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
      addFloatingText(
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
      chainReaction =
        true;

      chainTimer = 320;

      addFloatingText(
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

  function removeCell(
    row: number,
    col: number,
  ) {
    const cell =
      grid[row]?.[col];

    if (
      cell === null ||
      cell === undefined
    ) {
      return;
    }

    const position =
      cellPos(
        row,
        col,
      );

    spawnPop(
      position.x,
      position.y,
      cell.color,
      6,
    );

    grid[row][col] = null;
  }

  function triggerSpecial(
    row: number,
    col: number,
  ) {
    const cell =
      grid[row]?.[col];

    if (
      cell === null ||
      cell === undefined
    ) {
      return;
    }

    if (
      cell.kind === "bomb"
    ) {
      const affected: [
        number,
        number,
      ][] = [
        [row, col],
        ...neighbors(
          row,
          col,
        ),
      ];

      for (
        const [
          affectedRow,
          affectedCol,
        ] of affected
      ) {
        const target =
          grid[affectedRow]?.[
            affectedCol
          ];

        if (
          target === null ||
          target === undefined
        ) {
          continue;
        }

        const position =
          cellPos(
            affectedRow,
            affectedCol,
          );

        spawnPop(
          position.x,
          position.y,
          target.color,
          5,
        );

        grid[affectedRow][
          affectedCol
        ] = null;

        addScore(
          12,
          position.x,
          position.y,
        );
      }

      addFloatingText(
        cellPos(
          row,
          col,
        ).x,
        cellPos(
          row,
          col,
        ).y,
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
      for (
        let currentCol = 0;
        currentCol <
        getRowLength(row);
        currentCol++
      ) {
        const target =
          grid[row]?.[
            currentCol
          ];

        if (
          target === null ||
          target === undefined
        ) {
          continue;
        }

        const position =
          cellPos(
            row,
            currentCol,
          );

        spawnPop(
          position.x,
          position.y,
          target.color,
          4,
        );

        grid[row][
          currentCol
        ] = null;

        addScore(
          10,
          position.x,
          position.y,
        );
      }

      addFloatingText(
        cellPos(
          row,
          col,
        ).x,
        cellPos(
          row,
          col,
        ).y,
        "ROW CLEAR",
        true,
      );

      beep(
        760,
        0.08,
      );
    }
  }

  function resolveSpecialCluster(
    cluster: [
      number,
      number,
    ][],
  ) {
    for (
      const [
        row,
        col,
      ] of cluster
    ) {
      const cell =
        grid[row]?.[col];

      if (
        cell === null ||
        cell === undefined
      ) {
        continue;
      }

      if (
        cell.kind ===
          "bomb" ||
        cell.kind ===
          "lightning"
      ) {
        triggerSpecial(
          row,
          col,
        );
      }
    }
  }

  function dropFloating() {
    const connected =
      findConnectedCells();

    let dropped = 0;

    for (
      let row = 0;
      row < grid.length;
      row++
    ) {
      for (
        let col = 0;
        col <
        getRowLength(row);
        col++
      ) {
        const cell =
          grid[row]?.[col];

        if (
          cell === null ||
          cell === undefined
        ) {
          continue;
        }

        const key =
          `${row},${col}`;

        if (
          connected.has(key)
        ) {
          continue;
        }

        const position =
          cellPos(
            row,
            col,
          );

        spawnDrop(
          position.x,
          position.y,
          cell,
        );

        spawnPop(
          position.x,
          position.y,
          cell.color,
          3,
        );

        grid[row][col] =
          null;

        dropped++;
      }
    }

    if (dropped <= 0) {
      return;
    }

    const bonus =
      dropped >= 20
        ? 300
        : dropped >= 12
          ? 180
          : dropped >= 8
            ? 100
            : dropped >= 5
              ? 50
              : 0;

    addScore(
      dropped * 20 +
        bonus,
      width / 2,
      height * 0.45,
      dropped >= 8
        ? `DROP CHAIN (${dropped})`
        : undefined,
    );

    if (dropped >= 8) {
      addFloatingText(
        width / 2,
        height * 0.4,
        `${dropped} DROPPED`,
        true,
      );

      chainReaction =
        true;

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

  function checkBoardClear() {
    for (
      const row of grid
    ) {
      for (
        const cell of row
      ) {
        if (
          cell !== null
        ) {
          return false;
        }
      }
    }

    return true;
  }

  function removeEmptyBottomRows() {
    while (
      grid.length > 0 &&
      grid[
        grid.length - 1
      ].every(
        (cell) =>
          cell === null,
      )
    ) {
      grid.pop();
    }
  }

  function isDangerReached() {
    return grid.some(
      (row, rowIndex) => {
        const hasBubble =
          row.some(
            (cell) =>
              cell !== null,
          );

        if (!hasBubble) {
          return false;
        }

        return (
          cellPos(
            rowIndex,
            0,
          ).y +
            R >=
          DANGER_Y
        );
      },
    );
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

  function createPenaltyRow() {
    if (
      grid.length >= MAX_ROWS
    ) {
      return;
    }

    const rowData: GridCell[] =
      createEmptyRow(0);

    for (
      let col = 0;
      col <
      rowData.length;
      col++
    ) {
      let color =
        randomColor();

      if (
        col > 0 &&
        rowData[
          col - 1
        ] !== null &&
        Math.random() <
          0.48
      ) {
        const previous =
          rowData[
            col - 1
          ];

        if (
          previous !== null
        ) {
          color =
            previous.color;
        }
      }

      let kind: BubbleKind =
        "normal";

      if (
        level >= 4 &&
        Math.random() < 0.05
      ) {
        kind =
          randomKind();
      }

      rowData[col] = {
        color,
        kind,
      };
    }

    grid.unshift(rowData);

    misses = 0;

    for (
      let col = 0;
      col <
      rowData.length;
      col++
    ) {
      const cell =
        rowData[col];

      if (
        cell === null
      ) {
        continue;
      }

      const position =
        cellPos(
          0,
          col,
        );

      spawnPop(
        position.x,
        position.y,
        cell.color,
        3,
      );
    }

    addFloatingText(
      width / 2,
      DANGER_Y - 12,
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

  function chooseSnapCell() {
    if (!flying) {
      return null;
    }

    let bestRow = 0;
    let bestCol = 0;
    let bestDistance =
      Infinity;

    const maxRows =
      Math.min(
        MAX_ROWS,
        grid.length + 2,
      );

    for (
      let row = 0;
      row < maxRows;
      row++
    ) {
      for (
        let col = 0;
        col <
        getRowLength(row);
        col++
      ) {
        const existing =
          grid[row]?.[col];

        if (
          existing !== null &&
          existing !== undefined
        ) {
          continue;
        }

        const position =
          cellPos(
            row,
            col,
          );

        const distance =
          Math.hypot(
            position.x -
              flying.x,
            position.y -
              flying.y,
          );

        if (
          distance <
          bestDistance
        ) {
          bestDistance =
            distance;

          bestRow = row;
          bestCol = col;
        }
      }
    }

    return {
      row: bestRow,
      col: bestCol,
    };
  }

  function swapShotQueue() {
    const current =
      shooter;

    shooter =
      nextShot;

    if (
      luckyUpgrade > 0 &&
      Math.random() <
        luckyUpgrade *
          0.07
    ) {
      nextShot =
        randomShot();
    } else {
      nextShot =
        current;
    }
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
      flying = null;
      return;
    }

    ensureRows(
      target.row + 1,
    );

    const targetCell =
      grid[target.row]?.[
        target.col
      ];

    if (
      targetCell !== null &&
      targetCell !== undefined
    ) {
      flying = null;
      return;
    }

    grid[target.row][
      target.col
    ] = {
      color: shot.color,
      kind: shot.kind,
    };

    const position =
      cellPos(
        target.row,
        target.col,
      );

    if (shot.banked) {
      addScore(
        10,
        position.x,
        position.y,
        "BANK",
      );
    }

    const cluster =
      shot.kind ===
      "rainbow"
        ? findRainbowCluster(
            target.row,
            target.col,
          )
        : findColorCluster(
            target.row,
            target.col,
            shot.color,
          );

    if (
      cluster.length >= 3
    ) {
      beginCombo();

      for (
        const [
          row,
          col,
        ] of cluster
      ) {
        const cell =
          grid[row]?.[col];

        if (
          cell === null ||
          cell === undefined
        ) {
          continue;
        }

        const cellPosition =
          cellPos(
            row,
            col,
          );

        spawnPop(
          cellPosition.x,
          cellPosition.y,
          cell.color,
        );

        grid[row][col] =
          null;
      }

      const clusterScore =
        cluster.length * 12 +
        Math.max(
          0,
          cluster.length - 3,
        ) * 20;

      addScore(
        clusterScore,
        position.x,
        position.y,
        cluster.length >= 6
          ? `${cluster.length} MATCH`
          : undefined,
      );

      if (
        cluster.length >= 5
      ) {
        addFloatingText(
          position.x,
          position.y - R,
          "GREAT!",
          true,
        );
      }

      if (
        cluster.length >= 7
      ) {
        chainReaction =
          true;

        chainTimer =
          Math.max(
            chainTimer,
            220,
          );

        addFloatingText(
          position.x,
          position.y -
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

      addFloatingText(
        position.x,
        position.y,
        shot.banked
          ? "BANK SHOT"
          : "MISS",
      );

      beep(
        shot.banked
          ? 350
          : 290,
        0.04,
        "triangle",
        0.04,
      );
    }

    flying = null;
    shots++;

    removeEmptyBottomRows();

    if (
      checkBoardClear()
    ) {
      addScore(
        350 +
          level * 50,
        width / 2,
        height * 0.35,
        "CLEAR",
      );

      addFloatingText(
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
      misses >=
      getMissThreshold()
    ) {
      createPenaltyRow();
    }

    if (
      isDangerReached()
    ) {
      onStatus?.(
        "Bubbles hit the line! Tap to retry",
      );

      alive = false;

      onGameOver(
        score,
        shots,
      );

      return;
    }

    if (
      grid.length === 0
    ) {
      levelClearTimer = 50;
    }
  }

  function shoot() {
    if (
      flying !== null ||
      !alive ||
      upgradeSelection ||
      levelClearTimer > 0
    ) {
      return;
    }

    const shot =
      shooter;

    flying = {
      x: width / 2,
      y: SHOOTER_Y,
      vx:
        Math.cos(aim) *
        SPEED,
      vy:
        Math.sin(aim) *
        SPEED,
      color: shot.color,
      kind: shot.kind,
      banked: false,
    };

    swapShotQueue();

    beep(
      shot.kind ===
        "normal"
        ? 520
        : 700,
      0.05,
      "square",
      0.05,
    );
  }

  function simulateSnapTarget(
    angle: number,
  ) {
    let x =
      width / 2;

    let y =
      SHOOTER_Y;

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

      if (x < R) {
        x = R;
        vx =
          Math.abs(vx);
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
        BOARD_TOP + R
      ) {
        return {
          row: 0,
          col: Math.max(
            0,
            Math.min(
              getRowLength(
                0,
              ) - 1,
              Math.floor(
                x /
                  (2 * R),
              ),
            ),
          ),
        };
      }

      let found = false;

      for (
        let row = 0;
        row < grid.length &&
        !found;
        row++
      ) {
        for (
          let col = 0;
          col <
            getRowLength(
              row,
            );
          col++
        ) {
          const cell =
            grid[row]?.[
              col
            ];

          if (
            cell === null ||
            cell === undefined
          ) {
            continue;
          }

          const position =
            cellPos(
              row,
              col,
            );

          if (
            Math.hypot(
              position.x - x,
              position.y - y,
            ) <
            R * 1.7
          ) {
            let bestRow =
              row;

            let bestCol =
              col;

            let bestDistance =
              Infinity;

            for (
              const [
                neighbourRow,
                neighbourCol,
              ] of neighbors(
                row,
                col,
              )
            ) {
              const neighbourCell =
                grid[
                  neighbourRow
                ]?.[
                  neighbourCol
                ];

              if (
                neighbourCell !==
                  null &&
                neighbourCell !==
                  undefined
              ) {
                continue;
              }

              const neighbourPosition =
                cellPos(
                  neighbourRow,
                  neighbourCol,
                );

              const distance =
                Math.hypot(
                  neighbourPosition.x -
                    x,
                  neighbourPosition.y -
                    y,
                );

              if (
                distance <
                bestDistance
              ) {
                bestDistance =
                  distance;

                bestRow =
                  neighbourRow;

                bestCol =
                  neighbourCol;
              }
            }

            return {
              row: bestRow,
              col: bestCol,
            };
          }
        }
      }
    }

    return {
      row: 0,
      col: Math.max(
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

  function drawTrajectory() {
    let x =
      width / 2;

    let y =
      SHOOTER_Y;

    let vx =
      Math.cos(aim);

    let vy =
      Math.sin(aim);

    const step =
      R * 0.82;

    const length =
      48 +
      previewUpgrade *
        14;

    ctx.fillStyle =
      "rgba(255,255,255,0.36)";

    for (
      let i = 0;
      i < length;
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
      }

      if (
        y <
        BOARD_TOP + R
      ) {
        break;
      }

      let blocked =
        false;

      for (
        let row = 0;
        row < grid.length &&
        !blocked;
        row++
      ) {
        for (
          let col = 0;
          col <
            getRowLength(
              row,
            );
          col++
        ) {
          const cell =
            grid[row]?.[
              col
            ];

          if (
            cell === null ||
            cell === undefined
          ) {
            continue;
          }

          const position =
            cellPos(
              row,
              col,
            );

          if (
            Math.hypot(
              position.x - x,
              position.y - y,
            ) <
            R * 1.7
          ) {
            blocked =
              true;
            break;
          }
        }
      }

      if (blocked) {
        break;
      }

      if (
        i % 2 === 0
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

    if (
      previewUpgrade > 0
    ) {
      const target =
        simulateSnapTarget(
          aim,
        );

      const position =
        cellPos(
          target.row,
          target.col,
        );

      ctx.save();

      ctx.globalAlpha =
        0.3;

      ctx.strokeStyle =
        "#ffffff";

      ctx.lineWidth = 1.5;

      ctx.beginPath();

      ctx.arc(
        position.x,
        position.y,
        R - 2,
        0,
        Math.PI * 2,
      );

      ctx.stroke();

      ctx.restore();
    }
  }

  function update(dt: number) {
    bob +=
      dt * 3.2;

    if (
      comboTimer > 0
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
      chainTimer > 0
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
      levelClearTimer > 0
    ) {
      levelClearTimer -=
        dt * 60;

      if (
        levelClearTimer <= 0
      ) {
        level++;

        buildBoard();

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
      flying !== null &&
      alive &&
      !upgradeSelection &&
      levelClearTimer <= 0
    ) {
      for (
        let step = 0;
        step < 3 &&
        flying !== null;
        step++
      ) {
        flying.x +=
          flying.vx / 3;

        flying.y +=
          flying.vy / 3;

        if (
          flying.x < R
        ) {
          flying.x = R;
          flying.vx =
            Math.abs(
              flying.vx,
            );

          flying.banked =
            true;
        } else if (
          flying.x >
          width - R
        ) {
          flying.x =
            width - R;

          flying.vx =
            -Math.abs(
              flying.vx,
            );

          flying.banked =
            true;
        }

        if (
          flying.y <
          BOARD_TOP + R
        ) {
          snap();
          break;
        }

        let hit = false;

        for (
          let row = 0;
          row < grid.length &&
          !hit;
          row++
        ) {
          for (
            let col = 0;
            col <
              getRowLength(
                row,
              );
            col++
          ) {
            const cell =
              grid[row]?.[
                col
              ];

            if (
              cell === null ||
              cell === undefined
            ) {
              continue;
            }

            const position =
              cellPos(
                row,
                col,
              );

            if (
              Math.hypot(
                position.x -
                  flying.x,
                position.y -
                  flying.y,
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
        (
          particle,
        ) => {
          particle.x +=
            particle.vx *
            dt *
            60;

          particle.y +=
            particle.vy *
            dt *
            60;

          particle.vy +=
            0.2 *
            dt *
            60;

          particle.vx *=
            0.985;

          particle.life -=
            dt * 2.2;

          return (
            particle.life >
            0
          );
        },
      );

    drops =
      drops.filter(
        (
          drop,
        ) => {
          drop.vy +=
            0.5 *
            dt *
            60;

          drop.y +=
            drop.vy *
            dt *
            60;

          drop.rotation +=
            0.08 *
            dt *
            60;

          drop.life -=
            dt * 0.45;

          return (
            drop.y <
              height +
                R &&
            drop.life >
              0
          );
        },
      );

    floatingTexts =
      floatingTexts.filter(
        (
          item,
        ) => {
          item.y -=
            0.45 *
            dt *
            60;

          item.life -=
            dt * 1.6;

          return (
            item.life >
            0
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
      kind === "bomb"
    ) {
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
        0.3,
        "#fef08a",
      );

      gradient.addColorStop(
        1,
        "#f59e0b",
      );
    }

    if (
      kind === "stone"
    ) {
      gradient.addColorStop(
        0.3,
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
          alpha * 0.8,
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

  function renderShooter() {
    const y =
      SHOOTER_Y +
      Math.sin(bob) * 1.5;

    drawBubble(
      width / 2,
      y,
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
      SHOOTER_Y - 2,
    );

    drawBubble(
      width -
        R -
        8,
      SHOOTER_Y,
      nextShot.color,
      nextShot.kind,
      R * 0.72,
    );

    if (
      shooter.kind !==
      "normal"
    ) {
      const label =
        shooter.kind ===
        "rainbow"
          ? "RAINBOW"
          : shooter.kind ===
              "bomb"
            ? "BOMB"
            : shooter.kind ===
                "lightning"
              ? "LIGHTNING"
              : "STONE";

      ctx.textAlign =
        "center";

      ctx.fillStyle =
        "#ffffff";

      ctx.font =
        "bold 9px system-ui";

      ctx.fillText(
        label,
        width / 2,
        SHOOTER_Y +
          R +
          17,
      );
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
      `Misses ${misses}/${getMissThreshold()}`,
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

      ctx.textAlign =
        "center";

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "bold 15px system-ui";

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

      ctx.lineWidth =
        1.5;

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

  function chooseUpgrades() {
    const pool: Upgrade[] =
      [
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
            "More useful next bubbles",
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
      pool.length > 0
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

    upgradeSelection =
      true;

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

    levelClearTimer = 45;

    onStatus?.(
      `Upgrade: ${upgrade.name}`,
    );

    beep(
      760,
      0.08,
      "sine",
    );
  }

  function onMove(
    event: PointerEvent,
  ) {
    const rect =
      canvas.getBoundingClientRect();

    const mouseX =
      ((event.clientX -
        rect.left) /
        rect.width) *
      width;

    const mouseY =
      ((event.clientY -
        rect.top) /
        rect.height) *
      height;

    let nextAim =
      Math.atan2(
        mouseY -
          SHOOTER_Y,
        mouseX -
          width / 2,
      );

    nextAim =
      Math.max(
        -Math.PI + 0.22,
        Math.min(
          -0.22,
          nextAim,
        ),
      );

    aim =
      nextAim;
  }

  function onDown(
    event: PointerEvent,
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

    onMove(event);
    shoot();
  }

  function onKey(
    event: KeyboardEvent,
  ) {
    const key =
      event.key.toLowerCase();

    if (
      upgradeSelection &&
      (
        key === "1" ||
        key === "2" ||
        key === "3"
      )
    ) {
      event.preventDefault();

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
      key ===
      "arrowleft"
    ) {
      aim =
        Math.max(
          -Math.PI + 0.22,
          aim - 0.06,
        );

      event.preventDefault();
      return;
    }

    if (
      key ===
      "arrowright"
    ) {
      aim =
        Math.min(
          -0.22,
          aim + 0.06,
        );

      event.preventDefault();
      return;
    }

    if (
      key === " "
    ) {
      event.preventDefault();

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

    ctx.save();

    ctx.strokeStyle =
      isDangerReached()
        ? "rgba(248,113,113,0.75)"
        : "rgba(248,113,113,0.34)";

    ctx.lineWidth =
      isDangerReached()
        ? 3
        : 2;

    ctx.setLineDash([
      10,
      8,
    ]);

    ctx.beginPath();

    ctx.moveTo(
      0,
      DANGER_Y,
    );

    ctx.lineTo(
      width,
      DANGER_Y,
    );

    ctx.stroke();

    ctx.setLineDash([]);

    ctx.restore();

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

    for (
      let row = 0;
      row <
      grid.length;
      row++
    ) {
      for (
        let col = 0;
        col <
        getRowLength(row);
        col++
      ) {
        const cell =
          grid[row]?.[col];

        if (
          cell === null ||
          cell === undefined
        ) {
          continue;
        }

        const position =
          cellPos(
            row,
            col,
          );

        drawBubble(
          position.x,
          position.y,
          cell.color,
          cell.kind,
        );
      }
    }

    for (
      const drop of drops
    ) {
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
    }

    for (
      const pop of pops
    ) {
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
          pop.life * 2.5,
        0,
        Math.PI * 2,
      );

      ctx.fill();

      ctx.restore();
    }

    if (
      alive &&
      flying === null &&
      !upgradeSelection &&
      levelClearTimer <= 0
    ) {
      drawTrajectory();
    }

    if (
      flying !== null
    ) {
      drawBubble(
        flying.x,
        flying.y,
        flying.color,
        flying.kind,
      );
    }

    for (
      const item of floatingTexts
    ) {
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

    renderShooter();
    renderHud();
    renderUpgradeSelection();

    if (
      levelClearTimer > 0 &&
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
        "Get ready...",
        width / 2,
        height / 2 + 24,
      );

      ctx.restore();
    }

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
