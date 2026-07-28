import { cn } from "@/lib/utils";
import { GameCard } from "./game-card";
import type { GameWithMeta } from "@/types";

export function GameGrid({
  games,
  favorites,
  className,
  priorityCount = 0,
}: {
  games: GameWithMeta[];
  favorites?: Set<string>;
  className?: string;
  priorityCount?: number;
}) {
  return (
    <div
      className={cn(
        // auto-fill rather than fixed column counts: the grid stays sensible at
        // every width, including the awkward 900–1100px tablet range.
        "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] sm:gap-4",
        "stagger",
        className,
      )}
    >
      {games.map((game, i) => (
        <GameCard
          key={game.id}
          game={game}
          isFavorite={favorites?.has(game.id)}
          priority={i < priorityCount}
        />
      ))}
    </div>
  );
}
