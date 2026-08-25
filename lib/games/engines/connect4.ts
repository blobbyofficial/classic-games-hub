import type { GameEngineFactory } from "@/types";
import { beep, palette } from "../helpers";

const COLS = 7;
const ROWS = 6;

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

type Cell = 0 | 1 | 2;

type Difficulty =
  | "easy"
  | "normal"
  | "hard"
  | "expert";

interface FallingPiece {
  col: number;
  row: number;
  player: 1 | 2;
  y: number;
  vy: number;
}

const connect4: GameEngineFactory = ({
  canvas,
  width,
  height,
  onScore,
  onGameOver,
  onStatus,
  net,
}) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();

  const cell = Math.min(
    width / COLS,
    height / (ROWS + 1),
  );

  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const ox = (width - boardW) / 2;
  const oy =
    (height - boardH) / 2 +
    cell * 0.45;

  const radius = cell * 0.4;

  const RED = "#f87171";
  const YELLOW = pal.gold;

  const isNet = Boolean(net);
  const me: 1 | 2 =
    net?.seat === 2 ? 2 : 1;
  const foe: 1 | 2 =
    me === 1 ? 2 : 1;

  let board: Cell[][] = [];

  let wins = 0;

  let over = false;
  let busy = false;

  let hoverCol = 3;

  let winCells:
    | [number, number][]
    | null = null;

  let winPulse = 0;

  let falling:
    | FallingPiece
    | null = null;

  let raf = 0;
  let last = performance.now();

  let turn: 1 | 2 = 1;

  let difficulty: Difficulty =
    "normal";

  let difficultyMenu = false;

  let aiThinking = false;
  let aiThinkingTimer = 0;

  let streak = 0;
  let bestStreak = 0;

  let resultMessage = "";

  function createEmptyBoard(): Cell[][] {
    return Array.from(
      { length: ROWS },
      () =>
        Array<Cell>(COLS).fill(0),
    );
  }

  function turnStatus() {
    if (over) {
      return;
    }

    if (isNet) {
      if (turn === me) {
        onStatus?.(
          "Your turn - tap a column",
        );
      } else {
        onStatus?.(
          `${net!.opponentName} is thinking…`,
        );
      }

      return;
    }

    if (turn === 1) {
      onStatus?.(
        "Your turn - tap a column",
      );
    } else {
      onStatus?.(
        aiThinking
          ? "AI is thinking…"
          : "AI turn",
      );
    }
  }

  function reset() {
    board =
      createEmptyBoard();

    over = false;
    busy = false;
    falling = null;
    winCells = null;
    winPulse = 0;

    turn = 1;

    aiThinking = false;
    aiThinkingTimer = 0;

    resultMessage = "";

    if (isNet) {
      onScore(0);

      onStatus?.(
        `You are ${
          me === 1
            ? "red"
            : "yellow"
        } - ${
          turn === me
            ? "your move"
            : `${net!.opponentName} starts`
        }`,
      );

      return;
    }

    onScore(
      wins * 100,
    );

    if (
      difficultyMenu
    ) {
      onStatus?.(
        "Choose a difficulty",
      );
    } else {
      turnStatus();
    }
  }

  function cloneBoard(
    source: Cell[][],
  ): Cell[][] {
    return source.map(
      (row) => [...row],
    );
  }

  function landingRow(
    source: Cell[][],
    col: number,
  ): number {
    if (
      col < 0 ||
      col >= COLS
    ) {
      return -1;
    }

    for (
      let row = ROWS - 1;
      row >= 0;
      row--
    ) {
      if (
        source[row][col] ===
        0
      ) {
        return row;
      }
    }

    return -1;
  }

  function winningCells(
    source: Cell[][],
    player: 1 | 2,
  ): [number, number][] | null {
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
        if (
          source[row][col] !==
          player
        ) {
          continue;
        }

        for (
          const [dr, dc] of DIRS
        ) {
          const line: [
            number,
            number,
          ][] = [[row, col]];

          for (
            let k = 1;
            k < 4;
            k++
          ) {
            const nr =
              row + dr * k;
            const nc =
              col + dc * k;

            if (
              nr < 0 ||
              nr >= ROWS ||
              nc < 0 ||
              nc >= COLS ||
              source[nr][nc] !==
                player
            ) {
              break;
            }

            line.push([
              nr,
              nc,
            ]);
          }

          if (
            line.length ===
            4
          ) {
            return line;
          }
        }
      }
    }

    return null;
  }

  function isFull(
    source: Cell[][],
  ): boolean {
    return source[0].every(
      (value) => value !== 0,
    );
  }

  function place(
    source: Cell[][],
    col: number,
    player: 1 | 2,
  ): Cell[][] {
    const row =
      landingRow(
        source,
        col,
      );

    if (row < 0) {
      return cloneBoard(
        source,
      );
    }

    const next =
      cloneBoard(source);

    next[row][col] =
      player;

    return next;
  }

  function countDirection(
    source: Cell[][],
    row: number,
    col: number,
    dr: number,
    dc: number,
    player: 1 | 2,
  ) {
    let count = 0;

    let r = row + dr;
    let c = col + dc;

    while (
      r >= 0 &&
      r < ROWS &&
      c >= 0 &&
      c < COLS &&
      source[r][c] === player
    ) {
      count++;
      r += dr;
      c += dc;
    }

    return count;
  }

  function createsFour(
    source: Cell[][],
    col: number,
    player: 1 | 2,
  ) {
    const next =
      place(
        source,
        col,
        player,
      );

    return Boolean(
      winningCells(
        next,
        player,
      ),
    );
  }

  function getImmediateWins(
    source: Cell[][],
    player: 1 | 2,
  ): number[] {
    const moves: number[] =
      [];

    for (
      let col = 0;
      col < COLS;
      col++
    ) {
      if (
        landingRow(
          source,
          col,
        ) < 0
      ) {
        continue;
      }

      if (
        createsFour(
          source,
          col,
          player,
        )
      ) {
        moves.push(col);
      }
    }

    return moves;
  }

  function countThreats(
    source: Cell[][],
    player: 1 | 2,
  ) {
    return getImmediateWins(
      source,
      player,
    ).length;
  }

  function centerScore(
    source: Cell[][],
    player: 1 | 2,
  ) {
    let score = 0;

    for (
      let row = 0;
      row < ROWS;
      row++
    ) {
      if (
        source[row][3] ===
        player
      ) {
        score += 7;
      }
    }

    return score;
  }

  function evaluateWindow(
    cells: Cell[],
  ) {
    let ai = 0;
    let human = 0;
    let empty = 0;

    for (
      const value of cells
    ) {
      if (value === 2) {
        ai++;
      } else if (
        value === 1
      ) {
        human++;
      } else {
        empty++;
      }
    }

    if (
      ai > 0 &&
      human > 0
    ) {
      return 0;
    }

    if (ai === 4) {
      return 10000;
    }

    if (human === 4) {
      return -10000;
    }

    if (
      ai === 3 &&
      empty === 1
    ) {
      return 80;
    }

    if (
      ai === 2 &&
      empty === 2
    ) {
      return 18;
    }

    if (
      human === 3 &&
      empty === 1
    ) {
      return -100;
    }

    if (
      human === 2 &&
      empty === 2
    ) {
      return -18;
    }

    return 0;
  }

  function evaluate(
    source: Cell[][],
  ): number {
    let score = 0;

    score +=
      centerScore(
        source,
        2,
      );

    score -=
      centerScore(
        source,
        1,
      );

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
        for (
          const [dr, dc] of DIRS
        ) {
          const endRow =
            row + dr * 3;

          const endCol =
            col + dc * 3;

          if (
            endRow < 0 ||
            endRow >=
              ROWS ||
            endCol < 0 ||
            endCol >=
              COLS
          ) {
            continue;
          }

          const cells: Cell[] =
            [];

          for (
            let k = 0;
            k < 4;
            k++
          ) {
            cells.push(
              source[
                row + dr * k
              ][
                col + dc * k
              ],
            );
          }

          score +=
            evaluateWindow(
              cells,
            );
        }
      }
    }

    // Strong tactical awareness.
    const aiThreats =
      countThreats(
        source,
        2,
      );

    const humanThreats =
      countThreats(
        source,
        1,
      );

    score +=
      aiThreats * 150;

    score -=
      humanThreats * 190;

    // A double threat is extremely strong.
    if (
      aiThreats >= 2
    ) {
      score += 900;
    }

    if (
      humanThreats >= 2
    ) {
      score -= 1100;
    }

    return score;
  }

  function getSearchDepth(): number {
    switch (
      difficulty
    ) {
      case "easy":
        return 2;

      case "normal":
        return 4;

      case "hard":
        return 5;

      case "expert":
        return 6;

      default:
        return 4;
    }
  }

  function minimax(
    source: Cell[][],
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
  ): number {
    if (
      winningCells(
        source,
        2,
      )
    ) {
      return (
        1000000 +
        depth * 100
      );
    }

    if (
      winningCells(
        source,
        1,
      )
    ) {
      return (
        -1000000 -
        depth * 100
      );
    }

    if (
      depth <= 0 ||
      isFull(source)
    ) {
      return evaluate(
        source,
      );
    }

    const columns = [
      3,
      2,
      4,
      1,
      5,
      0,
      6,
    ].filter(
      (col) =>
        landingRow(
          source,
          col,
        ) >= 0,
    );

    if (
      columns.length ===
      0
    ) {
      return 0;
    }

    if (maximizing) {
      let value =
        -Infinity;

      for (
        const col of columns
      ) {
        const child =
          place(
            source,
            col,
            2,
          );

        value = Math.max(
          value,
          minimax(
            child,
            depth - 1,
            alpha,
            beta,
            false,
          ),
        );

        alpha = Math.max(
          alpha,
          value,
        );

        if (
          alpha >= beta
        ) {
          break;
        }
      }

      return value;
    }

    let value =
      Infinity;

    for (
      const col of columns
    ) {
      const child =
        place(
          source,
          col,
          1,
        );

      value = Math.min(
        value,
        minimax(
          child,
          depth - 1,
          alpha,
          beta,
          true,
        ),
      );

      beta = Math.min(
        beta,
        value,
      );

      if (
        alpha >= beta
      ) {
        break;
      }
    }

    return value;
  }

  function orderMoves(
    source: Cell[][],
    player: 1 | 2,
  ): number[] {
    const columns = [
      3,
      2,
      4,
      1,
      5,
      0,
      6,
    ].filter(
      (col) =>
        landingRow(
          source,
          col,
        ) >= 0,
    );

    const scored = columns.map(
      (col) => {
        const next =
          place(
            source,
            col,
            player,
          );

        let score =
          0;

        if (
          winningCells(
            next,
            player,
          )
        ) {
          score +=
            100000;
        }

        score +=
          centerScore(
            next,
            player,
          ) * 10;

        score +=
          countThreats(
            next,
            player,
          ) * 250;

        score +=
          col === 3
            ? 50
            : 0;

        return {
          col,
          score,
        };
      },
    );

    scored.sort(
      (a, b) =>
        b.score -
        a.score,
    );

    return scored.map(
      (item) => item.col,
    );
  }

  function bestAiCol(): number {
    const columns =
      orderMoves(
        board,
        2,
      );

    if (
      columns.length ===
      0
    ) {
      return 3;
    }

    // Easy AI intentionally makes occasional
    // non-optimal choices while preserving
    // competent-looking play.
    if (
      difficulty ===
        "easy" &&
      Math.random() <
        0.28
    ) {
      const candidates =
        columns.slice(
          0,
          Math.min(
            3,
            columns.length,
          ),
        );

      return candidates[
        Math.floor(
          Math.random() *
            candidates.length,
        )
      ];
    }

    // Always take immediate wins.
    const winning =
      getImmediateWins(
        board,
        2,
      );

    if (
      winning.length > 0
    ) {
      return winning[
        0
      ];
    }

    // Always block immediate losses.
    const opponentWins =
      getImmediateWins(
        board,
        1,
      );

    if (
      opponentWins.length >
      0
    ) {
      return opponentWins[
        0
      ];
    }

    const depth =
      getSearchDepth();

    let bestCol =
      columns[0];

    let bestValue =
      -Infinity;

    for (
      const col of columns
    ) {
      const child =
        place(
          board,
          col,
          2,
        );

      let value =
        minimax(
          child,
          depth - 1,
          -Infinity,
          Infinity,
          false,
        );

      // Personality adjustments.
      if (
        difficulty ===
        "hard"
      ) {
        value +=
          countThreats(
            child,
            2,
          ) * 30;
      }

      if (
        difficulty ===
        "expert"
      ) {
        value +=
          countThreats(
            child,
            2,
          ) * 80;

        value +=
          centerScore(
            child,
            2,
          ) * 5;
      }

      if (
        value > bestValue
      ) {
        bestValue =
          value;

        bestCol =
          col;
      }
    }

    return bestCol;
  }

  function startDrop(
    col: number,
    player: 1 | 2,
  ) {
    const row =
      landingRow(
        board,
        col,
      );

    if (row < 0) {
      return;
    }

    busy = true;

    falling = {
      col,
      row,
      player,
      y: oy - cell,
      vy: 0,
    };

    beep(
      player === 1
        ? 520
        : 360,
      0.04,
    );
  }

  function hasDoubleThreat(
    source: Cell[][],
    player: 1 | 2,
  ) {
    return (
      getImmediateWins(
        source,
        player,
      ).length >= 2
    );
  }

  function describeMove(
    col: number,
    player: 1 | 2,
  ) {
    const next =
      place(
        board,
        col,
        player,
      );

    const ownThreats =
      countThreats(
        next,
        player,
      );

    const double =
      hasDoubleThreat(
        next,
        player,
      );

    if (
      winningCells(
        next,
        player,
      )
    ) {
      return "FOUR IN A ROW!";
    }

    if (double) {
      return "DOUBLE THREAT!";
    }

    if (
      ownThreats >= 1
    ) {
      return "THREAT CREATED";
    }

    return "";
  }

  function finishWin(
    player: 1 | 2,
    cells: [
      number,
      number,
    ][],
  ) {
    winCells = cells;
    over = true;
    busy = false;
    aiThinking = false;

    const playerWon =
      player === me;

    if (isNet) {
      const won =
        player === me;

      resultMessage =
        won
          ? "YOU WIN!"
          : `${net!.opponentName} WINS`;

      onStatus?.(
        won
          ? "Four in a row - you win! 🎉"
          : `${net!.opponentName} got four`,
      );

      net!.onResult(
        won
          ? "win"
          : "loss",
      );

      onGameOver(
        won ? 100 : 0,
        0,
      );
    } else {
      if (
        playerWon
      ) {
        wins++;
        streak++;
        bestStreak =
          Math.max(
            bestStreak,
            streak,
          );

        const streakBonus =
          Math.max(
            0,
            streak - 1,
          ) * 50;

        onScore(
          wins * 100 +
            streakBonus,
        );

        resultMessage =
          "YOU WIN!";

        onStatus?.(
          streak >= 2
            ? `Four in a row! ${streak} WIN STREAK 🎉`
            : "Four in a row! 🎉",
        );

        onGameOver(
          wins * 100 +
            streakBonus,
          streak,
        );

        beep(
          660,
          0.08,
        );

        setTimeout(
          () =>
            beep(
              880,
              0.12,
            ),
          90,
        );
      } else {
        streak = 0;

        onScore(
          wins * 100,
        );

        resultMessage =
          "AI WINS";

        onStatus?.(
          "AI got four - tap to retry",
        );

        onGameOver(
          0,
          0,
        );

        beep(
          150,
          0.25,
          "sawtooth",
        );
      }
    }
  }

  function land() {
    if (
      falling === null
    ) {
      return;
    }

    const {
      col,
      row,
      player,
    } = falling;

    board[row][col] =
      player;

    falling = null;

    const win =
      winningCells(
        board,
        player,
      );

    if (win) {
      finishWin(
        player,
        win,
      );

      return;
    }

    if (
      isFull(board)
    ) {
      over = true;
      busy = false;

      resultMessage =
        "DRAW";

      if (isNet) {
        onStatus?.(
          "Board full - draw",
        );

        net!.onResult(
          "draw",
        );

        onGameOver(
          40,
          0,
        );
      } else {
        streak = 0;

        onStatus?.(
          "Board full - draw. Tap to retry",
        );

        onGameOver(
          20,
          0,
        );
      }

      return;
    }

    if (isNet) {
      turn =
        player === 1
          ? 2
          : 1;

      busy = false;
      turnStatus();

      return;
    }

    if (player === 1) {
      turn = 2;

      aiThinking = true;
      aiThinkingTimer =
        280 +
        Math.random() *
          280;

      turnStatus();

      setTimeout(
        () => {
          if (
            over ||
            !aiThinking
          ) {
            return;
          }

          const col =
            bestAiCol();

          aiThinking =
            false;

          startDrop(
            col,
            2,
          );
        },
        aiThinkingTimer,
      );
    } else {
      turn = 1;
      busy = false;
      turnStatus();
    }
  }

  function discCenter(
    row: number,
    col: number,
  ) {
    return {
      x:
        ox +
        col * cell +
        cell / 2,
      y:
        oy +
        row * cell +
        cell / 2,
    };
  }

  function roundRectPath(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x + radius,
      y,
    );

    ctx.arcTo(
      x + w,
      y,
      x + w,
      y + h,
      radius,
    );

    ctx.arcTo(
      x + w,
      y + h,
      x,
      y + h,
      radius,
    );

    ctx.arcTo(
      x,
      y + h,
      x,
      y,
      radius,
    );

    ctx.arcTo(
      x,
      y,
      x + w,
      y,
      radius,
    );

    ctx.closePath();
  }

  function drawDisc(
    x: number,
    y: number,
    player: 1 | 2,
    alpha = 1,
  ) {
    const color =
      player === 1
        ? RED
        : YELLOW;

    ctx.save();

    ctx.globalAlpha =
      alpha;

    ctx.fillStyle =
      color;

    ctx.shadowColor =
      color;

    ctx.shadowBlur = 8;

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle =
      "rgba(255,255,255,0.28)";

    ctx.beginPath();

    ctx.arc(
      x -
        radius *
          0.3,
      y -
        radius *
          0.3,
      radius *
        0.22,
      0,
      Math.PI * 2,
    );

    ctx.fill();

    ctx.restore();
  }

  function renderDifficultyMenu() {
    if (
      !difficultyMenu
    ) {
      return;
    }

    ctx.save();

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
      "bold 24px system-ui";

    ctx.fillText(
      "CHOOSE DIFFICULTY",
      width / 2,
      62,
    );

    const options: {
      id: Difficulty;
      name: string;
      description: string;
    }[] = [
      {
        id: "easy",
        name: "EASY",
        description:
          "Relaxed opponent",
      },
      {
        id: "normal",
        name: "NORMAL",
        description:
          "Balanced challenge",
      },
      {
        id: "hard",
        name: "HARD",
        description:
          "Strong tactical play",
      },
      {
        id: "expert",
        name: "EXPERT",
        description:
          "Very difficult",
      },
    ];

    const cardWidth =
      Math.min(
        150,
        width * 0.21,
      );

    const gap = 10;

    const totalWidth =
      cardWidth * 4 +
      gap * 3;

    const startX =
      width / 2 -
      totalWidth / 2;

    for (
      let i = 0;
      i < options.length;
      i++
    ) {
      const option =
        options[i];

      const x =
        startX +
        i *
          (cardWidth +
            gap);

      const y =
        height / 2 -
        58;

      const selected =
        difficulty ===
        option.id;

      ctx.strokeStyle =
        selected
          ? pal.gold
          : pal.neon;

      ctx.lineWidth =
        selected
          ? 2
          : 1.2;

      ctx.strokeRect(
        x,
        y,
        cardWidth,
        116,
      );

      ctx.fillStyle =
        pal.gold;

      ctx.font =
        "bold 13px system-ui";

      ctx.fillText(
        `${i + 1}`,
        x +
          cardWidth / 2,
        y + 24,
      );

      ctx.fillStyle =
        pal.neon;

      ctx.font =
        "bold 11px system-ui";

      ctx.fillText(
        option.name,
        x +
          cardWidth / 2,
        y + 50,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "10px system-ui";

      ctx.fillText(
        option.description,
        x +
          cardWidth / 2,
        y + 77,
      );
    }

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "12px system-ui";

    ctx.fillText(
      "Press 1-4 or tap a difficulty",
      width / 2,
      height - 24,
    );

    ctx.restore();
  }

  function chooseDifficulty(
    value: Difficulty,
  ) {
    difficulty =
      value;

    difficultyMenu =
      false;

    reset();

    onStatus?.(
      `${value[0].toUpperCase()}${value.slice(
        1,
      )} difficulty`,
    );
  }

  function onDifficultyPointer(
    event: PointerEvent,
  ) {
    if (
      !difficultyMenu
    ) {
      return false;
    }

    const rect =
      canvas.getBoundingClientRect();

    const mx =
      ((event.clientX -
        rect.left) /
        rect.width) *
      width;

    const my =
      ((event.clientY -
        rect.top) /
        rect.height) *
      height;

    const options: Difficulty[] =
      [
        "easy",
        "normal",
        "hard",
        "expert",
      ];

    const cardWidth =
      Math.min(
        150,
        width * 0.21,
      );

    const gap = 10;

    const totalWidth =
      cardWidth * 4 +
      gap * 3;

    const startX =
      width / 2 -
      totalWidth / 2;

    const y =
      height / 2 -
      58;

    if (
      my < y ||
      my >
        y + 116
    ) {
      return true;
    }

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const x =
        startX +
        i *
          (cardWidth +
            gap);

      if (
        mx >= x &&
        mx <=
          x +
            cardWidth
      ) {
        chooseDifficulty(
          options[i],
        );

        return true;
      }
    }

    return true;
  }

  function render(
    now: number,
  ) {
    const dt =
      Math.min(
        0.05,
        (now - last) /
          1000,
      );

    last = now;

    if (
      falling !== null
    ) {
      falling.vy +=
        2600 * dt;

      falling.y +=
        falling.vy * dt;

      const targetY =
        oy +
        falling.row *
          cell +
        cell / 2;

      if (
        falling.y >=
        targetY
      ) {
        falling.y =
          targetY;

        land();
      }
    }

    winPulse =
      (winPulse +
        dt * 3) %
      (Math.PI * 2);

    ctx.clearRect(
      0,
      0,
      width,
      height,
    );

    ctx.fillStyle =
      pal.bg;

    ctx.fillRect(
      0,
      0,
      width,
      height,
    );

    // Background dots.
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
          level * 7) %
        height;

      ctx.fillRect(
        x,
        y,
        1,
        1,
      );
    }

    ctx.restore();

    if (
      !over &&
      !busy &&
      !difficultyMenu &&
      (
        isNet
          ? turn === me
          : turn === 1
      ) &&
      landingRow(
        board,
        hoverCol,
      ) >= 0
    ) {
      const center =
        discCenter(
          0,
          hoverCol,
        );

      drawDisc(
        center.x,
        oy -
          cell / 2,
        me === 2
          ? 2
          : 1,
        0.4,
      );
    }

    // Board body.
    ctx.fillStyle =
      "#3730a3";

    roundRectPath(
      ox - 7,
      oy - 7,
      boardW + 14,
      boardH + 14,
      16,
    );

    ctx.fill();

    // Board holes / pieces.
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
        const center =
          discCenter(
            row,
            col,
          );

        const value =
          board[row][col];

        ctx.beginPath();

        ctx.arc(
          center.x,
          center.y,
          radius,
          0,
          Math.PI * 2,
        );

        ctx.fillStyle =
          value === 0
            ? pal.bg
            : value === 1
              ? RED
              : YELLOW;

        ctx.fill();

        if (
          value !== 0 &&
          winCells?.some(
            ([winRow, winCol]) =>
              winRow === row &&
              winCol === col,
          )
        ) {
          ctx.save();

          ctx.lineWidth = 4;

          ctx.strokeStyle =
            "#ffffff";

          ctx.globalAlpha =
            0.5 +
            0.5 *
              Math.sin(
                winPulse,
              );

          ctx.beginPath();

          ctx.arc(
            center.x,
            center.y,
            radius + 2,
            0,
            Math.PI * 2,
          );

          ctx.stroke();

          ctx.restore();
        }
      }
    }

    if (
      falling !== null
    ) {
      const centerX =
        ox +
        falling.col *
          cell +
        cell / 2;

      drawDisc(
        centerX,
        falling.y,
        falling.player,
      );
    }

    // Top labels.
    ctx.save();

    ctx.fillStyle =
      pal.muted;

    ctx.font =
      "11px system-ui";

    ctx.textAlign =
      "left";

    if (!isNet) {
      ctx.fillText(
        difficulty.toUpperCase(),
        12,
        20,
      );
    }

    ctx.textAlign =
      "right";

    ctx.fillText(
      `STREAK ${streak}`,
      width - 12,
      20,
    );

    ctx.restore();

    if (
      aiThinking &&
      !over
    ) {
      ctx.save();

      ctx.textAlign =
        "center";

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "11px system-ui";

      ctx.fillText(
        "AI IS THINKING…",
        width / 2,
        height - 14,
      );

      ctx.restore();
    }

    if (
      over
    ) {
      ctx.save();

      ctx.fillStyle =
        "rgba(0,0,0,0.54)";

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );

      ctx.textAlign =
        "center";

      ctx.fillStyle =
        resultMessage ===
        "YOU WIN!"
          ? pal.gold
          : pal.neon;

      ctx.font =
        "bold 28px system-ui";

      ctx.fillText(
        resultMessage,
        width / 2,
        height / 2 -
          34,
      );

      ctx.fillStyle =
        pal.muted;

      ctx.font =
        "14px system-ui";

      if (
        !isNet &&
        resultMessage ===
          "YOU WIN!"
      ) {
        ctx.fillText(
          `Win streak: ${streak}`,
          width / 2,
          height / 2,
        );

        if (
          streak > 1
        ) {
          ctx.fillText(
            `Best streak: ${bestStreak}`,
            width / 2,
            height / 2 + 24,
          );
        }

        ctx.fillStyle =
          pal.neon;

        ctx.font =
          "12px system-ui";

        ctx.fillText(
          "Tap to play again",
          width / 2,
          height / 2 +
            (streak > 1
              ? 60
              : 36),
        );
      } else if (
        !isNet
      ) {
        ctx.fillText(
          resultMessage ===
            "DRAW"
            ? "Nobody could break through."
            : "Tap to retry",
          width / 2,
          height / 2 + 4,
        );

        ctx.fillStyle =
          pal.neon;

        ctx.font =
          "12px system-ui";

        ctx.fillText(
          "Tap to play again",
          width / 2,
          height / 2 + 36,
        );
      }
      
      ctx.restore();
    }

    renderDifficultyMenu();

    raf =
      requestAnimationFrame(
        render,
      );
  }

  function colAt(
    event: PointerEvent,
  ) {
    const rect =
      canvas.getBoundingClientRect();

    const mx =
      ((event.clientX -
        rect.left) /
        rect.width) *
      width -
      ox;

    return Math.max(
      0,
      Math.min(
        COLS - 1,
        Math.floor(
          mx / cell,
        ),
      ),
    );
  }

  const onDown = (
    event: PointerEvent,
  ) => {
    if (
      onDifficultyPointer(
        event,
      )
    ) {
      return;
    }

    if (isNet) {
      if (
        over ||
        busy ||
        turn !== me
      ) {
        return;
      }

      const col =
        colAt(event);

      if (
        landingRow(
          board,
          col,
        ) < 0
      ) {
        return;
      }

      startDrop(
        col,
        me,
      );

      net!.send({
        i: col,
      });

      return;
    }

    if (
      over
    ) {
      reset();
      return;
    }

    if (
      busy ||
      aiThinking ||
      turn !== 1
    ) {
      return;
    }

    const col =
      colAt(event);

    if (
      landingRow(
        board,
        col,
      ) < 0
    ) {
      return;
    }

    const message =
      describeMove(
        col,
        1,
      );

    startDrop(
      col,
      1,
    );

    if (
      message &&
      message !==
        "FOUR IN A ROW!"
    ) {
      setTimeout(
        () =>
          onStatus?.(
            message,
          ),
        250,
      );
    }
  };

  const onMove = (
    event: PointerEvent,
  ) => {
    hoverCol =
      colAt(event);
  };

  const onKey = (
    event: KeyboardEvent,
  ) => {
    const key =
      event.key.toLowerCase();

    if (
      !isNet &&
      difficultyMenu &&
      (
        key === "1" ||
        key === "2" ||
        key === "3" ||
        key === "4"
      )
    ) {
      event.preventDefault();

      const choices: Difficulty[] =
        [
          "easy",
          "normal",
          "hard",
          "expert",
        ];

      chooseDifficulty(
        choices[
          Number(key) - 1
        ],
      );

      return;
    }

    if (
      key === "r" &&
      !isNet
    ) {
      reset();
      return;
    }

    if (
      key === "d" &&
      !isNet &&
      !over
    ) {
      difficultyMenu =
        !difficultyMenu;

      if (
        difficultyMenu
      ) {
        onStatus?.(
          "Choose a difficulty",
        );
      } else {
        turnStatus();
      }

      return;
    }

    if (
      key ===
      "arrowleft"
    ) {
      hoverCol =
        Math.max(
          0,
          hoverCol - 1,
        );

      event.preventDefault();
      return;
    }

    if (
      key ===
      "arrowright"
    ) {
      hoverCol =
        Math.min(
          COLS - 1,
          hoverCol + 1,
        );

      event.preventDefault();
      return;
    }

    if (
      key === " " ||
      key === "enter"
    ) {
      event.preventDefault();

      if (
        difficultyMenu
      ) {
        return;
      }

      if (
        over &&
        !isNet
      ) {
        reset();
        return;
      }

      if (
        !isNet &&
        !busy &&
        !aiThinking &&
        !over &&
        turn === 1 &&
        landingRow(
          board,
          hoverCol,
        ) >= 0
      ) {
        startDrop(
          hoverCol,
          1,
        );
      }
    }
  };

  canvas.addEventListener(
    "pointerdown",
    onDown,
  );

  canvas.addEventListener(
    "pointermove",
    onMove,
  );

  window.addEventListener(
    "keydown",
    onKey,
  );

  reset();

  raf =
    requestAnimationFrame(
      render,
    );

  return {
    pause: () => {
      cancelAnimationFrame(
        raf,
      );
    },

    resume: () => {
      last =
        performance.now();

      raf =
        requestAnimationFrame(
          render,
        );
    },

    restart: () => {
      wins = 0;
      streak = 0;
      difficultyMenu =
        false;

      reset();
    },

    applyRemoteMove: ({
      i,
    }: {
      i: number;
    }) => {
      if (
        !isNet ||
        over ||
        busy ||
        turn !== foe
      ) {
        return;
      }

      if (
        i < 0 ||
        i >= COLS ||
        landingRow(
          board,
          i,
        ) < 0
      ) {
        return;
      }

      startDrop(
        i,
        foe,
      );
    },

    destroy: () => {
      cancelAnimationFrame(
        raf,
      );

      canvas.removeEventListener(
        "pointerdown",
        onDown,
      );

      canvas.removeEventListener(
        "pointermove",
        onMove,
      );

      window.removeEventListener(
        "keydown",
        onKey,
      );
    },
  };
};

export default connect4;
