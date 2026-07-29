import { PageHeaderSkeleton, ListSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeaderSkeleton />
      <ListSkeleton count={5} itemClassName="h-24 rounded-2xl" />
    </div>
  );
}
