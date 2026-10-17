/** Server-only bounded operational logging. Never accept arbitrary request bodies, URLs or identifiers. */
import "server-only";

type Severity = "info" | "warn" | "error";
type Operation = "discord_audit_poll" | "cron_auth_rejected" | "cron_completed" | "cron_failed";
type Outcome = "ok" | "denied" | "failed";
type LogEvent = Readonly<{
  operation: Operation;
  outcome: Outcome;
  severity: Severity;
  durationMs?: number;
}>;

/** Output fixed-key, allowlisted JSON; the hosting platform owns storage and rotation. */
export function logOperation(event: LogEvent): void {
  const durationMs = typeof event.durationMs === "number" && Number.isFinite(event.durationMs)
    ? Math.min(600_000, Math.max(0, Math.round(event.durationMs))) : undefined;
  const entry = {
    kind: "cgh.operation.v1",
    timestamp: new Date().toISOString(),
    operation: event.operation,
    outcome: event.outcome,
    severity: event.severity,
    ...(durationMs === undefined ? {} : { duration_ms: durationMs }),
  };
  const line = JSON.stringify(entry);
  if (event.severity === "error") console.error(line);
  else if (event.severity === "warn") console.warn(line);
  else console.info(line);
}
