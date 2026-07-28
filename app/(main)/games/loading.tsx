import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonRegion label="Loading the game library" className="space-y-6">
      <div className="flex items-center gap-3.5">
        <Skeleton className="hidden size-11 rounded-2xl sm:block" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] sm:gap-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[8/5] rounded-2xl" />
        ))}
      </div>
    </SkeletonRegion>
  );
}
