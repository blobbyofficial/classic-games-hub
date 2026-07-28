import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
    "transition-[background-color,box-shadow,color,transform,opacity,border-color] duration-200 ease-[var(--ease-standard)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // A press is felt, not watched: a small, fast scale that reduced-motion drops.
    "motion-safe:active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        outline:
          "border border-border bg-transparent shadow-xs hover:border-primary/40 hover:bg-accent/60 hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/70",
        ghost: "hover:bg-accent/60 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "glass text-foreground shadow-sm hover:bg-accent/40 hover:shadow-md",
        gradient:
          "bg-[linear-gradient(120deg,var(--primary),oklch(0.6_0.2_330))] text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:brightness-[1.08]",
      },
      size: {
        default: "h-10 px-4 text-sm [&_svg]:size-4",
        sm: "h-8 rounded-md px-3 text-xs [&_svg]:size-3.5",
        lg: "h-12 rounded-xl px-7 text-base [&_svg]:size-[18px]",
        icon: "size-10 [&_svg]:size-4",
        "icon-sm": "size-8 rounded-md [&_svg]:size-4",
        "icon-lg": "size-12 rounded-xl [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and blocks interaction without collapsing the button's width. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    // `asChild` hands rendering to the child element, so there is nowhere to put
    // a spinner — callers that need one should render a real button.
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {/* The label keeps its box while loading so the button doesn't resize
            mid-interaction and shift whatever sits next to it. */}
        <span className={cn("inline-flex items-center gap-2 transition-opacity", loading && "opacity-0")}>
          {children}
        </span>
        {loading && (
          <span className="absolute inset-0 grid place-items-center">
            <Spinner label="Loading" />
          </span>
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
