import { AlertTriangle, CalendarClock, CheckCircle2, Wrench } from "lucide-react";
import {
  COMPONENT_STATUS,
  INCIDENT_IMPACT,
  INCIDENT_STATUS,
  formatDuration,
  type Incident,
} from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * One incident and its whole timeline, newest update first.
 *
 * The timeline is the point. A status page that only shows a current state
 * makes people refresh it; a page that shows "identified 20 minutes ago,
 * monitoring since 10" tells them whether to keep waiting, and it is the format
 * every reader of a status page already knows how to scan.
 */
export function IncidentCard({
  incident,
  compact = false,
}: {
  incident: Incident;
  /** History entries collapse the timeline to its final word. */
  compact?: boolean;
}) {
  const open = !incident.resolved_at;
  const maintenance = incident.kind === "maintenance";
  const Icon = maintenance ? Wrench : open ? AlertTriangle : CheckCircle2;
  const status = INCIDENT_STATUS[incident.status];
  const updates = compact ? incident.updates.slice(0, 1) : incident.updates;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-5",
        open && !maintenance ? "border-destructive/30" : "border-border",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
              maintenance
                ? "bg-primary/10 text-primary"
                : open
                  ? "bg-destructive/10 text-destructive"
                  : "bg-success/10 text-success",
            )}
          >
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold leading-snug">{incident.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">INC-{incident.ref}</span>
              <span aria-hidden>·</span>
              <span className={INCIDENT_IMPACT[incident.impact].text}>
                {INCIDENT_IMPACT[incident.impact].label}
              </span>
              <span aria-hidden>·</span>
              <span>
                {open
                  ? `Open for ${formatDuration(incident.started_at)}`
                  : `Lasted ${formatDuration(incident.started_at, incident.resolved_at)}`}
              </span>
              {incident.auto && (
                <>
                  <span aria-hidden>·</span>
                  <span title="Opened automatically by our monitoring">Detected automatically</span>
                </>
              )}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold",
            status.text,
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </header>

      {maintenance && incident.scheduled_for && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <CalendarClock className="size-4 shrink-0 text-primary" />
          <span>
            Scheduled for{" "}
            <time dateTime={incident.scheduled_for} className="font-medium text-foreground">
              {new Date(incident.scheduled_for).toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            {incident.scheduled_until && (
              <>
                {" "}
                until{" "}
                <time dateTime={incident.scheduled_until} className="font-medium text-foreground">
                  {new Date(incident.scheduled_until).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </>
            )}
          </span>
        </p>
      )}

      {incident.components.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {incident.components.map((c) => (
            <li
              key={c.slug}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
                COMPONENT_STATUS[c.status].border,
                COMPONENT_STATUS[c.status].bg,
              )}
            >
              <span className={cn("size-1.5 rounded-full", COMPONENT_STATUS[c.status].dot)} />
              {c.name}
            </li>
          ))}
        </ul>
      )}

      {updates.length > 0 && (
        <ol className="mt-4 space-y-3">
          {updates.map((update, i) => (
            <li key={update.id} className="relative flex gap-3 pl-1">
              {/* The rail joining consecutive updates - drawn on every entry
                  except the last so the timeline reads as one thread. */}
              {i < updates.length - 1 && (
                <span aria-hidden className="absolute left-[7px] top-4 h-full w-px bg-border" />
              )}
              <span
                className={cn(
                  "relative mt-1 size-3 shrink-0 rounded-full ring-4 ring-card",
                  INCIDENT_STATUS[update.status].dot,
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span className={cn("font-semibold", INCIDENT_STATUS[update.status].text)}>
                    {INCIDENT_STATUS[update.status].label}
                  </span>
                  <time dateTime={update.created_at} className="text-muted-foreground">
                    {new Date(update.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {update.author && <span className="text-muted-foreground">by {update.author}</span>}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{update.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {compact && incident.updates.length > 1 && (
        <p className="mt-2 pl-7 text-xs text-muted-foreground">
          +{incident.updates.length - 1} earlier{" "}
          {incident.updates.length - 1 === 1 ? "update" : "updates"}
        </p>
      )}
    </article>
  );
}
