import type { Metadata } from "next";
import { Gamepad2 } from "lucide-react";
import { getPublishedGames, getFavoriteGameIds } from "@/services/games";
import { getSessionUser } from "@/lib/supabase/queries";
import { GamesLibrary } from "@/features/games/games-library";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Games",
  description: "Browse and play 26 classic arcade, puzzle, strategy and shooter games.",
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
      <PageHeader
        icon={Gamepad2}
        title="Game library"
        description="Every classic, one click away."
        className="mb-0"
      />

      <GamesLibrary games={games} favorites={favorites} initialCategory={category} />
    </div>
  );
}
