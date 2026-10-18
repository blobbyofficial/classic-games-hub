import type { GameCapability, GameManifest } from "../../game-contracts/src/index";

/** SDK services are host-owned. Declaring a capability is not permission to use it. */
export interface ScoreService {
  /** Intent only: the server must validate the run and calculate rewards. */
  submitRun(request: Readonly<{ runId: string; score: number; rulesVersion: string }>): Promise<{ accepted: boolean }>;
}
export interface AudioService { play(effect: string): void; setMuted(muted: boolean): void; }
export interface SettingsService { get(key: string): string | null; }
export interface ProgressService { emit(event: string, value: number): void; }
export interface HapticsService { pulse(durationMs: number): void; }
export interface AchievementService { report(id: string): void; }
export interface GameServices {
  audio: AudioService;
  score: ScoreService;
  settings: SettingsService;
  progress: ProgressService;
  haptics: HapticsService;
  achievements: AchievementService;
}

export type CapabilityGrants = Readonly<Partial<GameServices>>;

/** A denied capability is absent (not a no-op that pretends to succeed). */
export function negotiateCapabilities(
  manifest: GameManifest,
  platform: CapabilityGrants,
  allowed: ReadonlySet<GameCapability>,
): CapabilityGrants {
  const granted: Partial<GameServices> = {};
  for (const capability of manifest.capabilities) {
    if (allowed.has(capability) && platform[capability]) {
      // Each service preserves its native, strongly typed method signatures.
      Object.assign(granted, { [capability]: platform[capability] });
    }
  }
  return Object.freeze(granted);
}

/** Abort-aware cleanup bag for package-owned resources. */
export class GameResources {
  private cleanups: Array<() => void> = [];
  private disposed = false;
  add(cleanup: () => void): () => void {
    if (this.disposed) {
      cleanup();
      return () => undefined;
    }
    this.cleanups.push(cleanup);
    return () => {
      const index = this.cleanups.indexOf(cleanup);
      if (index !== -1) this.cleanups.splice(index, 1);
      cleanup();
    };
  }
  listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window,
    type: K,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const cleanups = this.cleanups.splice(0).reverse();
    for (const cleanup of cleanups) {
      try { cleanup(); } catch { /* Keep cleaning other resources. */ }
    }
  }
}
