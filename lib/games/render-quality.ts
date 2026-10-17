/** Visual quality policy: never change game simulation or scoring. */
export type QualityPreset = "eco" | "balanced" | "high";
export interface RenderingBudget {
  readonly particles: number;
  readonly decorativeGlow: boolean;
  readonly pixelRatioCap: number;
}
const PRESETS: Record<QualityPreset, RenderingBudget> = {
  eco: { particles: 0.25, decorativeGlow: false, pixelRatioCap: 1 },
  balanced: { particles: 0.65, decorativeGlow: true, pixelRatioCap: 1.5 },
  high: { particles: 1, decorativeGlow: true, pixelRatioCap: 2 },
};
export function renderingBudget(preset: QualityPreset, reducedMotion = false): RenderingBudget {
  const selected = PRESETS[preset];
  return {
    ...selected,
    particles: reducedMotion ? 0 : selected.particles,
    decorativeGlow: !reducedMotion && selected.decorativeGlow,
  };
}
/** Inclusive of invalid/unavailable device pixel ratio inputs. */
export function effectivePixelRatio(devicePixelRatio: number, preset: QualityPreset): number {
  const requested = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.max(1, Math.min(requested, PRESETS[preset].pixelRatioCap));
}
