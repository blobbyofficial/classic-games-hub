import { cn } from "@/lib/utils";

/**
 * Display-name styles: a curated set of font/glow/gradient treatments applied
 * to a player's name. Stored in `equipped.name_style`. Gradient variants use
 * background-image + -webkit-text-fill-color so they clip to the glyphs.
 */
export const NAME_STYLES: Record<string, { label: string; className: string }> = {
  none: { label: "Default", className: "" },
  gold: {
    label: "Gold",
    className:
      "bg-[linear-gradient(120deg,#f59e0b,#fde68a,#f59e0b)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]",
  },
  neon: { label: "Neon glow", className: "text-primary [text-shadow:0_0_14px_var(--primary)]" },
  fire: {
    label: "Fire",
    className:
      "bg-[linear-gradient(120deg,#ef4444,#f97316,#fde047)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]",
  },
  ocean: {
    label: "Ocean",
    className:
      "bg-[linear-gradient(120deg,#22d3ee,#3b82f6)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]",
  },
  rainbow: {
    label: "Rainbow",
    className:
      "bg-[linear-gradient(120deg,#f43f5e,#f59e0b,#22c55e,#3b82f6,#a855f7)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent] motion-safe:animate-glow-pulse",
  },
  serif: { label: "Elegant", className: "font-serif italic" },
  mono: { label: "Mono", className: "font-mono tracking-tight" },
};

export function NameStyle({
  style,
  className,
  children,
}: {
  style?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const meta = style ? NAME_STYLES[style] : undefined;
  if (!meta || !meta.className) return <>{children}</>;
  return <span className={cn(meta.className, className)}>{children}</span>;
}
