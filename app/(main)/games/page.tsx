import type { Metadata } from "next";
import { Gamepad2 } from "lucide-react";
import { getPublishedGames, getFavoriteGameIds } from "@/services/games";
import { getSessionUser } from "@/lib/supabase/queries";
import { GamesLibrary } from "@/features/games/games-library";

export const metadata: Metadata = {
  title: "Games",
  description: "Browse and play 23 classic arcade, puzzle, strategy and shooter games.",
};

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [user, games] = await Promise.all([getSessionUser(), getPublishedGames()]);
  const favorites = user ? [...(await getFavoriteGameIds())] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Gamepad2 className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Game library</h1>
          <p className="text-sm text-muted-foreground">Every classic, one click away.</p>
        </div>
      </div>

      <GamesLibrary games={games} favorites={favorites} initialCategory={category} />
    </div>
  );
}
