import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, ListSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-11 w-full rounded-2xl" />
      <ListSkeleton count={6} />
    </div>
  );
}
