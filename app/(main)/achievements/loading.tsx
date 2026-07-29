import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, CardGridSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-3 w-full rounded-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <CardGridSkeleton count={4} itemClassName="h-28 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
