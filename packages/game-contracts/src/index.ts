/** Public, dependency-free contract for independently packaged games.
 * Never import Next.js, Supabase or website internals from this package.
 */
export const GAME_MANIFEST_SCHEMA_VERSION = 1 as const;
export type GameCapability = "audio" | "score" | "progress" | "achievements" | "settings" | "haptics";
export type GameInput = "keyboard" | "pointer" | "touch" | "gamepad";
export type GameQuality = "eco" | "balanced" | "high";
export type GameStatus = "vaulted" | "in-development" | "released";

export interface GameManifest {
  schemaVersion: typeof GAME_MANIFEST_SCHEMA_VERSION;
  id: string;
  title: string;
  version: string;
  sdk: { major: 1 };
  display: { width: number; height: number; resize: "contain" | "cover" };
  input: readonly GameInput[];
  quality: readonly GameQuality[];
  capabilities: readonly GameCapability[];
  /** Informational only: this must never change the database publication state. */
  status: GameStatus;
}

export type ManifestError = { field: string; message: string };
const unique = (values: readonly string[]) => new Set(values).size === values.length;
const options = <T extends string>(value: unknown, valid: readonly T[]): value is T[] =>
  Array.isArray(value) && value.every((x: unknown) => typeof x === "string" && valid.includes(x as T)) && unique(value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Strict, runtime-safe validation of untrusted manifests before activation. */
export function validateGameManifest(value: unknown): { ok: true; manifest: GameManifest } | { ok: false; errors: ManifestError[] } {
  const errors: ManifestError[] = [];
  if (!isRecord(value)) return { ok: false, errors: [{ field: "manifest", message: "Expected an object" }] };
  const check = (field: string, valid: boolean, message: string) => {
    if (!valid) errors.push({ field, message });
  };
  check("schemaVersion", value.schemaVersion === 1, "Unsupported manifest schema version");
  check("id", typeof value.id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id), "Expected a kebab-case identifier");
  check("title", typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 100, "Expected a title (1-100 characters)");
  check("version", typeof value.version === "string" && /^\d+\.\d+\.\d+$/.test(value.version), "Expected a semantic version");
  check("sdk.major", isRecord(value.sdk) && value.sdk.major === 1, "Requires SDK major version 1");
  const display = value.display;
  check("display", isRecord(display) && Number.isSafeInteger(display.width) && Number.isSafeInteger(display.height) && Number(display.width) >= 160 && Number(display.width) <= 4096 && Number(display.height) >= 160 && Number(display.height) <= 4096 && (display.resize === "contain" || display.resize === "cover"), "Invalid logical canvas dimensions or resize mode");
  check("input", options(value.input, ["keyboard", "pointer", "touch", "gamepad"]) && (value.input as unknown[]).length > 0, "Expected nonempty, unique supported input modes");
  check("quality", options(value.quality, ["eco", "balanced", "high"]) && (value.quality as unknown[]).length > 0, "Expected nonempty, unique supported quality presets");
  check("capabilities", options(value.capabilities, ["audio", "score", "progress", "achievements", "settings", "haptics"]), "Expected unique supported capabilities");
  check("status", ["vaulted", "in-development", "released"].includes(value.status as string), "Invalid lifecycle status");
  if (errors.length) return { ok: false, errors };
  return { ok: true, manifest: value as unknown as GameManifest };
}
