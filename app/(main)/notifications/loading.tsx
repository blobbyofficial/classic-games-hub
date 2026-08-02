import { PageHeaderSkeleton, ListSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeaderSkeleton />
      <ListSkeleton count={8} />
    </div>
  );
}
