"use client";

import { useEffect, useState } from "react";

/**
 * Detects whether the device's primary pointer is coarse (touch) rather than
 * fine (mouse/trackpad). Returns `null` until mounted so the caller can avoid
 * a hydration mismatch and render device-specific UI only on the client.
 */
export function useCoarsePointer(): boolean | null {
  const [coarse, setCoarse] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return coarse;
}
