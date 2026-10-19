import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The same SVG serves the favicon and every shared site wordmark.
 * next/image is unoptimized so it references /icon.svg directly and preserves
 * SVG animation if the source artwork is later replaced with an animated SVG.
 */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("group flex min-w-0 items-center gap-2", className)} aria-label="Classic Games Hub home">
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#0b0c10] ring-1 ring-white/10">
        <Image
          src="/icon.svg"
          alt=""
          aria-hidden="true"
          width={36}
          height={36}
          unoptimized
          className="size-full object-contain"
        />
      </span>
      {!compact && (
        <span className="text-[15px] font-bold leading-tight tracking-tight">
          Classic
          <br />
          <span className="halloween-logo-text text-foreground">Games Hub</span>
        </span>
      )}
    </Link>
  );
}
