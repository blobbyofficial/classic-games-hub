const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const boardCanvas = document.getElementById("board");
const boardCtx = boardCanvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const messageEl = document.getElementById("message");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayButton = document.getElementById("overlayButton");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");
const difficultySelect = document.getElementById("tetrisDifficulty");
const startLevelSelect = document.getElementById("tetrisStartLevel");
const assistSelect = document.getElementById("tetrisAssist");
const applySettingsButton = document.getElementById("tetrisApplySettings");
const defaultSettingsButton = document.getElementById("tetrisDefaultSettings");

const bestKey = "classic-games-hub-tetris-best";
const settingsKey = "classic-games-hub-tetris-settings";
let bestScore = Number(localStorage.getItem(bestKey) || 0);
let board;
let current;
let nextPiece;
let score;
let lines;
let level;
let dropCounter;
let lastTime;
let animationId;
let running = false;
let paused = false;
let gameOver = false;
let currentSettings;

const shapes = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]]
};

const colors = {
  I: "#3d8df5",
  J: "#1d4ed8",
  L: "#f18f28",
  O: "#f4c542",
  S: "#2cc66d",
  T: "#a855f7",
  Z: "#ef5f63"
};

function defaultSettings() {
  return {
    difficulty: "normal",
    startLevel: "1",
    assist: "balanced"
  };
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsKey) || "null");
    return {
      ...defaultSettings(),
      ...(stored || {})
    };
  } catch (error) {
    return defaultSettings();
  }
}

function syncSettingsForm() {
  difficultySelect.value = currentSettings.difficulty;
  startLevelSelect.value = currentSettings.startLevel;
  assistSelect.value = currentSettings.assist;
}

function saveSettings() {
  currentSettings = {
    difficulty: difficultySelect.value,
    startLevel: startLevelSelect.value,
    assist: assistSelect.value
  };
  localStorage.setItem(settingsKey, JSON.stringify(currentSettings));
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const keys = Object.keys(shapes);
  const type = keys[Math.floor(Math.random() * keys.length)];
  return {
    type,
    matrix: shapes[type].map((row) => [...row]),
    x: 0,
    y: 0,
    color: colors[type]
  };
}

function showOverlay(title, text, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayButton.textContent = buttonText;
  overlay.classList.add("visible");
}

function hideOverlay() {
  overlay.classList.remove("visible");
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(bestScore);
  linesEl.textContent = String(lines);
  levelEl.textContent = String(level);
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

function resetGame() {
  board = emptyBoard();
  score = 0;
  level = Number(currentSettings.startLevel);
  lines = (level - 1) * 10;
  dropCounter = 0;
  lastTime = 0;
  paused = false;
  gameOver = false;
  running = false;
  current = randomPiece();
  nextPiece = randomPiece();
  spawnPiece();
  updateHud();
  showOverlay("Ready to Drop", "Use arrow keys to move and rotate. Space performs a hard drop.", "Start Game");
  messageEl.textContent = "Clear lines to raise the pace and pressure. Starting on level " + level + ".";
  cancelAnimationFrame(animationId);
  draw();
}

function spawnPiece() {
  current = nextPiece || randomPiece();
  nextPiece = randomPiece();
  current.x = Math.floor((COLS - current.matrix[0].length) / 2);
  current.y = 0;
  if (collides(current.matrix, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function rotate(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function collides(matrix, offsetX, offsetY) {
  return matrix.some((row, y) =>
    row.some((value, x) => {
      if (!value) {
        return false;
      }
      const boardX = x + offsetX;
      const boardY = y + offsetY;
      return boardX < 0 || boardX >= COLS || boardY >= ROWS || (boardY >= 0 && board[boardY][boardX]);
    })
  );
}

function merge() {
  current.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        board[current.y + y][current.x + x] = current.color;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;

  outer: for (let y = ROWS - 1; y >= 0; y -= 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!board[y][x]) {
        continue outer;
      }
    }

    const row = board.splice(y, 1)[0].fill(0);
    board.unshift(row);
    cleared += 1;
    y += 1;
  }

  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800][cleared] || 0;
    score += points * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    messageEl.textContent = cleared >= 4 ? "Tetris. Four lines cleared at once." : cleared + " line" + (cleared > 1 ? "s" : "") + " cleared.";
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(bestKey, String(bestScore));
      bestEl.textContent = String(bestScore);
    }
  }
}

function move(deltaX) {
  if (!running || paused || gameOver) {
    return;
  }
  if (!collides(current.matrix, current.x + deltaX, current.y)) {
    current.x += deltaX;
    draw();
  }
}

function softDrop() {
  if (!running || paused || gameOver) {
    return;
  }
  if (!collides(current.matrix, current.x, current.y + 1)) {
    current.y += 1;
    score += 1;
  } else {
    lockPiece();
  }
  updateHud();
  draw();
}

function hardDrop() {
  if (!running || paused || gameOver) {
    return;
  }
  let distance = 0;
  while (!collides(current.matrix, current.x, current.y + 1)) {
    current.y += 1;
    distance += 1;
  }
  score += distance * 2;
  lockPiece();
  updateHud();
  draw();
}

