import { Megaphone } from "lucide-react";
import {
  REPORT_PROBLEM_LABEL,
  REPORT_SIGNAL,
  type ReportTimeline,
  type StatusComponentSummary,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import { ReportChart } from "./report-chart";
import { ReportDialog } from "./report-dialog";

/**
 * What players are telling us, which is the half of a status page that
 * automated checks structurally cannot supply: a game that renders a blank
 * canvas returns HTTP 200 all day, and forty people saying so in a quarter of
 * an hour is the only signal that catches it.
 *
 * The wording is hedged everywhere on purpose. Reports are evidence, not a
 * verdict - one broken ISP can produce fifty of them while the site is
 * perfectly healthy - so this panel says what was received and never declares
 * an outage on its own.
 */
export function ReportPanel({
  timeline,
  components,
}: {
  timeline: ReportTimeline | null;
  components: StatusComponentSummary[];
}) {
  if (!timeline?.ok) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Reports are unavailable right now.</p>
          <ReportDialog components={components} />
        </div>
      </div>
    );
  }

  const signal = REPORT_SIGNAL[timeline.signal];
  const topProblems = timeline.problems.slice(0, 4);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl", signal.bg, signal.text)}>
            <Megaphone className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className={cn("font-semibold", signal.text)}>{signal.label}</h2>
            <p className="text-sm text-muted-foreground">
              {signal.blurb}{" "}
              {timeline.last_hour > 0
                ? `${timeline.last_hour} in the last hour.`
                : "Nothing in the last hour."}
            </p>
          </div>
        </div>
        <ReportDialog components={components} />
      </div>

      <ReportChart timeline={timeline} />

      {topProblems.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Most reported, last 24 hours
          </h3>
          <ul className="mt-2.5 space-y-2">
            {topProblems.map((problem) => (
              <li key={problem.problem} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 truncate sm:w-56">
                  {REPORT_PROBLEM_LABEL[problem.problem] ?? problem.problem}
                </span>
                {/* A share bar rather than a pie: four rows of one measure
                    compare by length far better than by angle. */}
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.max(2, problem.share)}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tnum">
                  {problem.share}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {timeline.total} {timeline.total === 1 ? "report" : "reports"} in the last {timeline.hours} hours.
        Reports come from players and are counted, not verified - they point us at problems our own
        checks have missed.
      </p>
    </div>
  );
}
