import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Achievement } from "@/types";

export const getAllAchievements = cache(async (): Promise<Achievement[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("achievements").select("*").order("category").order("credits_reward");
  return data ?? [];
});

export const getUnlockedAchievementIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data } = await supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id);
  return new Set((data ?? []).map((r) => r.achievement_id));
});

export interface ChallengeWithProgress {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  credits_reward: number;
  xp_reward: number;
  requirement: { target: number; type: string };
  progress: number;
  completed: boolean;
  claimed: boolean;
  ends_at: string;
  /** Boosters-only reward (0046); claim_challenge enforces it server-side. */
  booster_only: boolean;
}

export const getActiveChallenges = cache(async (): Promise<ChallengeWithProgress[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Make sure today's challenges exist by nudging the generator via daily-status.
  const nowIso = new Date().toISOString();
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("credits_reward");

  if (!challenges) return [];

  let progressMap = new Map<string, { progress: number; completed_at: string | null; claimed_at: string | null }>();
  if (user) {
    const { data: progress } = await supabase
      .from("challenge_progress")
      .select("challenge_id, progress, completed_at, claimed_at")
      .eq("user_id", user.id)
      .in(
        "challenge_id",
        challenges.map((c) => c.id),
      );
    progressMap = new Map((progress ?? []).map((p) => [p.challenge_id, p]));
  }

  return challenges.map((c) => {
    const p = progressMap.get(c.id);
    const req = c.requirement as { target: number; type: string };
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      kind: c.kind,
      credits_reward: c.credits_reward,
      xp_reward: c.xp_reward,
      requirement: req,
      progress: p?.progress ?? 0,
      completed: Boolean(p?.completed_at),
      claimed: Boolean(p?.claimed_at),
      ends_at: c.ends_at,
      booster_only: c.booster_only,
    };
  });
});
