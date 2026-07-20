"use client";

import { useEffect, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import type { SeasonalEvent } from "@/types";

const STORAGE_KEY = "cgh:seasonal-dismissed";

/** Celebratory site-wide banner announcing an active seasonal event. */
export function SeasonalBanner({ event }: { event: SeasonalEvent }) {
  // Re-shows when the title changes (a new event is launched).
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === event.title);
    } catch {
      setDismissed(false);
    }
  }, [event.title]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, event.title);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-transparent bg-[linear-gradient(120deg,var(--primary),oklch(0.6_0.2_330))] px-4 py-2 text-center text-sm font-medium text-white">
      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <PartyPopper className="size-4 shrink-0" />
        <span className="font-semibold">{event.title}</span>
        {event.multiplier > 1 && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold tabular-nums">
            {event.multiplier}× credits
          </span>
        )}
        {event.message && <span className="opacity-90">{event.message}</span>}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss event banner"
        className="shrink-0 rounded-md p-0.5 opacity-80 transition hover:bg-white/15 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
