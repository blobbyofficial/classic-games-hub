/** Fixed logical canvas resolution per game (drives the aspect-ratio box). */
export const GAME_CANVAS: Record<string, { w: number; h: number }> = {
  snake: { w: 480, h: 480 },
  tetris: { w: 400, h: 640 },
  "2048": { w: 460, h: 460 },
  breakout: { w: 520, h: 460 },
  pong: { w: 600, h: 420 },
  asteroids: { w: 560, h: 460 },
  invaders: { w: 480, h: 560 },
  frogger: { w: 480, h: 560 },
  runner: { w: 640, h: 400 },
  target: { w: 560, h: 460 },
  match3: { w: 480, h: 520 },
  bubble: { w: 460, h: 560 },
  mines: { w: 480, h: 480 },
  memory: { w: 480, h: 480 },
  slide: { w: 460, h: 460 },
  mastermind: { w: 460, h: 560 },
  hangman: { w: 560, h: 500 },
  simon: { w: 460, h: 460 },
  tictactoe: { w: 460, h: 460 },
  connect4: { w: 520, h: 480 },
  reversi: { w: 480, h: 480 },
  whack: { w: 480, h: 480 },
  lightsout: { w: 460, h: 460 },
};

export function canvasFor(engineId: string) {
  return GAME_CANVAS[engineId] ?? { w: 480, h: 540 };
}

/** Which on-screen control cluster to show on touch devices. */
export type ControlScheme =
  | "dpad"
  | "horizontal"
  | "flap"
  | "paddle"
  | "vertical"
  | "tetris"
  | "thrust"
  | "none";

/**
 * Games that need the shared swipe handler (dispatched as arrow keys). Only
 * games WITHOUT their own touch input belong here — snake, 2048 and slide
 * already handle touch natively, so adding swipe there would double-fire.
 */
export const SWIPE_GAMES = new Set(["frogger", "tetris"]);

export const CONTROL_SCHEME: Record<string, ControlScheme> = {
  snake: "dpad",
  tetris: "tetris",
  "2048": "dpad",
  breakout: "paddle",
  pong: "vertical",
  asteroids: "thrust",
  invaders: "horizontal",
  frogger: "dpad",
  runner: "flap",
  slide: "dpad",
  // pointer-only games need no on-screen keys
  target: "none",
  match3: "none",
  bubble: "none",
  mines: "none",
  memory: "none",
  mastermind: "none",
  hangman: "none",
  simon: "none",
  tictactoe: "none",
  connect4: "none",
  reversi: "none",
  whack: "none",
  lightsout: "none",
};
