"use client";

import { useState } from "react";
import { UPTIME_DAY, UPTIME_STATE, formatUptime, type UptimeMatrix } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * The ninety-day uptime strip - one thin bar per day, oldest on the left.
 *
 * This is the element the whole page is judged on, and the thing that makes it
 * work is that it is *dense*: ninety bars in the width of a card is a shape you
 * read at a glance, and a single red notch in a field of green is visible from
 * across a room in a way "99.87% uptime" never is.
 *
 * Colour is never the only carrier. Every bar has a hover card and a screen
 * reader label naming the day and what happened on it, the strip is captioned
 * with its own date range and percentage, and the legend spells out what each
 * colour means.
 */

interface Props {
  /** One entry from `status_uptime_matrix().components`. */
  data: UptimeMatrix["components"][string] | undefined;
  from: string;
  to: string;
  className?: string;
}

function dayLabel(from: string, index: number): string {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function UptimeBar({ data, from, to, className }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const states = data?.states ?? "";

  if (!states) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No uptime recorded yet - checks start on the next probe run.
      </p>
    );
  }

  const days = states.split("");
  const note = hover !== null ? data?.notes?.[String(hover)] : undefined;
  const hoveredState = hover !== null ? (UPTIME_STATE[days[hover]] ?? "unknown") : null;

  return (
    <div className={cn("relative", className)}>
      {/* Bars. `items-stretch` + a fixed height keeps them a uniform strip;
          flex-1 with a min width means ninety of them fill any container and
          stay tappable rather than becoming hairlines on a phone. */}
      <div
        className="flex h-9 items-stretch gap-px"
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Uptime for the last ${days.length} days: ${formatUptime(data?.uptime)}`}
      >
        {days.map((char, i) => {
          const state = UPTIME_STATE[char] ?? "unknown";
          const meta = UPTIME_DAY[state];
          return (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              className={cn(
                "min-w-[2px] flex-1 rounded-[2px] transition-[opacity,transform] duration-150",
                meta.fill,
                state === "unknown" && "opacity-40",
                hover === i ? "opacity-100 scale-y-110" : "hover:opacity-80",
              )}
              // The bars are decoration; the strip above carries the label and
              // the table view below carries the detail, so each bar is hidden
              // from assistive technology rather than announcing ninety times.
              aria-hidden
            />
          );
        })}
      </div>

      {/* Hover card. Positioned in flow rather than floating, so it can never
          be clipped by the card's overflow or run off the edge of a phone. */}
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {hover === null ? (
          <>
            <span>{new Date(from).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            <span className="font-medium text-foreground tnum">{formatUptime(data?.uptime)} uptime</span>
            <span>
              {new Date(to).toDateString() === new Date().toDateString()
                ? "Today"
                : new Date(to).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </>
        ) : (
          <span className="flex w-full items-center gap-2">
            <span
              className={cn("size-2 shrink-0 rounded-full", hoveredState && UPTIME_DAY[hoveredState].fill)}
            />
            <span className="font-medium text-foreground">{dayLabel(from, hover)}</span>
            <span className="truncate">
              {hoveredState && UPTIME_DAY[hoveredState].label}
              {note ? ` - ${formatUptime(note.uptime)} of checks passed` : ""}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

/** Shared legend - shown once per board rather than once per component. */
export function UptimeLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)}>
      {(["up", "degraded", "down", "unknown"] as const).map((state) => (
        <span key={state} className="flex items-center gap-1.5">
          <span
            className={cn("size-2 rounded-[2px]", UPTIME_DAY[state].fill, state === "unknown" && "opacity-40")}
          />
          {UPTIME_DAY[state].legend}
        </span>
      ))}
    </div>
  );
}
