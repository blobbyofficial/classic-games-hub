import { PageHeaderSkeleton, CardGridSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={8} itemClassName="h-48 rounded-2xl" />
    </div>
  );
}
