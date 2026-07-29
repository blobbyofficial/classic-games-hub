import { cn } from "@/lib/utils";

/**
 * Avatar decorations (roadmap v1.5.0). These sit on top of the avatar and are
 * allowed to overhang it, which is what separates them from frames - a frame
 * rings the avatar, a decoration wears it.
 *
 * Everything here is inline SVG on a 100x100 viewBox that maps to the avatar's
 * own box, so a decoration scales with whatever size the avatar is rendered at
 * without a single hard-coded pixel. Drawing rather than hosting images also
 * means no extra requests and no blurry upscaling on a retina profile header.
 *
 * Note these are NOT tagged `data-decorative`: reduced motion drops their
 * animation (every animated part is behind `motion-safe:`) but keeps the
 * decoration itself. It is a cosmetic the player bought, not an effect - the
 * setting is there to stop things moving, not to confiscate their crown.
 */

type DecorationRender = (props: { colors: [string, string] }) => React.ReactNode;

const CatEars: DecorationRender = ({ colors: [fur, inner] }) => (
  <>
    <path d="M22 30 L26 6 L46 22 Z" fill={fur} />
    <path d="M27 27 L29 14 L39 22 Z" fill={inner} opacity={0.65} />
    <path d="M78 30 L74 6 L54 22 Z" fill={fur} />
    <path d="M73 27 L71 14 L61 22 Z" fill={inner} opacity={0.65} />
  </>
);

const Halo: DecorationRender = ({ colors: [light, deep] }) => (
  <>
    <ellipse cx="50" cy="9" rx="26" ry="7" fill="none" stroke={deep} strokeWidth="5" opacity={0.5} />
    <ellipse
      cx="50"
      cy="8"
      rx="26"
      ry="7"
      fill="none"
      stroke={light}
      strokeWidth="3.5"
      className="motion-safe:animate-glow-pulse"
    />
  </>
);

const Crown: DecorationRender = ({ colors: [gold, shadow] }) => (
  <>
    <path d="M26 24 L26 8 L38 17 L50 4 L62 17 L74 8 L74 24 Z" fill={gold} stroke={shadow} strokeWidth="2" strokeLinejoin="round" />
    <rect x="26" y="24" width="48" height="6" rx="2" fill={gold} stroke={shadow} strokeWidth="1.5" />
    <circle cx="50" cy="13" r="3" fill={shadow} opacity={0.55} />
  </>
);

const Sparkles: DecorationRender = ({ colors: [a, b] }) => {
  const star = "M0,-7 L1.8,-1.8 L7,0 L1.8,1.8 L0,7 L-1.8,1.8 L-7,0 L-1.8,-1.8 Z";
  return (
    <g className="motion-safe:animate-spin-slow" style={{ transformOrigin: "50px 50px" }}>
      <path d={star} fill={a} transform="translate(50 2) scale(1.1)" />
      <path d={star} fill={b} transform="translate(92 38) scale(0.85)" />
      <path d={star} fill={a} transform="translate(12 66) scale(0.7)" />
    </g>
  );
};

const Flames: DecorationRender = ({ colors: [outer, inner] }) => (
  <g className="motion-safe:animate-glow-pulse">
    <path d="M16 78 C6 62 18 56 14 44 C28 52 26 66 34 70 C32 58 38 52 36 42 C48 54 46 72 40 82 Z" fill={outer} opacity={0.9} />
    <path d="M84 78 C94 62 82 56 86 44 C72 52 74 66 66 70 C68 58 62 52 64 42 C52 54 54 72 60 82 Z" fill={outer} opacity={0.9} />
    <path d="M22 76 C16 64 24 60 22 52 C30 58 29 68 33 71 Z" fill={inner} opacity={0.85} />
    <path d="M78 76 C84 64 76 60 78 52 C70 58 71 68 67 71 Z" fill={inner} opacity={0.85} />
  </g>
);

const Headphones: DecorationRender = ({ colors: [accent, body] }) => (
  <>
    <path
      d="M14 54 A36 36 0 0 1 86 54"
      fill="none"
      stroke={body}
      strokeWidth="9"
      strokeLinecap="round"
    />
    <path
      d="M14 54 A36 36 0 0 1 86 54"
      fill="none"
      stroke={accent}
      strokeWidth="3"
      strokeLinecap="round"
      opacity={0.75}
    />
    <rect x="4" y="48" width="16" height="26" rx="7" fill={body} />
    <rect x="80" y="48" width="16" height="26" rx="7" fill={body} />
    <rect x="8" y="53" width="8" height="16" rx="4" fill={accent} opacity={0.8} />
    <rect x="84" y="53" width="8" height="16" rx="4" fill={accent} opacity={0.8} />
  </>
);

