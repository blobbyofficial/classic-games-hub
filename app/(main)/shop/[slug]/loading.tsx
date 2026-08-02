import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-5 w-32" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="aspect-[4/3] rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-11 w-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
