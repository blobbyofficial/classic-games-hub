import type { GameManifest } from "../../game-contracts/src/index";

/** Lifecycle boundaries are explicit to prevent double-start, leaked resources and invalid transitions. */
export type GameRuntimeState = "idle" | "ready" | "running" | "paused" | "failed" | "disposed";
export type GameRuntimeEvent = { type: "state"; from: GameRuntimeState; to: GameRuntimeState } | { type: "error"; error: unknown };
export type GameRuntimeListener = (event: GameRuntimeEvent) => void;

export interface GameHost {
  readonly canvas: HTMLCanvasElement;
  readonly signal: AbortSignal;
  /** Only capabilities declared in the game manifest may be provided. */
  readonly capabilities: Readonly<Partial<Record<GameManifest["capabilities"][number], unknown>>>;
}

export interface PackagedGame {
  initialize(host: GameHost): void | Promise<void>;
  start(): void | Promise<void>;
  pause(): void | Promise<void>;
  resume(): void | Promise<void>;
  restart(): void | Promise<void>;
  dispose(): void | Promise<void>;
}

/** Serialized operations avoid overlapping asynchronous lifecycle transitions. */
export class GameRuntime {
  private stateValue: GameRuntimeState = "idle";
  private pending: Promise<void> = Promise.resolve();
  private controller = new AbortController();
  private game: PackagedGame | null = null;
  private disposedRequested = false;

  constructor(private readonly create: () => PackagedGame, private readonly listener?: GameRuntimeListener) {}
  get state(): GameRuntimeState { return this.stateValue; }
  get signal(): AbortSignal { return this.controller.signal; }

  private setState(next: GameRuntimeState): void {
    const from = this.stateValue;
    if (from === next) return;
    this.stateValue = next;
    this.listener?.({ type: "state", from, to: next });
  }
  private enqueue(task: () => Promise<void>): Promise<void> {
    const operation = this.pending.then(task);
    this.pending = operation.catch(() => undefined);
    return operation;
  }
  private async runOperation(action: () => Promise<void>): Promise<void> {
    try { await action(); }
    catch (error) {
      this.setState("failed");
      this.listener?.({ type: "error", error });
      throw error;
    }
  }
  initialize(host: Omit<GameHost, "signal">): Promise<void> {
    return this.enqueue(() => this.runOperation(async () => {
      if (this.disposedRequested || this.stateValue !== "idle") throw new Error("Game can only initialize once");
      this.game = this.create();
      await this.game.initialize({ ...host, signal: this.controller.signal });
      this.setState("ready");
    }));
  }
  start(): Promise<void> {
    return this.enqueue(() => this.runOperation(async () => {
      if (this.disposedRequested || this.stateValue !== "ready" || !this.game) throw new Error("Game is not ready");
      await this.game.start();
      this.setState("running");
    }));
  }
  pause(): Promise<void> {
    return this.enqueue(() => this.runOperation(async () => {
      if (this.disposedRequested || this.stateValue !== "running" || !this.game) throw new Error("Game is not running");
      await this.game.pause();
      this.setState("paused");
    }));
  }
  resume(): Promise<void> {
    return this.enqueue(() => this.runOperation(async () => {
      if (this.disposedRequested || this.stateValue !== "paused" || !this.game) throw new Error("Game is not paused");
      await this.game.resume();
      this.setState("running");
    }));
  }
  restart(): Promise<void> {
    return this.enqueue(() => this.runOperation(async () => {
      if (this.disposedRequested || !this.game || !["ready", "running", "paused"].includes(this.stateValue)) throw new Error("Game cannot restart");
      await this.game.restart();
      this.setState("running");
    }));
  }
  dispose(): Promise<void> {
    this.disposedRequested = true;
    this.controller.abort();
    return this.enqueue(async () => {
      if (this.stateValue === "disposed") return;
      try { await this.game?.dispose(); }
      finally { this.game = null; this.setState("disposed"); }
    });
  }
}
