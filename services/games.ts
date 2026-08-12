import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Game, GameWithMeta } from "@/types";

/** Attach a computed 0–5 rating average to a game row. */
function withRating(g: Game): GameWithMeta {
  return { ...g, rating: g.rating_count > 0 ? g.rating_sum / g.rating_count : 0 };
}

export const getPublishedGames = cache(async (): Promise<GameWithMeta[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select("*")
    .in("status", ["published", "coming_soon", "in_development"])
    .order("sort_weight", { ascending: false });
  return (data ?? []).map(withRating);
});

/**
 * In-development games stay featured.
 *
 * The rule used to be `status === "published"`, which was right when the state
 * next to it was `coming_soon` - a game nobody has played does not belong on
 * the front page. It is wrong for `in_development`: the whole library is in
 * that state while it is rebuilt, so excluding it would empty the featured rail
 * rather than curate it. A badged shelf beats no shelf.
 */
export const getFeaturedGames = cache(async (): Promise<GameWithMeta[]> => {
  const games = await getPublishedGames();
  return games.filter((g) => g.featured && g.status !== "coming_soon");
});

export const getGameBySlug = cache(async (slug: string): Promise<GameWithMeta | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("*").eq("slug", slug).single();
  return data ? withRating(data) : null;
});

/** Games the current user has favorited (ids), for library highlighting. */
export const getFavoriteGameIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data } = await supabase.from("game_favorites").select("game_id").eq("user_id", user.id);
  return new Set((data ?? []).map((r) => r.game_id));
});

/** Recently played games for the current user (most recent distinct first). */
export const getRecentlyPlayed = cache(async (limit = 6): Promise<GameWithMeta[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("play_sessions")
    .select("game_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  const seen = new Set<string>();
  const order: string[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.game_id)) {
      seen.add(row.game_id);
      order.push(row.game_id);
    }
    if (order.length >= limit) break;
  }
  if (order.length === 0) return [];

  const { data: games } = await supabase.from("games").select("*").in("id", order);
  const map = new Map((games ?? []).map((g) => [g.id, withRating(g)]));
  return order.map((id) => map.get(id)).filter((g): g is GameWithMeta => Boolean(g));
});
