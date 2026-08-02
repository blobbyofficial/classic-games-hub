import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}