function lockPiece() {
  merge();
  clearLines();
  spawnPiece();
  updateHud();
  draw();
}

function rotateCurrent() {
  if (!running || paused || gameOver) {
    return;
  }
  const rotated = rotate(current.matrix);
  const offsets = currentSettings.assist === "forgiving" ? [0, -1, 1, -2, 2, -3, 3] : currentSettings.assist === "tight" ? [0, -1, 1] : [0, -1, 1, -2, 2];
  for (const offset of offsets) {
    if (!collides(rotated, current.x + offset, current.y)) {
      current.matrix = rotated;
      current.x += offset;
      draw();
      return;
    }
  }
}

function getDropInterval() {
  const base = {
    easy: 1120,
    normal: 1000,
    hard: 780
  };
  return Math.max(100, base[currentSettings.difficulty] - (level - 1) * 85);
}

function update(time = 0) {
  if (!running || paused || gameOver) {
    return;
  }
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (dropCounter > getDropInterval()) {
    dropCounter = 0;
    if (!collides(current.matrix, current.x, current.y + 1)) {
      current.y += 1;
    } else {
      lockPiece();
    }
  }
  draw();
  animationId = requestAnimationFrame(update);
}

function startGame() {
  if (gameOver) {
    resetGame();
  }
  running = true;
  paused = false;
  hideOverlay();
  updateHud();
  messageEl.textContent = "Game on. Keep the stack low and the well clean.";
  lastTime = performance.now();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(update);
}

function togglePause() {
  if (!running || gameOver) {
    return;
  }
  paused = !paused;
  if (paused) {
    showOverlay("Paused", "Press P or Pause to jump back in.", "Resume");
    messageEl.textContent = "The matrix is frozen.";
    cancelAnimationFrame(animationId);
  } else {
    hideOverlay();
    messageEl.textContent = "Back in motion.";
    lastTime = performance.now();
    animationId = requestAnimationFrame(update);
  }
  updateHud();
}

function endGame() {
  gameOver = true;
  running = false;
  cancelAnimationFrame(animationId);
  updateHud();
  showOverlay("Game Over", "Final score: " + score + ". Press restart or play again.", "Play Again");
  messageEl.textContent = "Stack hit the ceiling. Restart and chase a cleaner board.";
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(bestKey, String(bestScore));
    bestEl.textContent = String(bestScore);
  }
}

function drawCell(context, x, y, color, size) {
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(x * size + 1, y * size + 1, size - 2, size - 2, 8);
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.18)";
  context.fillRect(x * size + 5, y * size + 5, size - 10, 4);
}

function drawBoardGrid() {
  boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      boardCtx.fillStyle = (x + y) % 2 === 0 ? "#09111b" : "#0f1725";
      boardCtx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
      if (board[y][x]) {
        drawCell(boardCtx, x, y, board[y][x], BLOCK);
      }
    }
  }
}

function drawPiece(piece, context, size, offsetX, offsetY) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(context, x + offsetX, y + offsetY, piece.color, size);
      }
    });
  });
}

function draw() {
  drawBoardGrid();
  if (current && !gameOver) {
    drawPiece(current, boardCtx, BLOCK, current.x, current.y);
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = "#08111a";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) {
    return;
  }
  const size = 24;
  const width = nextPiece.matrix[0].length * size;
  const height = nextPiece.matrix.length * size;
  const offsetX = Math.floor((nextCanvas.width - width) / 2 / size);
  const offsetY = Math.floor((nextCanvas.height - height) / 2 / size);
  drawPiece(nextPiece, nextCtx, size, offsetX, offsetY);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowdown", "arrowup", " ", "p", "r", "x", "enter"].includes(key)) {
    event.preventDefault();
  }
  if ((key === "enter" || key === " ") && (!running || gameOver)) {
    startGame();
    return;
  }
  if (key === "p") {
    togglePause();
    return;
  }
  if (key === "r") {
    resetGame();
    return;
  }
  if (key === "arrowleft") {
    move(-1);
  }
  if (key === "arrowright") {
    move(1);
  }
  if (key === "arrowdown") {
    softDrop();
  }
  if (key === "arrowup" || key === "x") {
    rotateCurrent();
  }
  if (key === " ") {
    hardDrop();
  }
});

overlayButton.addEventListener("click", () => {
  if (paused) {
    togglePause();
  } else {
    startGame();
  }
});

pauseButton.addEventListener("click", () => {
  if (!running && !gameOver) {
    startGame();
  } else {
    togglePause();
  }
});

restartButton.addEventListener("click", resetGame);
applySettingsButton.addEventListener("click", () => {
  saveSettings();
  resetGame();
  messageEl.textContent = "Settings applied. Press start to begin the new matrix.";
});
defaultSettingsButton.addEventListener("click", () => {
  currentSettings = defaultSettings();
  syncSettingsForm();
  localStorage.setItem(settingsKey, JSON.stringify(currentSettings));
  resetGame();
  messageEl.textContent = "Default settings restored.";
});

currentSettings = loadSettings();
syncSettingsForm();
resetGame();
