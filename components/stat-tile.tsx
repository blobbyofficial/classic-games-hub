import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  accent = "text-primary",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Optional secondary line — a delta, a rank, a unit. */
  hint?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-xs",
        "transition-[border-color,box-shadow] duration-200 ease-[var(--ease-standard)] hover:border-primary/25 hover:shadow-sm",
        className,
      )}
    >
      {/* A faint brand wash that warms up on hover — enough to make a row of
          tiles feel alive without turning them into buttons. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-primary/5 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className={cn("size-4", accent)} />
        <span className="truncate">{label}</span>
      </div>
      <p className="relative mt-1.5 text-2xl font-bold tnum leading-tight">{value}</p>
      {hint && <p className="relative mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
