const boardSize = 20;
const tileSize = 25;
const tickMs = 130;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const lengthEl = document.getElementById("length");
const stateEl = document.getElementById("state");
const messageEl = document.getElementById("message");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayButton = document.getElementById("overlayButton");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");
const difficultySelect = document.getElementById("snakeDifficulty");
const paceSelect = document.getElementById("snakePace");
const wallsSelect = document.getElementById("snakeWalls");
const applySettingsButton = document.getElementById("snakeApplySettings");
const defaultSettingsButton = document.getElementById("snakeDefaultSettings");

const bestKey = "classic-games-hub-snake-best";
const settingsKey = "classic-games-hub-snake-settings";
let bestScore = Number(localStorage.getItem(bestKey) || 0);
let snake;
let direction;
let nextDirection;
let food;
let score;
let loopId = null;
let started = false;
let paused = false;
let gameOver = false;
let currentSettings;

bestEl.textContent = String(bestScore);

function defaultSettings() {
  return {
    difficulty: "normal",
    pace: "classic",
    walls: "wrap"
  };
}

function tickDelay() {
  const difficultyBase = {
    easy: 160,
    normal: 130,
    hard: 95
  };
  const paceScale = {
    relaxed: 1.15,
    classic: 1,
    turbo: 0.82
  };
  return Math.round(difficultyBase[currentSettings.difficulty] * paceScale[currentSettings.pace]);
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
  paceSelect.value = currentSettings.pace;
  wallsSelect.value = currentSettings.walls;
}

function saveSettings() {
  currentSettings = {
    difficulty: difficultySelect.value,
    pace: paceSelect.value,
    walls: wallsSelect.value
  };
  localStorage.setItem(settingsKey, JSON.stringify(currentSettings));
}

function randomEmptyCell() {
  while (true) {
    const cell = {
      x: Math.floor(Math.random() * boardSize),
      y: Math.floor(Math.random() * boardSize)
    };
    if (!snake.some((part) => part.x === cell.x && part.y === cell.y)) {
      return cell;
    }
  }
}

function stopLoop() {
  if (loopId !== null) {
    clearInterval(loopId);
    loopId = null;
  }
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
  lengthEl.textContent = String(snake.length);
  stateEl.textContent = gameOver ? "Game Over" : paused ? "Paused" : started ? "Running" : "Ready";
  pauseButton.textContent = paused ? "Resume" : "Pause";
}

function startLoop() {
  stopLoop();
  loopId = setInterval(step, tickDelay());
}

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  food = randomEmptyCell();
  score = 0;
  started = false;
  paused = false;
  gameOver = false;
  updateHud();
  showOverlay("Press Start", "Use arrow keys or the touch pad. Avoid your own tail.", "Start Game");
  messageEl.textContent = "Collect the glowing fruit to build your score. " + (currentSettings.walls === "solid" ? "Walls are live." : "Walls wrap.");
  draw();
  stopLoop();
}

function beginGame() {
  if (gameOver) {
    resetGame();
  }
  started = true;
  paused = false;
  hideOverlay();
  updateHud();
  startLoop();
  messageEl.textContent = "Nice. Keep the center open so you can bail out of tight turns.";
}

function pauseGame() {
  if (!started || gameOver) {
    return;
  }
  paused = !paused;
  if (paused) {
    stopLoop();
    showOverlay("Paused", "Press P, Pause, or Resume to continue.", "Resume");
    messageEl.textContent = "The board is frozen while you plan the next route.";
  } else {
    hideOverlay();
    startLoop();
    messageEl.textContent = "Back in motion.";
  }
  updateHud();
}

function queueDirection(next) {
  const opposite = next.x === -direction.x && next.y === -direction.y;
  if (!opposite) {
    nextDirection = next;
  }
  if (!started && !gameOver) {
    beginGame();
  }
}

function endGame() {
  gameOver = true;
  stopLoop();
  updateHud();
  draw();
  messageEl.textContent = "Game over. Restart and try a cleaner route.";
  showOverlay("Game Over", "Final score: " + score + ". Press restart or play again.", "Play Again");
}

function step() {
  if (paused || gameOver) {
    return;
  }

  direction = nextDirection;
  const rawHead = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };
  if (
    currentSettings.walls === "solid" &&
    (rawHead.x < 0 || rawHead.x >= boardSize || rawHead.y < 0 || rawHead.y >= boardSize)
  ) {
    endGame();
    return;
  }
  const head = {
    x: (rawHead.x + boardSize) % boardSize,
    y: (rawHead.y + boardSize) % boardSize
  };

  if (snake.some((part) => part.x === head.x && part.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    food = randomEmptyCell();
    messageEl.textContent = "Fruit collected. The safe path just got smaller.";
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(bestKey, String(bestScore));
      bestEl.textContent = String(bestScore);
    }
  } else {
    snake.pop();
  }

  updateHud();
  draw();
}

function drawCell(x, y, color, radius) {
  const px = x * tileSize;
  const py = y * tileSize;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(px + 1, py + 1, tileSize - 2, tileSize - 2, radius);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#09121d" : "#0c1725";
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  drawCell(food.x, food.y, "#ff8d43", 12);
  snake.forEach((part, index) => {
    drawCell(part.x, part.y, index === 0 ? "#66ec8e" : "#24b25b", 8);
  });

  const eyeOffset = 6;
  const head = snake[0];
  ctx.fillStyle = "#061019";
  ctx.beginPath();
  ctx.arc(head.x * tileSize + tileSize / 2 - eyeOffset, head.y * tileSize + tileSize / 2 - 2, 2.5, 0, Math.PI * 2);
  ctx.arc(head.x * tileSize + tileSize / 2 + eyeOffset, head.y * tileSize + tileSize / 2 - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter"].includes(key)) {
    event.preventDefault();
  }
  if (key === "arrowup" || key === "w") {
    queueDirection({ x: 0, y: -1 });
  }
  if (key === "arrowdown" || key === "s") {
    queueDirection({ x: 0, y: 1 });
  }
  if (key === "arrowleft" || key === "a") {
    queueDirection({ x: -1, y: 0 });
  }
  if (key === "arrowright" || key === "d") {
    queueDirection({ x: 1, y: 0 });
  }
  if (key === "p") {
    pauseGame();
  }
  if (key === "r") {
    resetGame();
  }
  if (key === "enter" || key === " ") {
    if (!started || gameOver) {
      beginGame();
    } else if (paused) {
      pauseGame();
    }
  }
});

overlayButton.addEventListener("click", () => {
  if (paused) {
    pauseGame();
  } else {
    beginGame();
  }
});
pauseButton.addEventListener("click", pauseGame);
restartButton.addEventListener("click", resetGame);
applySettingsButton.addEventListener("click", () => {
  saveSettings();
  resetGame();
  messageEl.textContent = "Settings applied. Press start for a fresh run.";
});
defaultSettingsButton.addEventListener("click", () => {
  currentSettings = defaultSettings();
  syncSettingsForm();
  localStorage.setItem(settingsKey, JSON.stringify(currentSettings));
  resetGame();
  messageEl.textContent = "Default settings restored.";
});

document.querySelectorAll("[data-dir]").forEach((button) => {
  button.addEventListener("click", () => {
    const mapping = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    queueDirection(mapping[button.dataset.dir]);
  });
});

currentSettings = loadSettings();
syncSettingsForm();
resetGame();
