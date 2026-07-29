/**
 * Renders the equipped `effect` cosmetic as a decorative overlay layer. Meant
 * to fill a `relative` container (e.g. the profile banner). Deterministic per
 * index so there is no SSR/client hydration mismatch, pointer-events-none so it
 * never blocks interaction, and hidden entirely under prefers-reduced-motion.
 *
 * Revamped to a Discord-tier bar: layered particles with depth, glow, drift and
 * parallax rather than a single flat stream.
 */

// A tiny deterministic hash so particles look scattered but stay stable across
// SSR/CSR (no Math.random at render time).
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const CONFETTI_COLORS = ["#f472b6", "#22d3ee", "#fbbf24", "#a855f7", "#34d399", "#f97316"];
const MATRIX_GLYPHS = "01ｱｲｳｴｵｶｷｸ日本ﾊﾋﾌﾍ月火水".split("");

function Confetti() {
  const pieces = Array.from({ length: 30 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden data-decorative>
      {pieces.map((_, i) => {
        const left = rand(i + 1) * 100;
        const duration = 2.4 + rand(i + 2) * 1.8;
        const delay = rand(i + 3) * 3;
        const size = 5 + Math.floor(rand(i + 4) * 5);
        const round = rand(i + 5) > 0.6;
        return (
          <span
            key={i}
            className={round ? "absolute top-0 rounded-full" : "absolute top-0 rounded-[2px]"}
            style={{
              left: `${left}%`,
              width: size,
              height: round ? size : size + 3,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              opacity: 0.9,
              animation: `cgh-confetti-fall ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

function Matrix() {
  const columns = Array.from({ length: 20 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,transparent,rgba(0,0,0,0.25))] motion-reduce:hidden" aria-hidden data-decorative>
      {columns.map((_, i) => {
        const left = (i / columns.length) * 100;
        const duration = 2.4 + rand(i + 11) * 2.4;
        const delay = rand(i + 12) * 2.4;
        const len = 5 + Math.floor(rand(i + 13) * 4);
        const glyphs = Array.from({ length: len }, (_, g) => MATRIX_GLYPHS[(i * 3 + g) % MATRIX_GLYPHS.length]);
        return (
          <div
            key={i}
            className="absolute top-0 flex flex-col gap-0.5 font-mono text-[11px] leading-none"
            style={{ left: `${left}%`, animation: `cgh-matrix-fall ${duration}s linear ${delay}s infinite` }}
          >
            {glyphs.map((ch, g) => (
              <span
                key={g}
                style={{
                  color: g === 0 ? "#bbf7d0" : "#22c55e",
                  opacity: 1 - g * (0.9 / len),
                  textShadow: g === 0 ? "0 0 8px #4ade80" : undefined,
                }}
              >
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
  const flakes = Array.from({ length: 34 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden data-decorative>
      {flakes.map((_, i) => {
        const left = rand(i + 21) * 100;
        const depth = rand(i + 22); // 0 = far, 1 = near
        const duration = 4 + depth * 5;
        const delay = rand(i + 23) * 5;
        const size = 2 + depth * 4;
        return (
          <span
            key={i}
            className="absolute top-0 rounded-full bg-white"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              opacity: 0.5 + depth * 0.5,
              filter: depth > 0.6 ? "blur(0.5px)" : "blur(1.5px)",
              boxShadow: depth > 0.6 ? "0 0 6px rgba(255,255,255,0.7)" : undefined,
              animation: `cgh-snow-fall ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

function Embers() {
  const embers = Array.from({ length: 28 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden data-decorative>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgba(249,115,22,0.22),transparent)]" />
      {embers.map((_, i) => {
        const left = rand(i + 31) * 100;
        const duration = 2.6 + rand(i + 32) * 2.4;
        const delay = rand(i + 33) * 3;
        const size = 2 + Math.floor(rand(i + 34) * 3);
        const color = rand(i + 35) > 0.5 ? "#f97316" : "#ef4444";
        return (
          <span
            key={i}
            className="absolute bottom-0 rounded-full"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 8px 1px ${color}`,
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
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden data-decorative>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,0.22),transparent_65%)]" />
      <div
        className="absolute -inset-y-4 -left-1/3 w-1/3 animate-sheen"
        style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)" }}
      />
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${rand(i + 41) * 100}%`,
            top: `${rand(i + 42) * 100}%`,
            width: 3,
            height: 3,
            boxShadow: "0 0 6px 1px rgba(255,255,255,0.9)",
            animationDelay: `${rand(i + 43) * 2.4}s`,
          }}
        />
      ))}
    </div>
  );
}

function Aurora() {
  const curtains = [
    { color: "#22d3ee", left: "-5%", w: 45, delay: 0 },
    { color: "#a855f7", left: "25%", w: 55, delay: 1.1 },
    { color: "#34d399", left: "55%", w: 50, delay: 0.5 },
    { color: "#f472b6", left: "80%", w: 40, delay: 1.7 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden data-decorative>
      {curtains.map((c, i) => (
        <span
          key={i}
          className="absolute -top-1/4 h-[150%] rounded-full opacity-45 blur-2xl"
          style={{
            left: c.left,
            width: `${c.w}%`,
            background: `linear-gradient(to bottom, ${c.color}, transparent 80%)`,
            transformOrigin: "top center",
            animation: `cgh-aurora-sway ${6 + i}s ease-in-out ${c.delay}s infinite`,
          }}
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={`s${i}`}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${rand(i + 51) * 100}%`,
            top: `${rand(i + 52) * 70}%`,
            width: 2,
            height: 2,
            animationDelay: `${rand(i + 53) * 2.4}s`,
          }}
        />
      ))}
    </div>
  );
}

function Fireflies() {
  const dots = Array.from({ length: 22 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden data-decorative>
      {dots.map((_, i) => {
        const left = rand(i + 61) * 100;
        const top = rand(i + 62) * 92;
        const duration = 4 + rand(i + 63) * 4;
        const delay = rand(i + 64) * 4;
        const size = 3 + Math.floor(rand(i + 65) * 3);
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              background: "#fde68a",
              boxShadow: "0 0 10px 3px rgba(252,211,77,0.85)",
              animation: `cgh-firefly-drift ${duration}s ease-in-out ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

export function ProfileEffects({ slug, reduced }: { slug?: string | null; reduced?: boolean }) {
  // CSS hides these for reduced-motion viewers, but hidden particles are still
  // built, sent and hydrated. Skipping the render drops up to 30 elements per
  // effect before they ever reach the browser.
  if (reduced) return null;

  switch (slug) {
    case "effect-confetti":
      return <Confetti />;
    case "effect-matrix":
      return <Matrix />;
    case "effect-snow":
      return <Snow />;
    case "effect-embers":
      return <Embers />;
    case "effect-aurora":
      return <Aurora />;
    case "effect-fireflies":
      return <Fireflies />;
    case "effect-staff-shimmer":
      return <StaffShimmer />;
    default:
      return null;
  }
}
