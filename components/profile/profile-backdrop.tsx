/**
 * An animated motion layer for equipped `profile_theme` / `banner` cosmetics.
 * The flat gradient comes from `bannerBackground` on the container; this overlay
 * adds the Discord-tier movement on top - a travelling sheen and drifting colour
 * wash for "flow" themes, or drifting nebulae + a twinkling starfield for
 * "space" themes. pointer-events-none and hidden under prefers-reduced-motion.
 */

type Variant = "flow" | "space" | null;

// Resolve which motion variant applies, mirroring bannerBackground precedence
// (an equipped banner wins over a theme; a solid custom banner has no motion).
function variantFor(equipped?: Record<string, string> | null): Variant {
  const banner = equipped?.banner;
  if (banner) {
    if (banner === "banner-nebula") return "space";
    if (banner === "banner-candy" || banner === "banner-molten") return "flow";
    if (/^#[0-9a-fA-F]{6}$/.test(banner)) return null; // solid custom colour
    if (banner in BANNER_MOTION) return BANNER_MOTION[banner];
    return null;
  }
  const theme = equipped?.profile_theme;
  if (theme && theme in THEME_MOTION) return THEME_MOTION[theme];
  return null;
}

const THEME_MOTION: Record<string, Variant> = {
  "theme-synthwave": "flow",
  "theme-aurora": "flow",
  "theme-ocean": "flow",
  "theme-sunset": "flow",
  "theme-deep-space": "space",
  "theme-midnight": "space",
};

const BANNER_MOTION: Record<string, Variant> = {
  "banner-arcade-floor": "flow",
  "banner-pixel-sunset": "flow",
  "banner-emerald-tide": "flow",
};

const STARS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(Math.sin(i * 12.9898) * 0.5 + 0.5) * 100}%`,
  top: `${(Math.sin(i * 78.233) * 0.5 + 0.5) * 100}%`,
  size: 1 + (i % 3),
  delay: `${(i % 6) * 0.4}s`,
}));

export function ProfileBackdrop({
  equipped,
  reduced,
}: {
  equipped?: Record<string, string> | null;
  reduced?: boolean;
}) {
  const variant = variantFor(equipped);
  if (!variant || reduced) return null;

  if (variant === "space") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden data-decorative>
        <span
          className="absolute -left-10 -top-10 size-48 rounded-full opacity-50 blur-3xl motion-safe:animate-aura-pulse"
          style={{ background: "#7c3aed" }}
        />
        <span
          className="absolute right-0 top-1/3 size-40 rounded-full opacity-40 blur-3xl motion-safe:animate-aura-pulse"
          style={{ background: "#0ea5e9", animationDelay: "1.2s" }}
        />
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white motion-safe:animate-twinkle"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              boxShadow: "0 0 4px 1px rgba(255,255,255,0.8)",
            }}
          />
        ))}
      </div>
    );
  }

  // "flow": a soft drifting colour wash plus a slow diagonal sheen sweep.
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden data-decorative>
      <div
        className="absolute inset-0 opacity-60 mix-blend-soft-light motion-safe:animate-gradient-flow"
        style={{
          background: "linear-gradient(120deg, rgba(255,255,255,0.35), transparent 40%, rgba(255,255,255,0.25) 70%, transparent)",
          backgroundSize: "250% 250%",
        }}
      />
      <div
        className="absolute -inset-y-8 -left-1/3 w-1/3 opacity-70 motion-safe:animate-sheen"
        style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.35), transparent)" }}
      />
    </div>
  );
}
