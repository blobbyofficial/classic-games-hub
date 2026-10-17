"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validators";
import type { PlayDifficulty, RpcResult, ScoreResult } from "@/types";

// Validate at the server-action boundary: TypeScript signatures are not runtime checks.
const slugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i);
const gameIdSchema = z.string().uuid();
const scoreNumberSchema = z.number().finite().int().min(0).max(2_147_483_647);
// Exact PlayDifficulty values are defined elsewhere in this project.
// Restrict shape here; the database must validate membership in its supported set.
const difficultySchema = z.string().min(1).max(32).regex(/^[a-z][a-z0-9_-]*$/);

function invalid(error: string): RpcResult {
  return { ok: false, error };
}

function parseRpcResult(value: unknown): RpcResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  if (typeof result.ok !== "boolean") return null;
  if (result.ok === false && typeof result.error !== "string") return { ok: false, error: "Operation failed" };
  return value as RpcResult;
}

async function client() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

/**
 * Persist a completed run. The database must independently authenticate and
 * validate scores, durations, rewards, and anti-cheat conditions.
 * Values are rejected rather than silently converted to zero.
 */
export async function submitScore(
  slug: string,
  score: number,
  duration: number,
  difficulty: PlayDifficulty = "regular",
): Promise<ScoreResult> {
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) return { ok: false, error: "Invalid game" };

  const parsedScore = scoreNumberSchema.safeParse(score);
  if (!parsedScore.success) return { ok: false, error: "Score must be a non-negative whole number" };

  const parsedDuration = scoreNumberSchema.safeParse(duration);
  if (!parsedDuration.success) return { ok: false, error: "Duration must be a non-negative whole number" };

  const parsedDifficulty = difficultySchema.safeParse(difficulty);
  if (!parsedDifficulty.success) return { ok: false, error: "Invalid difficulty" };

  const { supabase, user } = await client();
  if (!user) return { ok: false, error: "Log in to save scores and earn rewards" };

  const { data, error } = await supabase.rpc("submit_score", {
    p_slug: parsedSlug.data,
    p_score: parsedScore.data,
    p_duration: parsedDuration.data,
    p_difficulty: parsedDifficulty.data as PlayDifficulty,
  });
  if (error) {
    console.error("[games] submit_score failed", { code: error.code });
    return { ok: false, error: "Couldn't save your score. Try again." };
  }

  const result = parseRpcResult(data);
  if (!result) return { ok: false, error: "Unexpected response while saving score" };
  if (!result.ok) return result as ScoreResult;

  revalidatePath("/", "layout");
  revalidatePath(`/games/${parsedSlug.data}`);
  return result as ScoreResult;
}

/** Set favourite state; duplicate inserts are harmless. */
export async function toggleFavorite(gameId: string, favorite: boolean): Promise<RpcResult> {
  const parsedId = gameIdSchema.safeParse(gameId);
  if (!parsedId.success) return invalid("Invalid game ID");
  if (typeof favorite !== "boolean") return invalid("Invalid favourite setting");

  const { supabase, user } = await client();
  if (!user) return invalid("Log in to save favorites");

  if (favorite) {
    const { error } = await supabase.from("game_favorites").insert({ user_id: user.id, game_id: parsedId.data });
    if (error && error.code !== "23505") {
      console.error("[games] favorite insert failed", { code: error.code });
      return invalid("Couldn't save your favorite. Try again.");
    }
  } else {
    const { error } = await supabase
      .from("game_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("game_id", parsedId.data);
    if (error) {
      console.error("[games] favorite delete failed", { code: error.code });
      return invalid("Couldn't update your favorites. Try again.");
    }
  }

  revalidatePath("/games");
  return { ok: true };
}

export async function rateGame(gameId: string, slug: string, input: unknown): Promise<RpcResult> {
  const parsedId = gameIdSchema.safeParse(gameId);
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedId.success || !parsedSlug.success) return invalid("Invalid game");

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Invalid review");

  const { supabase, user } = await client();
  if (!user) return invalid("Log in to rate games");

  // The database should enforce that gameId exists and review permissions.
  const { error } = await supabase.from("game_ratings").upsert(
    {
      game_id: parsedId.data,
      user_id: user.id,
      rating: parsed.data.rating,
      review: parsed.data.review || null,
    },
    { onConflict: "game_id,user_id" },
  );
  if (error) {
    console.error("[games] rating upsert failed", { code: error.code });
    return invalid("Couldn't save your rating. Try again.");
  }

  revalidatePath(`/games/${parsedSlug.data}`);
  return { ok: true };
}
