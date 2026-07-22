import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { User, SlidersHorizontal, Coins, Shield, Lock, Link2 } from "lucide-react";
import { getCurrentProfile, getCurrentSettings, getFeatureFlags } from "@/lib/supabase/queries";
import { getUserAchievements, getUserBestScores } from "@/services/profiles";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/features/settings/profile-settings";
import { AppearanceSettings } from "@/features/settings/appearance-settings";
import { BannerCustomizer } from "@/features/settings/banner-customizer";
import { PreferencesSettings } from "@/features/settings/preferences-settings";
import { AdsSettings } from "@/features/settings/ads-settings";
import { SecuritySettings } from "@/features/settings/security-settings";
import { BlockedUsers } from "@/features/settings/blocked-users";
import { ConnectionsSettings, type DiscordConnection } from "@/features/settings/connections-settings";

export const metadata: Metadata = { title: "Settings" };

const TABS = ["profile", "preferences", "rewards", "privacy", "security", "connections"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = TABS.includes(tab ?? "") ? (tab as string) : "profile";
  const [profile, settings, flags] = await Promise.all([
    getCurrentProfile(),
    getCurrentSettings(),
    getFeatureFlags(),
  ]);
  if (!profile || !settings) redirect("/login?next=/settings");

  const [achievements, bestScores] = await Promise.all([
    getUserAchievements(profile.id),
    getUserBestScores(profile.id, 24),
  ]);

  const supabase = await createClient();
  const { data: connectionData } = await supabase.rpc("my_discord_connection");
  const connection = (connectionData ?? { linked: false }) as unknown as DiscordConnection;
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("profiles!user_blocks_blocked_id_fkey(id, username, display_name, avatar_url)")
    .eq("blocker_id", profile.id);
  const blocked = (blocks ?? []).map(
    (b) => b.profiles as unknown as { id: string; username: string; display_name: string | null; avatar_url: string | null },
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Settings</h1>

      <Tabs defaultValue={initialTab}>
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="profile">
            <User className="size-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SlidersHorizontal className="size-4" /> Preferences
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Coins className="size-4" /> Rewards
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="size-4" /> Privacy
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="size-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="connections">
            <Link2 className="size-4" /> Connections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSettings profile={profile} />
          <AppearanceSettings
            profile={profile}
            achievements={achievements.map((a) => ({ slug: a.slug, name: a.name }))}
            games={bestScores.map((s) => ({ slug: s.game.slug, title: s.game.title }))}
          />
          <BannerCustomizer profile={profile} />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesSettings settings={settings} />
        </TabsContent>
        <TabsContent value="rewards">
          <AdsSettings settings={settings} enabled={flags.rewarded_ads ?? true} />
        </TabsContent>
        <TabsContent value="privacy">
          <BlockedUsers initial={blocked} />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="connections">
          <ConnectionsSettings connection={connection} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
