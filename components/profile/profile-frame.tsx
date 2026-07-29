import { cn } from "@/lib/utils";

/**
 * Decorative frames around the whole profile card (roadmap v1.5.0).
 *
 * Distinct from `avatar_frame`, which rings the profile picture, and from
 * `decoration`, which sits on top of it. This is the outermost layer: it wraps
 * the entire card. All three can be worn at once, which is why each is its own
 * shop kind - `profiles.equipped` holds one slug per kind.
 *
 * Implemented as a gradient border: the wrapper carries the gradient and a
 * padding ring, and the card sits inside it. Cheaper and sharper than a border
 * image, and it scales with the card at any width. `motion-safe:` gates every
 * animated variant so reduced motion leaves a static frame rather than
 * removing the cosmetic entirely - the same call made for decorations.
 */

interface FrameStyle {
  /** CSS background for the ring itself. */
  gradient: string;
  /** Outer bloom, as a Tailwind shadow utility. */
  glow?: string;
  /** Ring thickness in pixels. */
  width?: number;
  spin?: boolean;
  flow?: boolean;
}

const PROFILE_FRAMES: Record<string, FrameStyle> = {
  "pframe-gold": {
    gradient: "linear-gradient(135deg, #fbbf24, #fde68a 40%, #b45309 75%, #fbbf24)",
    glow: "shadow-[0_0_28px_-6px] shadow-amber-400/50",
    width: 3,
  },
  "pframe-obsidian": {
    gradient: "linear-gradient(135deg, #1f2937, #4b5563 45%, #0b0a12)",
    glow: "shadow-[0_0_24px_-8px] shadow-slate-900/70",
    width: 3,
  },
  "pframe-sakura": {
    gradient: "linear-gradient(135deg, #fbcfe8, #f472b6 45%, #fda4af, #fbcfe8)",
    glow: "shadow-[0_0_28px_-6px] shadow-pink-400/50",
    width: 3,
  },
  "pframe-tide": {
    gradient: "linear-gradient(120deg, #0ea5e9, #22d3ee, #34d399, #0ea5e9)",
    glow: "shadow-[0_0_28px_-6px] shadow-cyan-400/50",
    width: 3,
    flow: true,
  },
  "pframe-ember": {
    gradient: "linear-gradient(120deg, #f97316, #fbbf24, #ef4444, #f97316)",
    glow: "shadow-[0_0_30px_-6px] shadow-orange-500/60",
    width: 3,
    flow: true,
  },
  // Level 40. The only one that rotates, so it reads as the rarest.
  "pframe-prism": {
    gradient: "conic-gradient(from 0deg, #f43f5e, #f59e0b, #22c55e, #3b82f6, #a855f7, #f43f5e)",
    glow: "shadow-[0_0_34px_-4px] shadow-fuchsia-500/60",
    width: 4,
    spin: true,
  },
};

export function hasProfileFrame(slug?: string | null): boolean {
  return Boolean(slug && slug in PROFILE_FRAMES);
}

/**
 * Wraps the profile card. Renders children untouched when nothing is equipped,
 * so an unframed profile pays for no extra element.
 */
export function ProfileFrame({
  slug,
  children,
}: {
  slug?: string | null;
  children: React.ReactNode;
}) {
  const frame = slug ? PROFILE_FRAMES[slug] : undefined;
  if (!frame) return <>{children}</>;

  const width = frame.width ?? 3;

  return (
    <div className={cn("relative rounded-3xl", frame.glow)}>
      {/* The ring sits behind the card and pokes out by `width`, rather than
          the card sitting inside a padded parent. That matters for the spinning
          variant: rotating a padding box would carry the card around with it,
          whereas rotating a layer behind it leaves the card still. Same
          approach as the animated avatar frames in components/ui/avatar.tsx. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute rounded-[1.75rem]",
          frame.spin && "motion-safe:animate-spin-slow",
          frame.flow && "bg-[length:200%_200%] motion-safe:animate-gradient-flow",
        )}
        style={{ inset: -width, background: frame.gradient }}
      />
      <div className="relative overflow-hidden rounded-3xl">{children}</div>
    </div>
  );
}
