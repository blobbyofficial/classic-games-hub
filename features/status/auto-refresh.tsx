"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetch the page on an interval, so a status page left open on a second
 * monitor stays true without anyone pressing F5.
 *
 * Two conditions, both of which matter: it stops while the tab is hidden -
 * otherwise every abandoned tab keeps polling a database that may already be
 * the thing struggling - and it refreshes immediately on becoming visible
 * again, because coming back to a stale "all systems operational" is exactly
 * the failure this page cannot afford.
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);

  return null;
}
