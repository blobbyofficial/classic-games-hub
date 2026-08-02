import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-2xl text-card-foreground", {
  variants: {
    variant: {
      /** The default surface: a real card, one step above the page. */
      default: "border border-border bg-card shadow-sm",
      /** Sits flat on the page - for grouping, not for elevation. */
      flat: "border border-border/60 bg-muted/25",
      /** Translucent; for anything overlaying imagery or a gradient. */
      glass: "glass shadow-md",
      /** Unfilled - used for empty states and drop targets. */
      dashed: "border border-dashed border-border bg-transparent",
    },
    /** Adds the lift-on-hover treatment for cards that are themselves links. */
    interactive: { true: "hover-lift", false: "" },
  },
  defaultVariants: { variant: "default", interactive: false },
});

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, interactive, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, interactive }), className)} {...props} />;
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5 sm:p-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold leading-tight", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2 p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
