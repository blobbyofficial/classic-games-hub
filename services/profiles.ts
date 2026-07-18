import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileStats } from "@/types";

export const getProfileByUsername = cache(async (username: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  return data;
});

export const getProfileStats = cache(async (userId: string): Promise<ProfileStats> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("profile_stats", { p_user: userId });
  return (data as unknown as ProfileStats) ?? {
    total_plays: 0,
    games_played: 0,
    achievements: 0,
    friends: 0,
    best_game: null,
  };
});

export interface UnlockedAchievement {
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked_at: string;
}

export const getUserAchievements = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_achievements")
    .select("unlocked_at, achievements(slug, name, description, icon, category, secret)")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });
  return (data ?? []).map((r) => ({
    unlocked_at: r.unlocked_at,
    ...(r.achievements as unknown as {
      slug: string;
      name: string;
      description: string;
      icon: string;
      category: string;
      secret: boolean;
    }),
  }));
});

export const getUserBestScores = cache(async (userId: string, limit = 6) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leaderboard_scores")
    .select("best_score, plays, achieved_at, games(slug, title, thumbnail_url, category)")
    .eq("user_id", userId)
    .order("best_score", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    best_score: r.best_score,
    plays: r.plays,
    achieved_at: r.achieved_at,
    game: r.games as unknown as { slug: string; title: string; thumbnail_url: string | null; category: string },
  }));
});

export const getUserActivity = cache(async (userId: string, limit = 12) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_events")
    .select("id, type, data, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
});

export const getEquippedBadges = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_items")
    .select("shop_items(slug, name, kind, rarity, preview)")
    .eq("user_id", userId);
  return (data ?? [])
    .map((r) => r.shop_items as unknown as { slug: string; name: string; kind: string; rarity: string; preview: { icon?: string; colors?: string[] } })
    .filter((i) => i.kind === "badge");
});
