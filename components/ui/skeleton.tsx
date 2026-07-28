import { cn } from "@/lib/utils";

/**
 * Shimmering placeholder used for loading states across the app.
 *
 * The sweep is a pseudo-element transform rather than an animated gradient
 * position, so a screenful of skeletons stays on the compositor instead of
 * repainting every frame — which is what makes them cheap on low-end phones.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-[linear-gradient(90deg,transparent,oklch(1_0_0/10%),transparent)]",
        "motion-safe:before:animate-skeleton",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Wrapper that announces a loading region to assistive technology. Skeletons
 * themselves are `aria-hidden`, so without this a screen reader hears nothing
 * at all while a route streams in.
 */
function SkeletonRegion({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export { Skeleton, SkeletonRegion };
