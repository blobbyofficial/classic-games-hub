import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  href,
  hrefLabel = "View all",
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="hidden size-8 shrink-0 place-items-center text-muted-foreground sm:grid">
            <Icon className="size-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-foreground dark:text-[oklch(0.935_0.016_83)] sm:text-xl">{title}</h2>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <span className="inline">{hrefLabel}</span>
          <ArrowRight className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
