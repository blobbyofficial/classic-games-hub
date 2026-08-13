"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ReportTimeline } from "@/lib/status";

/**
 * Reports over the last 24 hours - the Downdetector shape.
 *
 * One series, so there is no legend box: the caption names it. The only colour
 * decision is a status one - a bucket at or above the threshold is drawn in the
 * alert colour - and it is never the sole carrier, because the banner above the
 * chart says in words what the colour is claiming and the dashed rule is
 * labelled.
 *
 * Built from flex children rather than an SVG viewBox on purpose: ninety-six
 * bars that must fill any width from a 320px phone to a wide card is exactly
 * what flex does well, and a viewBox stretched to fit would smear the rounded
 * ends and the label text with it.
 */

export function ReportChart({
  timeline,
  className,
}: {
  timeline: ReportTimeline;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const buckets = timeline.buckets ?? [];
  const peak = Math.max(1, ...buckets.map((b) => b.reports));
  // The threshold only earns a rule on the chart when it sits inside it -
  // drawing "5" across a chart whose peak is 2 says nothing and crops the bars.
  const showThreshold = timeline.threshold > 0 && timeline.threshold <= peak;
  const active = hover !== null ? buckets[hover] : null;

  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <figure className={cn("space-y-2", className)}>
      <figcaption className="flex items-end justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          {active ? (
            <>
              <span className="font-semibold text-foreground tnum">
                {active.reports} {active.reports === 1 ? "report" : "reports"}
              </span>{" "}
              at {timeLabel(active.at)}
            </>
          ) : (
            <>
              Reports per {timeline.window_minutes} minutes, last {timeline.hours} hours
            </>
          )}
        </span>
        <span className="tnum text-muted-foreground">Peak {peak}</span>
      </figcaption>

      <div
        className="relative h-28 w-full"
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`${timeline.total} reports in the last ${timeline.hours} hours, peaking at ${peak} in a ${timeline.window_minutes}-minute window.`}
      >
        {showThreshold && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-muted-foreground/50"
            style={{ bottom: `${(timeline.threshold / peak) * 100}%` }}
          >
            {/* Labelled on the left, not the right. A spike is by definition
                the most recent thing on the chart, so the right-hand end is
                exactly where the tall bars are and exactly where a label
                punches a hole through them. */}
            <span className="absolute -top-2 left-0 bg-card pr-1 text-[10px] font-medium text-muted-foreground">
              Usual level
            </span>
          </div>
        )}

        <div className="flex h-full items-end gap-px">
          {buckets.map((bucket, i) => {
            const height = (bucket.reports / peak) * 100;
            const alerting = timeline.threshold > 0 && bucket.reports >= timeline.threshold;
            return (
              <div
                key={bucket.at}
                onMouseEnter={() => setHover(i)}
                className="group flex h-full min-w-[2px] flex-1 items-end"
                aria-hidden
              >
                <div
                  className={cn(
                    "w-full rounded-t-[2px] transition-[background-color,opacity] duration-150",
                    bucket.reports === 0
                      ? "bg-border"
                      : alerting
                        ? "bg-destructive"
                        : "bg-primary/70",
                    hover === i && "opacity-100",
                    hover !== null && hover !== i && "opacity-60",
                  )}
                  // A zero bucket still gets a 2px stub, so the axis reads as a
                  // continuous 24 hours rather than as gaps in the data.
                  style={{ height: bucket.reports === 0 ? "2px" : `max(3px, ${height}%)` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{buckets[0] ? timeLabel(buckets[0].at) : ""}</span>
        <span>{buckets[Math.floor(buckets.length / 2)] ? timeLabel(buckets[Math.floor(buckets.length / 2)].at) : ""}</span>
        <span>Now</span>
      </div>
    </figure>
  );
}
