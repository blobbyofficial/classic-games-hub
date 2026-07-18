import Link from "next/link";
import { Swords, Puzzle, Crosshair, Gamepad2 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";

const ICONS = { Arcade: Gamepad2, Puzzle: Puzzle, Strategy: Swords, Shooter: Crosshair };
const GRADS: Record<string, string> = {
  Arcade: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
  Puzzle: "from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20",
  Strategy: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
  Shooter: "from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20",
};

export function CategoryRail() {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold tracking-tight sm:text-xl">Browse by category</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const Icon = ICONS[cat];
          return (
            <Link
              key={cat}
              href={`/games?category=${cat}`}
              className={`focus-visible-ring group flex items-center gap-3 rounded-2xl border bg-gradient-to-br p-4 transition-transform hover:-translate-y-0.5 ${GRADS[cat]}`}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-background/40 backdrop-blur-sm">
                <Icon className="size-5" />
              </span>
              <span className="font-semibold text-foreground">{cat}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
