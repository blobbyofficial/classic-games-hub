"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A loading state only ever helps if the wait is long enough to notice. Showing
 * a skeleton for 80ms reads as a flicker — worse than showing nothing — so
 * everything here stays invisible for `delay` and only then fades in. Fast
 * loads render nothing at all; slow ones get a proper placeholder.
 *
 * 300ms is the usual threshold for "this felt instant"; below it people don't
 * register a wait, so there is nothing to reassure them about.
 */
const DEFAULT_DELAY = 300;

export function useDelayedFlag(delay: number = DEFAULT_DELAY) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return shown;
}

interface DeferredProps {
  children: React.ReactNode;
  /** Milliseconds to stay invisible before revealing. */
  delay?: number;
  className?: string;
}

/**
 * Wraps any placeholder so it only appears once the wait is worth explaining.
 * Use as a Suspense fallback:
 *
 *   <Suspense fallback={<Deferred><ShopSkeleton /></Deferred>}>
 */
export function Deferred({ children, delay, className }: DeferredProps) {
  const shown = useDelayedFlag(delay);
  if (!shown) return null;
  return <div className={cn("animate-in fade-in duration-200", className)}>{children}</div>;
}

/**
 * The same idea for inline pending states — a server action in flight, a panel
 * refetching. Sized to sit inside a button or beside a label.
 */
export function DeferredSpinner({
  delay,
  className,
  label = "Loading",
}: {
  delay?: number;
  className?: string;
  label?: string;
}) {
  const shown = useDelayedFlag(delay);
  if (!shown) return null;
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block size-4 shrink-0 rounded-full border-2 border-current border-t-transparent",
        "animate-spin motion-reduce:animate-none",
        "animate-in fade-in duration-200",
        className,
      )}
    />
  );
}
