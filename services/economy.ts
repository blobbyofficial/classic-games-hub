import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Whether the current user has claimed today's reward + their current streak. */
export const getDailyRewardStatus = cache(async (): Promise<{ claimed: boolean; streak: number }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { claimed: true, streak: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_reward_claims")
    .select("claim_date, streak")
    .eq("user_id", user.id)
    .order("claim_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { claimed: false, streak: 0 };
  return { claimed: data.claim_date === today, streak: data.streak };
});
