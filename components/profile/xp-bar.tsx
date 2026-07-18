import { levelProgress, formatNumber } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function XpBar({ xp, level, showNumbers = true }: { xp: number; level: number; showNumbers?: boolean }) {
  const { current, needed, percent } = levelProgress(xp, level);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-primary">Level {level}</span>
        {showNumbers && (
          <span className="text-muted-foreground tabular-nums">
            {formatNumber(Math.round(current))} / {formatNumber(needed)} XP
          </span>
        )}
      </div>
      <Progress value={percent} />
    </div>
  );
}
