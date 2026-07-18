"use client";

import { useEffect, useState } from "react";
import { Coins, Zap, Trophy, RotateCcw, Sparkles, Play, Tv } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { ScoreResult } from "@/types";

/** Shown over the canvas when a run ends. Reveals rewards + a replay CTA. */
export function RewardOverlay({
  score,
  result,
  loading,
  onReplay,
  adsPending,
}: {
  score: number;
  result: ScoreResult | null;
  loading: boolean;
  onReplay: () => void;
  adsPending?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
      >
        {result?.new_best && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-[oklch(0.6_0.13_85)] dark:text-gold">
            <Trophy className="size-3.5" /> New personal best!
          </div>
        )}
        <h3 className="text-lg font-bold">Game over</h3>
        <p className="mt-1 text-4xl font-black tabular-nums text-gradient">{formatNumber(score)}</p>
        <p className="text-xs text-muted-foreground">points</p>

        {adsPending ? (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Tv className="size-4 animate-pulse" /> Loading rewarded ad…
          </div>
        ) : loading ? (
          <div className="mt-5 h-16 animate-pulse rounded-xl bg-muted" />
        ) : result?.ok ? (
          <div className="mt-5 space-y-2">
            {result.rewarded === false ? (
              <p className="text-xs text-muted-foreground">
                Play limit reached for this hour — scores still count, but no rewards.
              </p>
            ) : (
              <div className="flex justify-center gap-2">
                <Reward icon={Coins} value={`+${result.credits_earned ?? 0}`} label="credits" accent="text-gold" />
                <Reward icon={Zap} value={`+${result.xp_earned ?? 0}`} label="XP" accent="text-primary" />
              </div>
            )}
            {result.ads_doubled && (
              <p className="flex items-center justify-center gap-1 text-xs font-medium text-[oklch(0.6_0.13_85)] dark:text-gold">
                <Sparkles className="size-3" /> 2× ads bonus applied
              </p>
            )}
          </div>
        ) : (
          <p className="mt-5 text-xs text-muted-foreground">{result?.error ?? "Log in to earn rewards."}</p>
        )}

        <Button onClick={onReplay} variant="gradient" className="mt-6 w-full" disabled={adsPending}>
          <RotateCcw className="size-4" /> Play again
        </Button>
      </motion.div>
    </motion.div>
  );
}

function Reward({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: typeof Coins;
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex-1 rounded-xl bg-muted/50 p-3">
      <Icon className={`mx-auto size-5 ${accent}`} />
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

/** A clearly-labeled simulated rewarded ad. No real ad network is contacted. */
export function SimulatedAd({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [remaining, setRemaining] = useState(5);
  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onDone]);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center rounded-2xl bg-black/85 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gold/30 bg-card p-6 text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-[oklch(0.6_0.13_85)] dark:text-gold">
          <Tv className="size-3.5" /> Rewarded ad · 2× credits
        </div>
        <div className="grid h-40 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary),oklch(0.6_0.2_330))] text-white">
          <div>
            <Play className="mx-auto size-10 opacity-80" />
            <p className="mt-2 text-sm opacity-80">Sample advertisement</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Reward unlocks in {remaining}s…</p>
        <button onClick={onSkip} className="mt-3 text-xs text-muted-foreground underline hover:text-foreground">
          Skip ad
        </button>
      </div>
    </div>
  );
}
