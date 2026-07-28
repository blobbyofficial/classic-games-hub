import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // 16px on touch keeps iOS Safari from zooming the viewport on focus.
          "flex h-10 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-base shadow-xs sm:text-sm",
          "transition-[border-color,box-shadow,background-color] duration-200 ease-[var(--ease-standard)]",
          "placeholder:text-muted-foreground/80 hover:border-border",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus-visible:border-primary/60 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-0",
          "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
