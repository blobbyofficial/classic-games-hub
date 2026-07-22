import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { DiscordBotSettings } from "@/features/admin/discord-bot-settings";
import type { LevelingConfig, RoleSyncConfig } from "@/features/admin/discord-bot-settings";

export const metadata: Metadata = { title: "Discord bot — Admin" };

const LEVELING_DEFAULTS: LevelingConfig = {
  enabled: true,
  xp_min: 15,
  xp_max: 25,
  cooldown_seconds: 60,
  curve_quad: 5,
  curve_linear: 50,
  curve_base: 100,
  announce_level_ups: true,
  announce_channel_id: null,
  no_xp_channel_ids: [],
  hub_xp_share: 0.2,
};

export default async function AdminDiscordPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_get_bot_config");
  const config = (data ?? {}) as {
    leveling?: Partial<LevelingConfig>;
    role_sync?: Partial<RoleSyncConfig>;
  };

  const leveling: LevelingConfig = { ...LEVELING_DEFAULTS, ...config.leveling };
  const roleSync: RoleSyncConfig = {
    enabled: config.role_sync?.enabled ?? true,
    role_map: config.role_sync?.role_map ?? {},
  };

  return <DiscordBotSettings leveling={leveling} roleSync={roleSync} />;
}