const Storm: DecorationRender = ({ colors: [cloud, bolt] }) => (
  <>
    <g fill={cloud}>
      <ellipse cx="38" cy="14" rx="14" ry="9" />
      <ellipse cx="56" cy="11" rx="16" ry="10" />
      <ellipse cx="68" cy="16" rx="11" ry="7" />
      <rect x="26" y="14" width="52" height="8" rx="4" />
    </g>
    <path
      d="M52 22 L44 36 L50 36 L45 48 L60 32 L53 32 L58 22 Z"
      fill={bolt}
      className="motion-safe:animate-glow-pulse"
    />
  </>
);

/** July 2026 booster drop. Unbuyable; only that month's boosters hold it. */
const Wings: DecorationRender = ({ colors: [outer, inner] }) => (
  <g className="motion-safe:animate-glow-pulse">
    <path d="M20 46 C2 38 -2 58 8 70 C16 80 30 82 38 74 C30 70 24 60 20 46 Z" fill={outer} opacity={0.92} />
    <path d="M22 52 C12 50 8 60 14 68 C20 74 28 74 32 70 C27 66 24 60 22 52 Z" fill={inner} opacity={0.8} />
    <path d="M80 46 C98 38 102 58 92 70 C84 80 70 82 62 74 C70 70 76 60 80 46 Z" fill={outer} opacity={0.92} />
    <path d="M78 52 C88 50 92 60 86 68 C80 74 72 74 68 70 C73 66 76 60 78 52 Z" fill={inner} opacity={0.8} />
  </g>
);

/** Season one reward. Not sold; only earned on the Neon Summer track. */
const Shades: DecorationRender = ({ colors: [lens, accent] }) => (
  <>
    <rect x="18" y="40" width="64" height="7" rx="3.5" fill={lens} />
    <rect x="16" y="42" width="30" height="24" rx="8" fill={lens} />
    <rect x="54" y="42" width="30" height="24" rx="8" fill={lens} />
    <rect x="46" y="46" width="8" height="6" rx="3" fill={lens} />
    <rect x="20" y="46" width="10" height="7" rx="3" fill={accent} opacity={0.85} />
    <rect x="58" y="46" width="10" height="7" rx="3" fill={accent} opacity={0.85} />
  </>
);

const DECORATIONS: Record<string, { render: DecorationRender; colors: [string, string] }> = {
  "deco-shades": { render: Shades, colors: ["#0b0a14", "#f472b6"] },
  "deco-booster-wings": { render: Wings, colors: ["#f472b6", "#a855f7"] },
  "deco-cat-ears": { render: CatEars, colors: ["#f472b6", "#1f2937"] },
  "deco-halo": { render: Halo, colors: ["#fde68a", "#f59e0b"] },
  "deco-crown": { render: Crown, colors: ["#fbbf24", "#b45309"] },
  "deco-sparkles": { render: Sparkles, colors: ["#a78bfa", "#f0abfc"] },
  "deco-flames": { render: Flames, colors: ["#f97316", "#fbbf24"] },
  "deco-headphones": { render: Headphones, colors: ["#38bdf8", "#1e293b"] },
  "deco-storm": { render: Storm, colors: ["#94a3b8", "#fbbf24"] },
};

export function hasDecoration(slug?: string | null): boolean {
  return Boolean(slug && slug in DECORATIONS);
}

/**
 * Overlays the avatar it is placed in. The parent must be `relative` and must
 * NOT clip overflow, or the parts that overhang get cut off - which is the
 * whole point of a decoration.
 */
export function AvatarDecoration({ slug, className }: { slug?: string | null; className?: string }) {
  const deco = slug ? DECORATIONS[slug] : undefined;
  if (!deco) return null;
  const { render: Render, colors } = deco;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("pointer-events-none absolute -inset-[18%] overflow-visible", className)}
      aria-hidden
    >
      <Render colors={colors} />
    </svg>
  );
}
