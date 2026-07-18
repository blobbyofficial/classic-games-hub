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
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
        )}
        <div>
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="focus-visible-ring group flex shrink-0 items-center gap-1 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {hrefLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
