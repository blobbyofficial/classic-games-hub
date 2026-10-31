import { levelProgress, formatNumber } from "@/lib/utils";
export function XpBar({ xp, level, showNumbers = true }: { xp: number; level: number; showNumbers?: boolean }) {
  const { current, needed, percent } = levelProgress(xp, level);
  const value = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  return (
    <div className="w-full space-y-2 rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <strong className="font-semibold tracking-tight">Level {level}</strong>
        {showNumbers && <span className="tabular-nums text-xs text-muted-foreground">{formatNumber(Math.round(current))} / {formatNumber(needed)} XP</span>}
      </div>
      <div role="progressbar" aria-label={`Progress to level ${level + 1}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${value}%` }} />
      </div>
      {showNumbers && <p className="text-xs text-muted-foreground">{formatNumber(Math.max(0, Math.ceil(needed - current)))} XP until level {level + 1}</p>}
    </div>
  );
}
