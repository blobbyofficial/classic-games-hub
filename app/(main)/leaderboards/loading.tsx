import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonRegion label="Loading leaderboards" className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3.5">
        <Skeleton className="hidden size-11 rounded-2xl sm:block" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-3 items-end gap-3">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </SkeletonRegion>
  );
}
