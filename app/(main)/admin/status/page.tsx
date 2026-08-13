import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getRecentReports, getStatusSummary } from "@/services/status";
import { StatusConsole } from "@/features/admin/status-console";
import { INDICATOR } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Incidents are only worth managing against what is true right now. */
export const dynamic = "force-dynamic";

export default async function AdminStatusPage() {
  const [summary, reports] = await Promise.all([getStatusSummary(), getRecentReports(60)]);

  if (!summary) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        The status service is unreachable, so there is nothing to manage from here. That itself is
        worth investigating.
      </p>
    );
  }

  const indicator = INDICATOR[summary.status.indicator];

  return (
    <div className="space-y-5">
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4", indicator.border, indicator.bg)}>
        <div>
          <p className={cn("font-semibold", indicator.text)}>{indicator.label}</p>
          <p className="text-xs text-muted-foreground">
            {summary.reports.signal === "none"
              ? "Reports are at their normal level."
              : `${summary.reports.last_hour} player reports in the last hour.`}
          </p>
        </div>
        <Link
          href="/status"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          See the public page <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <StatusConsole
        components={summary.components}
        open={[...summary.incidents, ...summary.maintenance]}
        reports={reports}
      />
    </div>
  );
}
