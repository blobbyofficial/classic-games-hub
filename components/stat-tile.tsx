import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
  accent = "text-primary",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={cn("size-4", accent)} />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
