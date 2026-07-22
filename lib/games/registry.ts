import type { GameEngineFactory } from "@/types";

/**
 * Lazy engine registry. Each entry dynamically imports its module so games are
 * code-split and only downloaded when actually played.
 */
export const ENGINE_LOADERS: Record<string, () => Promise<{ default: GameEngineFactory }>> = {
  snake: () => import("./engines/snake"),
  tetris: () => import("./engines/tetris"),
  "2048": () => import("./engines/g2048"),
  breakout: () => import("./engines/breakout"),
  pong: () => import("./engines/pong"),
  asteroids: () => import("./engines/asteroids"),
  invaders: () => import("./engines/invaders"),
  frogger: () => import("./engines/frogger"),
  runner: () => import("./engines/runner"),
  target: () => import("./engines/target"),
  match3: () => import("./engines/match3"),
  bubble: () => import("./engines/bubble"),
  mines: () => import("./engines/mines"),
  memory: () => import("./engines/memory"),
  slide: () => import("./engines/slide"),
  mastermind: () => import("./engines/mastermind"),
  hangman: () => import("./engines/hangman"),
  simon: () => import("./engines/simon"),
  tictactoe: () => import("./engines/tictactoe"),
  connect4: () => import("./engines/connect4"),
  reversi: () => import("./engines/reversi"),
  whack: () => import("./engines/whack"),
  lightsout: () => import("./engines/lightsout"),
  racer: () => import("./engines/racer"),
};

export function hasEngine(id: string): boolean {
  return id in ENGINE_LOADERS;
}
