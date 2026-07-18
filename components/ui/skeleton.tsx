import { cn } from "@/lib/utils";

/** Shimmering placeholder used for loading states across the app. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-[linear-gradient(90deg,transparent,oklch(1_0_0/8%),transparent)] before:bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
