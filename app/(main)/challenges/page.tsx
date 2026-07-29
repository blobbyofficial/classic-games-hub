import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Target, Flame, CalendarRange } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { getActiveChallenges } from "@/services/achievements";
import { getDailyRewardStatus } from "@/services/economy";
import { ChallengeCard } from "@/features/economy/challenge-card";
import { DailyRewardCard } from "@/features/economy/daily-reward-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/challenges");

  const [challenges, daily] = await Promise.all([getActiveChallenges(), getDailyRewardStatus()]);

  const dailyChallenges = challenges.filter((c) => c.kind !== "weekly");
  const weeklyChallenges = challenges.filter((c) => c.kind === "weekly");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        icon={Target}
        title="Challenges"
        description="Complete daily and weekly goals for bonus rewards."
        className="mb-0"
      />

      <DailyRewardCard alreadyClaimed={daily.claimed} streak={daily.streak} />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Flame className="size-4 text-orange-500" /> Today&apos;s challenges
        </h2>
        {dailyChallenges.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="No challenges yet today"
            description="Play a game to generate today's challenges, then check back here."
            compact
          />
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
