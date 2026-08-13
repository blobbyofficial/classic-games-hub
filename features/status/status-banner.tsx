import { INDICATOR, type StatusSummary } from "@/lib/status";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";

/**
 * The headline. One sentence, one colour, and the thing anyone arriving in a
 * panic is here to read - so it comes before everything else on the page and
 * says the state in words rather than leaving it to the colour.
 */
export function StatusBanner({ summary }: { summary: StatusSummary }) {
  const indicator = INDICATOR[summary.status.indicator];
  const openIncidents = summary.incidents.length;

  return (
    <div className={cn("rounded-2xl border p-6 sm:p-7", indicator.border, indicator.bg)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="relative flex size-4 shrink-0">
            {/* The ping only runs when something is wrong: a permanently
                pulsing dot on a healthy page is noise that trains people to
                stop seeing it. */}
            {summary.status.indicator !== "none" && (
              <span
                aria-hidden
                className={cn(
                  "absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden",
                  indicator.text.replace("text-", "bg-"),
                )}
              />
            )}
            <span
              aria-hidden
              className={cn("relative inline-flex size-4 rounded-full", indicator.text.replace("text-", "bg-"))}
            />
          </span>
          <div>
            <h2 className={cn("text-xl font-bold tracking-tight sm:text-2xl", indicator.text)}>
              {indicator.label}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {openIncidents > 0
                ? `${openIncidents} open ${openIncidents === 1 ? "incident" : "incidents"}, detailed below.`
                : indicator.blurb}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Checked {timeAgo(summary.generated_at)}</p>
      </div>
    </div>
  );
}
