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
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5",
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
