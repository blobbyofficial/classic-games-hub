import Link from "next/link";
import { Joystick, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2", className)} aria-label="Classic Games Hub home">
      <span className="halloween-logo-icon grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary),oklch(0.6_0.2_330))] shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
        <Joystick className="halloween-standard-joystick size-5 text-white" />
        <Ghost className="halloween-brand-ghost hidden size-5 text-[#f3b875]" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="text-[15px] font-bold leading-tight tracking-tight">
          Classic
          <br />
          <span className="halloween-logo-text text-gradient">Games Hub</span>
        </span>
      )}
    </Link>
  );
}
