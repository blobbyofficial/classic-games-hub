import { cn } from "@/lib/utils";

/**
 * Discord-style nameplates: a decorative gradient plate rendered behind a
 * player's name. Keyed to the shop `nameplate` slugs. `text` is the color the
 * name should take when a plate is active so it stays readable on the gradient.
 *
 * `flow` animates a multi-stop gradient, `sheen` adds a travelling light sweep,
 * and `stars` sprinkles a twinkling starfield (galaxy). All motion respects
 * prefers-reduced-motion via `motion-safe:`.
 */
export const NAMEPLATE_STYLES: Record<
  string,
  { plate: string; text: string; flow?: boolean; sheen?: boolean; stars?: boolean }
> = {
  "nameplate-emerald": {
    plate: "bg-[linear-gradient(120deg,#059669,#10b981)]",
    text: "text-white",
  },
  "nameplate-cyber": {
    plate: "bg-[linear-gradient(120deg,#22d3ee,#3b82f6,#22d3ee)] bg-[length:200%_100%] motion-safe:animate-gradient-flow",
    text: "text-white",
    sheen: true,
  },
  "nameplate-sunset": {
    plate: "bg-[linear-gradient(120deg,#f97316,#ec4899,#f97316)] bg-[length:200%_100%] motion-safe:animate-gradient-flow",
    text: "text-white",
    sheen: true,
  },
  "nameplate-royal": {
    plate: "bg-[linear-gradient(120deg,#7c3aed,#f59e0b)]",
    text: "text-white",
  },
  "nameplate-aurora": {
    plate:
      "bg-[linear-gradient(120deg,#22d3ee,#a855f7,#f472b6,#22d3ee)] bg-[length:250%_100%] motion-safe:animate-gradient-flow",
    text: "text-white",
    sheen: true,
  },
  "nameplate-staff": {
    plate: "bg-[linear-gradient(120deg,#f43f5e,#8b5cf6,#f43f5e)] bg-[length:200%_100%] motion-safe:animate-gradient-flow",
    text: "text-white",
    sheen: true,
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
    plate:
      "bg-[linear-gradient(120deg,#4c1d95,#1e1b4b,#0ea5e9,#4c1d95)] bg-[length:250%_100%] motion-safe:animate-gradient-flow",
    text: "text-white",
    stars: true,
  },
};

export function hasNameplate(slug?: string | null): boolean {
  return !!slug && slug in NAMEPLATE_STYLES;
}

// Deterministic scatter for the galaxy starfield (stable across SSR/CSR).
const STAR_POS = [
  { left: "12%", top: "30%", d: "0s" },
  { left: "34%", top: "62%", d: "0.6s" },
  { left: "56%", top: "24%", d: "1.2s" },
  { left: "72%", top: "58%", d: "0.3s" },
  { left: "88%", top: "36%", d: "0.9s" },
];

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
        "relative inline-flex items-center overflow-hidden rounded-lg px-2.5 py-0.5 shadow-sm ring-1 ring-white/15",
        style.plate,
        style.text,
        className,
      )}
    >
      {style.stars && (
        <span className="pointer-events-none absolute inset-0" aria-hidden>
          {STAR_POS.map((s, i) => (
            <span
              key={i}
              className="absolute size-[2px] rounded-full bg-white motion-safe:animate-twinkle"
              style={{ left: s.left, top: s.top, animationDelay: s.d, boxShadow: "0 0 4px 1px rgba(255,255,255,0.9)" }}
            />
          ))}
        </span>
      )}
      {style.sheen && (
        <span
          className="pointer-events-none absolute -inset-y-2 -left-1/3 w-1/3 motion-safe:animate-sheen"
          style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)" }}
          aria-hidden
        />
      )}
      <span className="relative z-10 inline-flex items-center">{children}</span>
    </span>
  );
}
