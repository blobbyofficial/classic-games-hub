"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validators";
import type { PlayDifficulty, RpcResult, ScoreResult } from "@/types";

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Persist a completed run. All scoring/anti-cheat/reward logic lives in the
 * `submit_score` DB function; the client only reports raw score + duration.
 */
export async function submitScore(
  slug: string,
  score: number,
  duration: number,
  difficulty: PlayDifficulty = "regular",
): Promise<ScoreResult> {
  const { supabase, user } = await client();
  if (!user) return { ok: false, error: "Log in to save scores and earn rewards" };

  const safeScore = Math.max(0, Math.floor(Number.isFinite(score) ? score : 0));
  const safeDuration = Math.max(0, Math.floor(Number.isFinite(duration) ? duration : 0));

  const { data, error } = await supabase.rpc("submit_score", {
    p_slug: slug,
    p_score: safeScore,
    p_duration: safeDuration,
    p_difficulty: difficulty,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath(`/games/${slug}`);
  return data as ScoreResult;
}

export async function toggleFavorite(gameId: string, favorite: boolean): Promise<RpcResult> {
  const { supabase, user } = await client();
  if (!user) return { ok: false, error: "Log in to save favorites" };

  if (favorite) {
    const { error } = await supabase.from("game_favorites").insert({ user_id: user.id, game_id: gameId });
    if (error && error.code !== "23505") return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("game_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("game_id", gameId);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/games");
  return { ok: true };
}

export async function rateGame(gameId: string, slug: string, input: unknown): Promise<RpcResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user } = await client();
  if (!user) return { ok: false, error: "Log in to rate games" };

  const { error } = await supabase.from("game_ratings").upsert(
    {
      game_id: gameId,
      user_id: user.id,
      rating: parsed.data.rating,
      review: parsed.data.review || null,
    },
    { onConflict: "game_id,user_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${slug}`);
  return { ok: true };
}
