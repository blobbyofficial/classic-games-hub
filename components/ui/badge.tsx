import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/12 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-muted-foreground",
        success: "border-success/20 bg-success/12 text-success",
        warning: "border-warning/25 bg-warning/12 text-[oklch(0.5_0.15_75)] dark:text-warning",
        destructive: "border-destructive/20 bg-destructive/12 text-destructive",
        neon: "border-neon/25 bg-neon/12 text-[oklch(0.5_0.13_195)] dark:text-neon",
        gold: "border-gold/25 bg-gold/12 text-[oklch(0.52_0.13_85)] dark:text-gold",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
