import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeaderSkeleton />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-2xl" />
      ))}
    </div>
  );
}
