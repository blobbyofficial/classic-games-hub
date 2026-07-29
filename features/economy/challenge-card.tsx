"use client";

import { useState, useTransition } from "react";
import { Coins, Zap, Check, Target, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";
import { claimChallenge } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ChallengeWithProgress } from "@/services/achievements";

export function ChallengeCard({ challenge }: { challenge: ChallengeWithProgress }) {
  const [claimed, setClaimed] = useState(challenge.claimed);
  const [pending, start] = useTransition();
  const profile = useSessionStore((s) => s.profile);
  const setCredits = useSessionStore((s) => s.setCredits);

  const target = challenge.requirement.target;
  const pct = Math.min(100, (challenge.progress / target) * 100);

  // Booster-only challenges (0046) stay visible to everyone - they advertise
  // the perk - but claim_challenge is what actually enforces eligibility.
  const boosterOnly = challenge.booster_only;
  const canClaimBooster =
    profile != null &&
    (profile.booster_since != null || profile.role === "admin" || profile.role === "moderator");
  const locked = boosterOnly && !canClaimBooster;

  const claim = () =>
    start(async () => {
      const res = await claimChallenge(challenge.id);
      if (!res.ok) {
        toast.error(res.error ?? "Could not claim");
        return;
      }
      setClaimed(true);
      if (profile && typeof res.credits === "number") setCredits(profile.credits + res.credits);
      toast.success(`+${res.credits} credits · +${res.xp} XP`);
    });

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        challenge.completed && !claimed ? "border-primary/40 bg-primary/5" : "border-border bg-card",
        boosterOnly && "border-fuchsia-500/40 bg-fuchsia-500/5",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg",
            boosterOnly ? "bg-fuchsia-500/10 text-fuchsia-500" : "bg-primary/10 text-primary",
          )}
        >
          {boosterOnly ? <Sparkles className="size-5" /> : <Target className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            {challenge.name}
            {boosterOnly && (
              <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-500">
                Boosters
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{challenge.description}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-xs">
          <span className="flex items-center gap-1 font-medium text-[oklch(0.6_0.13_85)] dark:text-gold">
            <Coins className="size-3" /> {challenge.credits_reward}
          </span>
          <span className="flex items-center gap-1 font-medium text-primary">
            <Zap className="size-3" /> {challenge.xp_reward}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={pct} className="h-2 flex-1" />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {Math.min(challenge.progress, target)}/{target}
        </span>
        {claimed ? (
          <Button size="sm" variant="secondary" disabled>
            <Check /> Claimed
          </Button>
        ) : locked ? (
          <Button size="sm" variant="outline" disabled title="Boost the Discord server to claim this">
            <Lock /> Boosters
          </Button>
        ) : challenge.completed ? (
          <Button size="sm" variant="gradient" onClick={claim} disabled={pending}>
            {pending ? "…" : "Claim"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            In progress
          </Button>
        )}
      </div>
    </div>
  );
}
