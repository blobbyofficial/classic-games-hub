import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-52 w-full rounded-3xl" />
      <div>
        <Skeleton className="mb-4 h-7 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[8/5] rounded-2xl" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="mb-4 h-7 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
