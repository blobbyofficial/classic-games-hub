import Link from "next/link";
import { Swords, Puzzle, Crosshair, Gamepad2, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";

const ICONS = { Arcade: Gamepad2, Puzzle: Puzzle, Strategy: Swords, Shooter: Crosshair };

/** Per-category tint. Kept as full class strings so Tailwind can see them. */
const TINTS: Record<string, string> = {
  Arcade: "from-cyan-500/15 to-transparent text-cyan-500 border-cyan-500/25 dark:text-cyan-400",
  Puzzle: "from-violet-500/15 to-transparent text-violet-500 border-violet-500/25 dark:text-violet-400",
  Strategy:
    "from-emerald-500/15 to-transparent text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
  Shooter: "from-rose-500/15 to-transparent text-rose-500 border-rose-500/25 dark:text-rose-400",
};

const BLURBS: Record<string, string> = {
  Arcade: "Fast runs, high scores",
  Puzzle: "Take your time",
  Strategy: "Outthink the board",
  Shooter: "Aim and react",
};

export function CategoryRail() {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold sm:text-xl">Browse by category</h2>
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = ICONS[cat];
          return (
            <Link
              key={cat}
              href={`/games?category=${cat}`}
              className={`hover-lift group flex items-center gap-3 rounded-2xl border bg-gradient-to-br p-4 ${TINTS[cat]}`}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background/50 backdrop-blur-sm transition-transform duration-300 ease-[var(--ease-spring)] motion-safe:group-hover:scale-110">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-foreground">{cat}</span>
                <span className="hidden truncate text-xs text-muted-foreground sm:block">
                  {BLURBS[cat]}
                </span>
              </span>
              <ArrowRight className="ml-auto hidden size-4 shrink-0 opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-70 sm:block" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
