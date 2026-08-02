import { cn } from "@/lib/utils";

/**
 * The equipped `entrance` cosmetic: how a profile card arrives when someone
 * opens it (roadmap v1.5.0, "more expressive extras").
 *
 * Pure CSS keyframes, declared in styles/globals.css and referenced as theme
 * animations, so there is no JavaScript on the page for this at all. Every
 * variant is gated behind `motion-safe:`, which means reduced motion gets the
 * card already in place rather than a card that opens at zero opacity and
 * never resolves - the failure mode of animating with an inline style instead.
 *
 * Sits outside ProfileFrame in the tree so the frame animates in with the
 * card rather than being left behind.
 */

interface Entrance {
  /** Theme animation utility applied to the wrapper. */
  animation: string;
  /** Optional light band that rides across the card as it lands. */
  band?: string;
}

const ENTRANCES: Record<string, Entrance> = {
  "entrance-rise": { animation: "motion-safe:animate-entrance-rise" },
  "entrance-unfold": { animation: "motion-safe:animate-entrance-unfold" },
  "entrance-sweep": {
    animation: "motion-safe:animate-entrance-sweep",
    band: "linear-gradient(100deg, transparent 42%, rgba(255,255,255,0.4) 50%, transparent 58%)",
  },
  "entrance-glitch": { animation: "motion-safe:animate-entrance-glitch" },
  "entrance-warp": { animation: "motion-safe:animate-entrance-warp" },
};

export function hasEntrance(slug?: string | null): boolean {
  return Boolean(slug && slug in ENTRANCES);
}

/**
 * Renders children untouched when nothing is equipped, so an ordinary profile
 * pays for no extra element.
 */
export function ProfileEntrance({
  slug,
  children,
}: {
  slug?: string | null;
  children: React.ReactNode;
}) {
  const entrance = slug ? ENTRANCES[slug] : undefined;
  if (!entrance) return <>{children}</>;

  return (
    <div className={cn("relative", entrance.animation)}>
      {children}
      {entrance.band && (
        <span
          aria-hidden
          data-decorative
          className="pointer-events-none absolute inset-0 rounded-3xl bg-[length:260%_100%] motion-safe:animate-entrance-sweep-band motion-reduce:hidden"
          style={{ backgroundImage: entrance.band }}
        />
      )}
    </div>
  );
}
