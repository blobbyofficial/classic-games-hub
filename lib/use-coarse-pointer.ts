"use client";

import { useEffect, useState } from "react";

/**
 * Input capability, not device identity. A touchscreen Chromebook may have a
 * fine primary pointer plus touch; relying on (pointer: coarse) alone hides
 * instructions for the player's available touch input.
 *
 * No user-agent parsing, fingerprinting, storage or network collection.
 */
export function useCoarsePointer(): boolean | null {
  const [touchCapable, setTouchCapable] = useState<boolean | null>(null);

  useEffect(() => {
    const primary = window.matchMedia("(pointer: coarse)");
    const any = window.matchMedia("(any-pointer: coarse)");
    const update = () => {
      setTouchCapable(primary.matches || any.matches || navigator.maxTouchPoints > 0);
    };
    update();
    primary.addEventListener("change", update);
    any.addEventListener("change", update);
    return () => {
      primary.removeEventListener("change", update);
      any.removeEventListener("change", update);
    };
  }, []);

  return touchCapable;
}
