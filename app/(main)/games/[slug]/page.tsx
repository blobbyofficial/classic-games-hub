import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Gamepad2, Trophy, Users, Keyboard, Info, MessageSquare, ChevronLeft } from "lucide-react";
import { getGameBySlug, getPublishedGames } from "@/services/games";
import { ControlsList } from "@/features/games/controls-list";
import { getSessionUser, getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { GamePlayer } from "@/features/games/game-player";
import { EarlyAccessLock } from "@/features/games/early-access-lock";
import { InDevelopmentLock } from "@/features/games/in-development-lock";
import { LeaderboardTabs } from "@/features/leaderboards/leaderboard-tabs";
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
  if (
    !game ||
    (game.status !== "published" &&
      game.status !== "coming_soon" &&
      game.status !== "in_development")
  ) {
    notFound();
  }

  // getCurrentProfile shares the cached session with getSessionUser, so adding
  // it to the batch for the early-access check costs no extra round trip.
  const [user, allGames, profile] = await Promise.all([
    getSessionUser(),
    getPublishedGames(),
    getCurrentProfile(),
  ]);
  const supabase = await createClient();

  // The public review list doesn't depend on the viewer, so it rides along with
  // the signed-in lookups instead of waiting for them.
  const [favRes, bestRes, ratingRes, { data: reviews }] = await Promise.all([
    user
      ? supabase.from("game_favorites").select("game_id").eq("user_id", user.id).eq("game_id", game.id).maybeSingle()
      : null,
    user
      ? supabase.from("leaderboard_scores").select("best_score").eq("user_id", user.id).eq("game_id", game.id).maybeSingle()
      : null,
    user
      ? supabase.from("game_ratings").select("rating, review").eq("user_id", user.id).eq("game_id", game.id).maybeSingle()
      : null,
    supabase
      .from("game_ratings")
      .select("rating, review, created_at, profiles(username, display_name, avatar_url)")
      .eq("game_id", game.id)
      .not("review", "is", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const isFavorite = Boolean(favRes?.data);
  const bestScore = bestRes?.data?.best_score ?? 0;
  const myRating: { rating: number; review: string | null } | null = ratingRes?.data ?? null;

  const meta = CATEGORY_META[game.category];
  const related = allGames.filter((g) => g.category === game.category && g.id !== game.id).slice(0, 5);
  const comingSoon = game.status === "coming_soon";

  const isStaff = profile?.role === "admin" || profile?.role === "moderator";

  // Booster early access. The database refuses to record a play for anyone who
  // is not eligible (0056), so this only decides what to render.
  const earlyUntil = game.early_access_until;
  const inEarlyAccess = Boolean(earlyUntil && new Date(earlyUntil) > new Date());
  const mayPlayEarly = profile?.booster_since != null || isStaff;
  const earlyLocked = inEarlyAccess && !mayPlayEarly;

  // Being rebuilt (0070). Staff only, so each overhaul can be played on the
  // real site before it reopens. Boosters deliberately do not get in: early
  // access is a head start on a release, and this is not a release.
  const inDevelopment = game.status === "in_development";
  const devLocked = inDevelopment && !isStaff;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/games"
        className="group inline-flex items-center gap-1 rounded-lg py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] group-hover:-translate-x-0.5" />
        All games
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-title font-bold">{game.title}</h1>
                <Badge variant="outline" className={meta?.color}>
                  {game.category}
                </Badge>
              </div>
              {game.tagline && <p className="mt-1.5 text-muted-foreground">{game.tagline}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
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
          ) : devLocked ? (
            <InDevelopmentLock title={game.title} />
          ) : earlyLocked ? (
            <EarlyAccessLock until={earlyUntil!} title={game.title} />
          ) : (
            <GamePlayer
              slug={game.slug}
              engineId={game.engine_id}
              title={game.title}
              bestScore={bestScore}
              isAuthed={Boolean(user)}
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
              <ControlsList engineId={game.engine_id} keyboard={game.controls} />
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
              <LeaderboardTabs slug={game.slug} currentUserId={user?.id} />
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
