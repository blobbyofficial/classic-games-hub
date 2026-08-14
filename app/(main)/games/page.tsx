import type { Metadata } from "next";
import { Gamepad2 } from "lucide-react";
import { getPublishedGames, getFavoriteGameIds } from "@/services/games";
import { getSessionUser } from "@/lib/supabase/queries";
import { GamesLibrary } from "@/features/games/games-library";
import { PageHeader } from "@/components/page-header";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, gameListJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Games",
  description: "Browse and play 26 classic arcade, puzzle, strategy and shooter games.",
  // /games?category=puzzle is a filtered view of this page, not a page of its
  // own - without a canonical each filter competes with the unfiltered list.
  alternates: { canonical: "/games" },
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
      {/* The library as an ordered collection. This is what gives the twenty-six
          game pages a crawlable parent rather than leaving them to be found one
          at a time through the sitemap. */}
      <JsonLd data={gameListJsonLd(games)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Games", path: "/games" },
        ])}
      />
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
