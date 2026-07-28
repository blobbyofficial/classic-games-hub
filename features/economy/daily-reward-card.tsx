"use client";

import { useState, useTransition } from "react";
import { Gift, Flame, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { claimDailyReward } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ScoreResult } from "@/types";

export function DailyRewardCard({
  alreadyClaimed,
  streak,
}: {
  alreadyClaimed: boolean;
  streak: number;
}) {
  const [claimed, setClaimed] = useState(alreadyClaimed);
  const [currentStreak, setStreak] = useState(streak);
  const [pending, start] = useTransition();
  const setCredits = useSessionStore((s) => s.setCredits);
  const profile = useSessionStore((s) => s.profile);

  const claim = () =>
    start(async () => {
      const res = (await claimDailyReward()) as ScoreResult & { credits?: number; streak?: number };
      if (!res.ok) {
        toast.error(res.error ?? "Could not claim reward");
        if (res.error?.includes("Already")) setClaimed(true);
        return;
      }
      setClaimed(true);
      setStreak(res.streak ?? currentStreak + 1);
      if (profile && res.credits) setCredits(profile.credits + res.credits);
      toast.success(`+${res.credits} credits!`, {
        description: `Day ${res.streak} streak`,
        icon: <Sparkles className="size-4" />,
      });
    });

  return (
    <Card className="relative overflow-hidden border-gold/30 bg-[linear-gradient(135deg,oklch(0.8_0.14_85/12%),transparent)] p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gold/10 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gold/15 text-[oklch(0.6_0.13_85)] dark:text-gold">
          <Gift className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold">Daily reward</h3>
            {currentStreak > 1 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-500">
                <Flame className="size-3.5" /> {currentStreak} day streak
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {claimed
              ? "Claimed — come back tomorrow to keep your streak alive."
              : "Claim free credits every day. Streaks pay more."}
          </p>
        </div>
        <Button
          variant={claimed ? "outline" : "gradient"}
          onClick={claim}
          disabled={claimed}
          loading={pending}
          className="shrink-0"
        >
          {claimed ? "Claimed" : "Claim"}
        </Button>
      </div>
    </Card>
  );
}
