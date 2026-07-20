/**
 * Renders the equipped `effect` cosmetic as a decorative overlay layer. Meant
 * to fill a `relative` container (e.g. the profile banner). Deterministic per
 * index so there is no SSR/client hydration mismatch, pointer-events-none so it
 * never blocks interaction, and hidden entirely under prefers-reduced-motion.
 */

const CONFETTI_COLORS = ["#f472b6", "#22d3ee", "#fbbf24", "#a855f7", "#34d399"];
const MATRIX_GLYPHS = "01ｱｲｳｴｵｶｷｸ日本ﾊﾋﾌﾍ".split("");

function Confetti() {
  const pieces = Array.from({ length: 18 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
      {pieces.map((_, i) => {
        const left = (i / pieces.length) * 100;
        const duration = 2.6 + (i % 5) * 0.35;
        const delay = (i % 7) * 0.4;
        const size = 6 + (i % 3) * 2;
        return (
          <span
            key={i}
            className="absolute top-0 rounded-[2px]"
            style={{
              left: `${left}%`,
              width: size,
              height: size + 2,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animation: `cgh-confetti-fall ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

function Matrix() {
  const columns = Array.from({ length: 14 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
      {columns.map((_, i) => {
        const left = (i / columns.length) * 100;
        const duration = 2.8 + (i % 6) * 0.5;
        const delay = (i % 5) * 0.6;
        const glyphs = Array.from({ length: 6 }, (_, g) => MATRIX_GLYPHS[(i + g) % MATRIX_GLYPHS.length]);
        return (
          <div
            key={i}
            className="absolute top-0 flex flex-col gap-1 font-mono text-[11px] leading-none text-emerald-400/80"
            style={{ left: `${left}%`, animation: `cgh-matrix-fall ${duration}s linear ${delay}s infinite` }}
          >
            {glyphs.map((ch, g) => (
              <span key={g} style={{ opacity: 1 - g * 0.14 }}>
                {ch}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Snow() {
  const flakes = Array.from({ length: 22 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
      {flakes.map((_, i) => {
        const left = (i / flakes.length) * 100;
        const duration = 4 + (i % 6) * 0.7;
        const delay = (i % 8) * 0.5;
        const size = 3 + (i % 3);
        return (
          <span
            key={i}
            className="absolute top-0 rounded-full bg-white/90"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              animation: `cgh-snow-fall ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

function Embers() {
  const embers = Array.from({ length: 20 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
      {embers.map((_, i) => {
        const left = (i / embers.length) * 100;
        const duration = 3 + (i % 5) * 0.6;
        const delay = (i % 7) * 0.45;
        const size = 3 + (i % 3);
        const color = i % 2 === 0 ? "#f97316" : "#ef4444";
        return (
          <span
            key={i}
            className="absolute bottom-0 rounded-full"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 6px 1px ${color}`,
              animation: `cgh-ember-rise ${duration}s ease-out ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

function StaffShimmer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,0.18),transparent_60%)]" />
    </div>
  );
}

export function ProfileEffects({ slug }: { slug?: string | null }) {
  switch (slug) {
    case "effect-confetti":
      return <Confetti />;
    case "effect-matrix":
      return <Matrix />;
    case "effect-snow":
      return <Snow />;
    case "effect-embers":
      return <Embers />;
    case "effect-staff-shimmer":
      return <StaffShimmer />;
    default:
      return null;
  }
}
