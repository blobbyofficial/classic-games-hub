import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { DiscordBotSettings } from "@/features/admin/discord-bot-settings";
import type { LevelingConfig, RoleSyncConfig } from "@/features/admin/discord-bot-settings";
import { DiscordServerSettings } from "@/features/admin/discord-server-settings";
import type {
  LevelRolesConfig,
  ModerationConfig,
  StatsConfig,
  TicketsConfig,
  VerificationConfig,
} from "@/features/admin/discord-server-settings";
import { mergeConfig } from "@/lib/discord/config";

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
  const config = (data ?? {}) as Record<string, Record<string, unknown> | undefined>;

  const leveling: LevelingConfig = { ...LEVELING_DEFAULTS, ...config.leveling };
  const roleSync: RoleSyncConfig = {
    enabled: (config.role_sync?.enabled as boolean) ?? true,
    role_map: (config.role_sync?.role_map as Record<string, string>) ?? {},
  };

  // The v3 sections share their defaults with the bot itself, so an
  // unconfigured server still renders sensible values.
  return (
    <div className="space-y-6">
      <DiscordBotSettings leveling={leveling} roleSync={roleSync} />
      <DiscordServerSettings
        verification={mergeConfig("verification", config.verification) as VerificationConfig}
        moderation={mergeConfig("moderation", config.moderation) as ModerationConfig}
        tickets={mergeConfig("tickets", config.tickets) as TicketsConfig}
        stats={mergeConfig("stats", config.stats) as StatsConfig}
        levelRoles={mergeConfig("level_roles", config.level_roles) as LevelRolesConfig}
      />
    </div>
  );
}
