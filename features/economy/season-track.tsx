"use client";

import { useState, useTransition } from "react";
import { Check, Gift, Lock } from "lucide-react";
import { toast } from "sonner";
import { claimSeasonTier } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DeferredSpinner } from "@/components/ui/deferred";
import { cn, formatNumber, RARITY_META } from "@/lib/utils";
import type { Season } from "@/services/shop";

/**
 * The season track: tiers unlocked by season XP, each claimed once.
 *
 * Season XP comes from the server derived off play sessions in the season
 * window, and claim_season_tier() re-derives it before paying out - so this
 * component only decides what to show. A stale page cannot claim a tier that
 * has not been reached.
 */
export function SeasonTrack({ season }: { season: Season }) {
  const [claimed, setClaimed] = useState<number[]>(
    season.tiers.filter((t) => t.claimed).map((t) => t.tier),
  );
  const [pending, start] = useTransition();
  const setCredits = useSessionStore((s) => s.setCredits);

  const top = season.tiers[season.tiers.length - 1]?.xp_required ?? 0;
  const percent = top ? Math.min(100, (season.xp / top) * 100) : 0;
  const ends = new Date(season.ends_at);
  const daysLeft = Math.max(0, Math.ceil((ends.getTime() - Date.now()) / 86_400_000));

  const claim = (tier: number) => {
    start(async () => {
      const res = await claimSeasonTier(tier);
      if (!res.ok) return void toast.error(res.error ?? "Could not claim that tier");
      setClaimed((c) => [...c, tier]);
      if (typeof res.balance === "number") setCredits(res.balance);
      toast.success(`Tier ${tier} claimed!`);
    });
  };

  return (
    <section className="rounded-2xl border border-primary/40 bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <DynamicIcon name={season.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{season.name}</h2>
          <p className="text-sm text-muted-foreground">{season.description}</p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </Badge>
      </div>

      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium tabular-nums">{formatNumber(season.xp)} season XP</span>
        <span className="text-muted-foreground tabular-nums">{formatNumber(top)}</span>
      </div>
      <Progress value={percent} className="mb-4 h-2" />

      <ol className="space-y-2">
        {season.tiers.map((t) => {
          const done = claimed.includes(t.tier);
          const reached = season.xp >= t.xp_required;
          return (
            <li
              key={t.tier}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2",
                done ? "border-success/40 bg-success/5" : reached ? "border-primary/50" : "border-border/60",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold tabular-nums",
                  reached ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {t.tier}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {t.reward_credits > 0 && <b>{formatNumber(t.reward_credits)} credits</b>}
                  {t.reward_credits > 0 && t.reward_item && " + "}
                  {t.reward_item && (
                    <b className={cn(RARITY_META[t.reward_item.rarity]?.color)}>
                      {t.reward_item.name}
                    </b>
                  )}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatNumber(t.xp_required)} season XP
                </p>
              </div>
              {done ? (
                <Badge variant="secondary" className="border-success/40 text-success">
                  <Check className="size-3" /> Claimed
                </Badge>
              ) : (
                <Button size="sm" disabled={!reached || pending} onClick={() => claim(t.tier)}>
                  {pending ? <DeferredSpinner /> : reached ? <Gift className="size-4" /> : <Lock className="size-4" />}
                  {reached ? "Claim" : "Locked"}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
