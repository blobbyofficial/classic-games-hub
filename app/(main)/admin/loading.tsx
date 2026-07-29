import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";

/**
 * One skeleton for the whole admin area: every admin page shares the same
 * header-plus-panels furniture, so a per-page file would be the same markup
 * twelve times over.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-11 w-full rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
