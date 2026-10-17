/**
 * Phase 7 consent-aware, ephemeral UX event validator.
 *
 * This module never sends events. It accepts only coarse, predefined
 * aggregate-friendly fields; no identity, URL, free text or arbitrary payloads.
 * A future collection service must independently enforce consent and retention.
 */
import { ALLOWED_EXPERIENCE_EVENTS, type ExperienceEventName, type ViewportBucket, type InputBucket } from "./privacy-buckets";

export type ExperienceEvent = Readonly<{
  name: ExperienceEventName;
  viewport: ViewportBucket;
  input: InputBucket;
  quality: "eco" | "balanced" | "high" | "unknown";
  outcome: "ok" | "failed" | "abandoned";
}>;

const WIDTHS = new Set<ViewportBucket>(["320-359", "360-429", "430-767", "768-1023", "1024+"]);
const INPUTS = new Set<InputBucket>(["touch", "hybrid", "pointer", "unknown"]);
const QUALITIES = new Set(["eco", "balanced", "high", "unknown"]);
const OUTCOMES = new Set(["ok", "failed", "abandoned"]);
const KEYS = new Set(["name", "viewport", "input", "quality", "outcome"]);

/** Strict allowlist: neither silently pass through extra keys nor normalize identifiers. */
export function parseExperienceEvent(value: unknown): ExperienceEvent | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).length !== KEYS.size || Object.keys(item).some(key => !KEYS.has(key))) return null;
  if (typeof item.name !== "string" || !ALLOWED_EXPERIENCE_EVENTS.includes(item.name as ExperienceEventName)) return null;
  if (!WIDTHS.has(item.viewport as ViewportBucket) ||
      !INPUTS.has(item.input as InputBucket) ||
      !QUALITIES.has(item.quality as string) ||
      !OUTCOMES.has(item.outcome as string)) return null;
  return Object.freeze({
    name: item.name as ExperienceEventName,
    viewport: item.viewport as ViewportBucket,
    input: item.input as InputBucket,
    quality: item.quality as ExperienceEvent["quality"],
    outcome: item.outcome as ExperienceEvent["outcome"],
  });
}
export function permitExperienceEvent(consent: "granted" | "denied" | "unknown", value: unknown): ExperienceEvent | null {
  return consent === "granted" ? parseExperienceEvent(value) : null;
}
