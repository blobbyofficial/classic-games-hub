import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonRegion label="Loading conversations" className="space-y-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="hidden size-11 rounded-2xl sm:block" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="size-16 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-18 rounded-xl" />
        ))}
      </div>
    </SkeletonRegion>
  );
}
