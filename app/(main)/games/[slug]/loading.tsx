import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonRegion label="Loading the game" className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-5 w-24" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3.5">
        <Skeleton className="hidden size-11 rounded-2xl sm:block" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="mx-auto aspect-square w-full max-w-[530px] rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </SkeletonRegion>
  );
}
