import Link from "next/link";
import { Joystick } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2", className)} aria-label="Classic Games Hub home">
      <span className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary),oklch(0.6_0.2_330))] shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
        <Joystick className="size-5 text-white" />
      </span>
      {!compact && (
        <span className="text-[15px] font-bold leading-tight tracking-tight">
          Classic
          <br />
          <span className="text-gradient">Games Hub</span>
        </span>
      )}
    </Link>
  );
}
