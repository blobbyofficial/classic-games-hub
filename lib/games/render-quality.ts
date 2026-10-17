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

/** Clamp rendering allocation to prevent huge fullscreen backbuffers.
 * Canvas pixel caps protect fill-rate and memory, never simulation.
 */
export function cappedCanvasSize(
  cssWidth: number, cssHeight: number, devicePixelRatio: number,
  preset: QualityPreset, maxPixels = 3_000_000,
): { width: number; height: number } {
  if (!Number.isFinite(cssWidth) || !Number.isFinite(cssHeight) ||
      cssWidth <= 0 || cssHeight <= 0) return { width: 1, height: 1 };
  const dpr = effectivePixelRatio(devicePixelRatio, preset);
  const scaledPixels = cssWidth * cssHeight * dpr * dpr;
  const scale = scaledPixels > maxPixels ? Math.sqrt(maxPixels / scaledPixels) : 1;
  return { width: Math.max(1, Math.round(cssWidth * dpr * scale)),
           height: Math.max(1, Math.round(cssHeight * dpr * scale)) };
}
