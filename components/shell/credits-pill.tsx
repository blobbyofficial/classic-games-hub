"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { useSessionStore } from "@/lib/stores/session-store";
import { compactNumber } from "@/lib/utils";

/**
 * Live credit balance in the navbar. Keying the value span on the balance makes
 * React swap the element whenever it changes, which restarts the roll-in
 * animation - the same effect the old presence animation gave, with none of the
 * animation runtime in the bundle.
 */
export function CreditsPill() {
  const credits = useSessionStore((s) => s.profile?.credits ?? 0);

  return (
    <Link
      href="/shop"
      className="group flex items-center gap-1.5 overflow-hidden rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-[oklch(0.52_0.13_85)] transition-colors hover:bg-gold/20 dark:text-gold"
      aria-label={`${credits} credits - open the shop`}
    >
      <Coins className="size-4 shrink-0 transition-transform duration-300 ease-[var(--ease-spring)] motion-safe:group-hover:rotate-[18deg]" />
      <span key={credits} className="tnum motion-safe:animate-roll-in">
        {compactNumber(credits)}
      </span>
    </Link>
  );
}
