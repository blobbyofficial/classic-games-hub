import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Target, Flame, CalendarRange } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { getActiveChallenges } from "@/services/achievements";
import { getDailyRewardStatus } from "@/services/economy";
import { ChallengeCard } from "@/features/economy/challenge-card";
import { DailyRewardCard } from "@/features/economy/daily-reward-card";

export const metadata: Metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/challenges");

  const [challenges, daily] = await Promise.all([getActiveChallenges(), getDailyRewardStatus()]);

  const dailyChallenges = challenges.filter((c) => c.kind !== "weekly");
  const weeklyChallenges = challenges.filter((c) => c.kind === "weekly");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Target className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
          <p className="text-sm text-muted-foreground">Complete daily & weekly goals for bonus rewards.</p>
        </div>
      </div>

      <DailyRewardCard alreadyClaimed={daily.claimed} streak={daily.streak} />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Flame className="size-4 text-orange-500" /> Today&apos;s challenges
        </h2>
        {dailyChallenges.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Play a game to generate today&apos;s challenges, then check back here!
            </p>
          </div>
        ) : (
          dailyChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)
        )}
      </section>

      {weeklyChallenges.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CalendarRange className="size-4 text-primary" /> This week
          </h2>
          {weeklyChallenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </section>
      )}
    </div>
  );
}
