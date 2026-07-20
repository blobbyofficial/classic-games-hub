import { cn } from "@/lib/utils";

/**
 * Discord-style nameplates: a decorative gradient plate rendered behind a
 * player's name. Keyed to the shop `nameplate` slugs. `text` is the color the
 * name should take when a plate is active so it stays readable on the gradient.
 */
export const NAMEPLATE_STYLES: Record<string, { plate: string; text: string }> = {
  "nameplate-emerald": {
    plate: "bg-[linear-gradient(120deg,#059669,#10b981)]",
    text: "text-white",
  },
  "nameplate-cyber": {
    plate: "bg-[linear-gradient(120deg,#22d3ee,#3b82f6)]",
    text: "text-white",
  },
  "nameplate-sunset": {
    plate: "bg-[linear-gradient(120deg,#f97316,#ec4899)]",
    text: "text-white",
  },
  "nameplate-royal": {
    plate: "bg-[linear-gradient(120deg,#7c3aed,#f59e0b)]",
    text: "text-white",
  },
  "nameplate-aurora": {
    plate: "bg-[linear-gradient(120deg,#22d3ee,#a855f7,#f472b6)] animate-glow-pulse",
    text: "text-white",
  },
  "nameplate-staff": {
    plate: "bg-[linear-gradient(120deg,#f43f5e,#8b5cf6)]",
    text: "text-white",
  },
  "nameplate-mono": {
    plate: "bg-[linear-gradient(120deg,#334155,#0f172a)]",
    text: "text-white",
  },
  "nameplate-bubblegum": {
    plate: "bg-[linear-gradient(120deg,#f472b6,#f9a8d4)]",
    text: "text-slate-900",
  },
  "nameplate-galaxy": {
    plate: "bg-[linear-gradient(120deg,#4c1d95,#1e1b4b,#0ea5e9)]",
    text: "text-white",
  },
};

export function hasNameplate(slug?: string | null): boolean {
  return !!slug && slug in NAMEPLATE_STYLES;
}

/**
 * Wraps a name in an equipped nameplate. When no (or unknown) plate is
 * equipped, renders the children unchanged so callers can use it everywhere.
 */
export function Nameplate({
  slug,
  className,
  children,
}: {
  slug?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const style = slug ? NAMEPLATE_STYLES[slug] : undefined;
  if (!style) return <>{children}</>;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-0.5 shadow-sm ring-1 ring-white/15",
        style.plate,
        style.text,
        className,
      )}
    >
      {children}
    </span>
  );
}
