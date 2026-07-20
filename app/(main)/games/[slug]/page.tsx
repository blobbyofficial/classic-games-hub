import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Gamepad2, Trophy, Users, Keyboard, Info, MessageSquare, ChevronLeft } from "lucide-react";
import { getGameBySlug, getPublishedGames } from "@/services/games";
import { getSessionUser, getFeatureFlags } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { GamePlayer } from "@/features/games/game-player";
import { GameLeaderboard } from "@/features/leaderboards/game-leaderboard";
import { RateGame } from "@/features/games/rate-game";
import { GameCard } from "@/components/games/game-card";
import { FavoriteButton } from "@/components/games/favorite-button";
import { RatingStars } from "@/components/games/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_META, SITE } from "@/lib/constants";
import { compactNumber, timeAgo } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) return { title: "Game not found" };
  return {
    title: game.title,
    description: game.tagline ?? game.description ?? `Play ${game.title} on ${SITE.name}.`,
    openGraph: { images: game.thumbnail_url ? [game.thumbnail_url] : [] },
  };
}

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game || (game.status !== "published" && game.status !== "coming_soon")) notFound();

  const [user, allGames, flags] = await Promise.all([getSessionUser(), getPublishedGames(), getFeatureFlags()]);
  const supabase = await createClient();

  let isFavorite = false;
  let bestScore = 0;
  let myRating: { rating: number; review: string | null } | null = null;
  if (user) {
    const [{ data: fav }, { data: best }, { data: rating }] = await Promise.all([
      supabase.from("game_favorites").select("game_id").eq("user_id", user.id).eq("game_id", game.id).maybeSingle(),
      supabase.from("leaderboard_scores").select("best_score").eq("user_id", user.id).eq("game_id", game.id).maybeSingle(),
      supabase.from("game_ratings").select("rating, review").eq("user_id", user.id).eq("game_id", game.id).maybeSingle(),
    ]);
    isFavorite = Boolean(fav);
    bestScore = best?.best_score ?? 0;
    myRating = rating;
  }

  const { data: reviews } = await supabase
    .from("game_ratings")
    .select("rating, review, created_at, profiles(username, display_name, avatar_url)")
    .eq("game_id", game.id)
    .not("review", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const meta = CATEGORY_META[game.category];
  const related = allGames.filter((g) => g.category === game.category && g.id !== game.id).slice(0, 5);
  const comingSoon = game.status === "coming_soon";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/games" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> All games
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{game.title}</h1>
                <Badge variant="outline" className={meta?.color}>
                  {game.category}
                </Badge>
              </div>
              {game.tagline && <p className="mt-1 text-muted-foreground">{game.tagline}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {game.rating_count > 0 && (
                  <span className="flex items-center gap-1.5">
                    <RatingStars value={game.rating} />
                    {game.rating.toFixed(1)} ({game.rating_count})
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="size-4" /> {compactNumber(game.play_count)} plays
                </span>
                <span className="capitalize">Difficulty: {game.difficulty}</span>
              </div>
            </div>
            {!comingSoon && <FavoriteButton gameId={game.id} initial={isFavorite} withLabel />}
          </div>

          {/* Player */}
          {comingSoon ? (
            <Card className="grid aspect-video place-items-center">
              <div className="text-center">
                <Badge variant="neon" className="mb-3">
                  Coming soon
                </Badge>
                <p className="text-muted-foreground">This game is on its way. Check back shortly!</p>
              </div>
            </Card>
          ) : (
            <GamePlayer
              slug={game.slug}
              engineId={game.engine_id}
              title={game.title}
              bestScore={bestScore}
              isAuthed={Boolean(user)}
              adsProgramEnabled={flags.rewarded_ads ?? true}
            />
          )}

          {/* Info tabs */}
          <Tabs defaultValue="about">
            <TabsList>
              <TabsTrigger value="about">
                <Info className="size-4" /> About
              </TabsTrigger>
              <TabsTrigger value="controls">
                <Keyboard className="size-4" /> Controls
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <MessageSquare className="size-4" /> Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>{game.description}</p>
              {game.how_to_play && (
                <div>
                  <h3 className="mb-1 font-semibold text-foreground">How to play</h3>
                  <p>{game.how_to_play}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {game.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    #{t}
                  </Badge>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="controls">
              <div className="grid gap-2 sm:grid-cols-2">
                {game.controls.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{c.action}</span>
                    <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">{c.keys}</kbd>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rate this game</CardTitle>
                </CardHeader>
                <CardContent>
                  <RateGame
                    gameId={game.id}
                    slug={game.slug}
                    initialRating={myRating?.rating}
                    initialReview={myRating?.review ?? ""}
                    isAuthed={Boolean(user)}
                  />
                </CardContent>
              </Card>
              <div className="space-y-3">
                {(reviews ?? []).map((r, i) => {
                  const p = r.profiles as unknown as { username: string; display_name: string | null; avatar_url: string | null };
                  return (
                    <div key={i} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between">
                        <Link href={`/u/${p.username}`} className="text-sm font-medium hover:underline">
                          {p.display_name ?? p.username}
                        </Link>
                        <RatingStars value={r.rating} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.review}</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">{timeAgo(r.created_at)}</p>
                    </div>
                  );
                })}
                {(reviews ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No written reviews yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-4 text-gold" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <GameLeaderboard slug={game.slug} currentUserId={user?.id} />
              </Suspense>
            </CardContent>
          </Card>

          {related.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Gamepad2 className="size-4" /> More {game.category}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {related.slice(0, 4).map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
