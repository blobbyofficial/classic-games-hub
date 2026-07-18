import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const px = size === "sm" ? "size-3.5" : "size-5";
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`Rated ${value.toFixed(1)} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            px,
            i <= Math.round(value) ? "fill-gold text-gold" : "fill-transparent text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}
