"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSessionStore } from "@/lib/stores/session-store";
import { compactNumber } from "@/lib/utils";

/** Live credit balance in the navbar, animating when it changes. */
export function CreditsPill() {
  const credits = useSessionStore((s) => s.profile?.credits ?? 0);

  return (
    <Link
      href="/shop"
      className="focus-visible-ring group flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-[oklch(0.55_0.13_85)] transition-colors hover:bg-gold/20 dark:text-gold"
      aria-label={`${credits} credits`}
    >
      <Coins className="size-4 transition-transform group-hover:rotate-12" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={credits}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="tabular-nums"
        >
          {compactNumber(credits)}
        </motion.span>
      </AnimatePresence>
    </Link>
  );
}
