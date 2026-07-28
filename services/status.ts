import { createClient } from "@/lib/supabase/server";

/** Shape of the jsonb document `platform_status()` returns (0043). */
export interface PlatformStatus {
  generated_at: string;
  players: { total: number; online: number; active_24h: number; discord_linked: number };
  games: {
    published: number;
    coming_soon: number;
    plays_today: number;
    plays_last_hour: number;
    plays_total: number;
  };
  social: { messages_24h: number; friendships: number };
  economy: { credits_awarded_24h: number; shop_items: number };
  discord: {
    worker_last_seen: string | null;
    worker_online: boolean;
    leveling_enabled: boolean;
    verification_configured: boolean;
    tickets_configured: boolean;
    counters_configured: boolean;
    milestone_roles_created: number;
    milestone_roles_expected: number;
    chat_members: number;
    mod_cases: number;
    open_tickets: number;
  };
  moderation: { open_reports: number; banned: number };
}

/** One round trip for the whole status page; readable by signed-out visitors. */
export async function getPlatformStatus(): Promise<PlatformStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_status");
  if (error || !data) return null;
  return data as unknown as PlatformStatus;
}
