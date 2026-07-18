import type { GameEngineFactory } from "@/types";
import { beep, clamp, createLoop, palette, roundRect } from "../helpers";

const pong: GameEngineFactory = ({ canvas, width, height, onScore, onGameOver, onStatus }) => {
  const ctx = canvas.getContext("2d")!;
  const pal = palette();
  const pw = 12;
  const ph = height * 0.18;
  let playerY = height / 2 - ph / 2;
  let aiY = playerY;
  let ball = { x: width / 2, y: height / 2, vx: 5, vy: 2 };
  let playerScore = 0;
  let aiScore = 0;
  let alive = true;
  let upHeld = false;
  let downHeld = false;

  function serve(dir: number) {
    ball = { x: width / 2, y: height / 2, vx: dir * 5, vy: (Math.random() - 0.5) * 5 };
  }

  function reset() {
    playerScore = 0;
    aiScore = 0;
    alive = true;
    onScore(0);
    onStatus?.("First to 7 wins");
    serve(1);
  }

  function update() {
    if (!alive) return;
    if (upHeld) playerY -= 7;
    if (downHeld) playerY += 7;
    playerY = clamp(playerY, 0, height - ph);

    // AI easing toward ball
    const target = ball.y - ph / 2;
    aiY += clamp(target - aiY, -5.5, 5.5);
    aiY = clamp(aiY, 0, height - ph);

    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.y < 6 || ball.y > height - 6) {
      ball.vy *= -1;
      beep(280, 0.03);
    }

    // player paddle
    if (ball.x - 6 < pw + 10 && ball.y > playerY && ball.y < playerY + ph && ball.vx < 0) {
      ball.vx = Math.abs(ball.vx) * 1.05;
      ball.vy += ((ball.y - (playerY + ph / 2)) / ph) * 6;
      beep(440, 0.04);
    }
    // ai paddle
    if (ball.x + 6 > width - pw - 10 && ball.y > aiY && ball.y < aiY + ph && ball.vx > 0) {
      ball.vx = -Math.abs(ball.vx) * 1.05;
      ball.vy += ((ball.y - (aiY + ph / 2)) / ph) * 6;
      beep(440, 0.04);
    }

    if (ball.x < 0) {
      aiScore++;
      beep(180, 0.15, "sawtooth");
      finishPoint(1);
    } else if (ball.x > width) {
      playerScore++;
      onScore(playerScore * 100 + Math.max(0, playerScore - aiScore) * 20);
      beep(660, 0.1);
      finishPoint(-1);
    }
  }

  function finishPoint(dir: number) {
    if (playerScore >= 7 || aiScore >= 7) {
      alive = false;
      onStatus?.(playerScore > aiScore ? "You win!" : "You lose");
      onGameOver(playerScore * 100, 0);
    } else {
      serve(dir);
    }
  }

  function render() {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = pal.neon;
    roundRect(ctx, 10, playerY, pw, ph, 6);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    roundRect(ctx, width - pw - 10, aiY, pw, ph, 6);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal.muted;
    ctx.font = "bold 40px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(String(playerScore), width / 2 - 50, 52);
    ctx.fillText(String(aiScore), width / 2 + 50, 52);
  }

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    playerY = clamp(((e.clientY - rect.top) / rect.height) * height - ph / 2, 0, height - ph);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") upHeld = true;
    else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") downHeld = true;
    else if (e.key.toLowerCase() === "r" && !alive) reset();
    else return;
    e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") upHeld = false;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") downHeld = false;
  };

  canvas.addEventListener("pointermove", onMove);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  reset();
  const loop = createLoop(update, render);

  return {
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    restart: () => reset(),
    destroy: () => {
      loop.stop();
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
};

export default pong;
