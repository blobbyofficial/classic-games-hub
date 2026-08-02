import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one empty state for the whole app. Every "nothing here yet" surface -
 * no friends, no messages, no search results, an empty inventory - uses this,
 * so an empty screen always looks intentional rather than broken.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 text-center",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="size-6" />
        </span>
      )}
      <p className="text-base font-semibold">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
