import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The masthead every top-level page opens with. Fixing the icon size, title
 * scale and action alignment in one place is what stops eight pages drifting
 * into eight slightly different headers.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Filters, tabs or stats that belong to the header rather than the page body. */
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("mb-7", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* The icon sits on the title's line, not centred against the whole
              block - otherwise a two-line description drags it out of alignment. */}
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:grid">
                <Icon className="size-5" />
              </span>
            )}
            <h1 className="truncate text-title font-bold">{title}</h1>
          </div>
          {description && (
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground sm:pl-13">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}
