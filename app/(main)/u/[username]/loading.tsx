import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonRegion label="Loading profile" className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="flex items-end gap-4 px-4">
        <Skeleton className="-mt-16 size-28 rounded-full border-4 border-background" />
        <div className="space-y-2 pb-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </SkeletonRegion>
  );
}
