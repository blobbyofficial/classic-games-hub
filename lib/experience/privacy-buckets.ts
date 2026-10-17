/**
 * Phase 7: privacy-preserving aggregate categorization only.
 * No telemetry requests, cookies, persistent IDs, analytics SDK or storage.
 * All outputs are coarse, bounded dimensions suitable for a future consented
 * event pipeline after privacy/legal review.
 */
export type ViewportBucket = "320-359" | "360-429" | "430-767" | "768-1023" | "1024+";
export type InputBucket = "touch" | "hybrid" | "pointer" | "unknown";
export type ExperienceEventName =
  | "game_load_failed" | "game_started" | "game_completed"
  | "empty_search_result" | "navigation_error" | "client_error";
export const ALLOWED_EXPERIENCE_EVENTS: readonly ExperienceEventName[] = [
  "game_load_failed", "game_started", "game_completed",
  "empty_search_result", "navigation_error", "client_error",
];

export function viewportBucket(width: number): ViewportBucket {
  if (!Number.isFinite(width) || width < 0) return "1024+";
  if (width < 360) return "320-359";
  if (width < 430) return "360-429";
  if (width < 768) return "430-767";
  if (width < 1024) return "768-1023";
  return "1024+";
}
export function inputBucket(touch: boolean, fine: boolean): InputBucket {
  return touch && fine ? "hybrid" : touch ? "touch" : fine ? "pointer" : "unknown";
}
export function quantizeMilliseconds(value: number): "0-100" | "101-300" | "301-1000" | "1000+" {
  if (!Number.isFinite(value) || value < 0) return "1000+";
  if (value <= 100) return "0-100";
  if (value <= 300) return "101-300";
  if (value <= 1000) return "301-1000";
  return "1000+";
}
/** Avoid small-cohort reporting to lower reidentification risk. */
export function visibleAggregateCount(count: number, minimum = 20): number | null {
  // The caller may raise the threshold, but may never lower the privacy floor.
  const threshold = Number.isSafeInteger(minimum) ? Math.max(20, minimum) : 20;
  return Number.isSafeInteger(count) && count >= threshold ? count : null;
}
