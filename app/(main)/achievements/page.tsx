import type { Metadata } from "next";
import { Award, Lock, Coins, Zap } from "lucide-react";
import { getAllAchievements, getUnlockedAchievementIds } from "@/services/achievements";
import { getSessionUser } from "@/lib/supabase/queries";
import { DynamicIcon } from "@/components/dynamic-icon";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Achievements",
  description: "Unlock achievements by playing games, making friends and climbing levels.",
};

const CATEGORY_LABELS: Record<string, string> = {
  plays: "Playing",
  variety: "Variety",
  levels: "Leveling",
  social: "Social",
  daily: "Daily streaks",
  economy: "Economy",
  mastery: "Mastery",
};

export default async function AchievementsPage() {
  const [user, achievements, unlocked] = await Promise.all([
    getSessionUser(),
    getAllAchievements(),
    getUnlockedAchievementIds(),
  ]);

  const visible = achievements.filter((a) => !a.secret || unlocked.has(a.id));
  const total = achievements.length;
  const done = unlocked.size;
  const percent = total ? (done / total) * 100 : 0;

  const byCategory = visible.reduce<Record<string, typeof visible>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        icon={Award}
        title="Achievements"
        description={user ? `${done} of ${total} unlocked` : `${total} achievements to unlock`}
        className="mb-0"
      />

      {user && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Overall progress</span>
            <span className="tnum text-muted-foreground">{Math.round(percent)}%</span>
          </div>
          <Progress
            value={percent}
            aria-label="Achievements unlocked"
            indicatorClassName="bg-[linear-gradient(90deg,var(--gold),var(--primary))]"
          />
        </div>
      )}

      {Object.entries(byCategory).map(([category, list]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((a) => {
              const isUnlocked = unlocked.has(a.id);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3.5 transition-colors",
                    isUnlocked ? "border-gold/30 bg-gold/5" : "border-border bg-card opacity-80",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-xl",
                      isUnlocked ? "bg-gold/15 text-[oklch(0.6_0.13_85)] dark:text-gold" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isUnlocked ? <DynamicIcon name={a.icon} className="size-6" /> : <Lock className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.name}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-[oklch(0.6_0.13_85)] dark:text-gold">
                        <Coins className="size-3" /> {a.credits_reward}
                      </span>
                      <span className="flex items-center gap-1 text-primary">
                        <Zap className="size-3" /> {a.xp_reward} XP
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
