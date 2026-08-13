import { Pin } from "lucide-react";
import {
  COMPONENT_STATUS,
  groupComponents,
  type StatusComponentSummary,
  type UptimeMatrix,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import { UptimeBar, UptimeLegend } from "./uptime-bar";

/**
 * The board: every component, grouped, each with its status and its ninety-day
 * strip. The centre of the page, and the thing people scroll to first.
 */
export function ComponentBoard({
  components,
  matrix,
}: {
  components: StatusComponentSummary[];
  matrix: UptimeMatrix | null;
}) {
  const groups = groupComponents(components);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card">
        {groups.map((group, gi) => (
          <section key={group.group} className={cn(gi > 0 && "border-t border-border")}>
            <h3 className="px-5 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.group}
            </h3>
            <ul>
              {group.components.map((component) => (
                <li key={component.slug} className="border-t border-border/60 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        {component.name}
                        {component.pinned && (
                          <span
                            className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            title={component.pinned_reason ?? "Set manually by staff"}
                          >
                            <Pin className="size-2.5" />
                            Set by staff
                          </span>
                        )}
                      </p>
                      {component.description && (
                        <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
                          {component.description}
                        </p>
                      )}
                      {component.pinned && component.pinned_reason && (
                        <p className="mt-1 text-xs text-muted-foreground">{component.pinned_reason}</p>
                      )}
                    </div>
                    {/* Status is a dot *and* a word, always - a bare coloured
                        dot is unreadable to anyone who cannot separate the
                        hues, which on a status page is the whole message. */}
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 text-sm font-semibold",
                        COMPONENT_STATUS[component.status].text,
                      )}
                    >
                      <span className={cn("size-2 rounded-full", COMPONENT_STATUS[component.status].dot)} />
                      {COMPONENT_STATUS[component.status].label}
                    </span>
                  </div>

                  <UptimeBar
                    className="mt-3"
                    data={matrix?.components?.[component.slug]}
                    from={matrix?.from ?? new Date().toISOString()}
                    to={matrix?.to ?? new Date().toISOString()}
                  />

                  {component.latency_ms !== null && (
                    <p className="mt-1 text-xs text-muted-foreground tnum">
                      Last check responded in {component.latency_ms} ms
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <UptimeLegend className="px-1" />
    </div>
  );
}
