import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Route skeletons were duplicating the same header markup, so the shapes every
 * page shares live here. The point of a route-shaped skeleton over a generic
 * spinner is that the layout doesn't jump when the real content lands - so
 * these mirror the real headers' sizes, not just "a grey box".
 */

/** The icon-tile + title + subtitle header most pages under (main) open with. */
export function PageHeaderSkeleton({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-11 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        {subtitle && <Skeleton className="h-4 w-64" />}
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  count = 8,
  className,
  itemClassName = "h-40 rounded-2xl",
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 6, itemClassName = "h-16 rounded-2xl" }: { count?: number; itemClassName?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  );
}

export function TabsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-28 rounded-full" />
      ))}
    </div>
  );
}
