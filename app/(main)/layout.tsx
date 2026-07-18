import { Navbar } from "@/components/shell/navbar";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Footer } from "@/components/shell/footer";
import { CommandPalette } from "@/components/shell/command-palette";
import { SessionSync } from "@/components/providers/session-sync";
import { MaintenanceBanner } from "@/components/shell/maintenance-banner";
import {
  getCurrentProfile,
  getCurrentSettings,
  getSessionUser,
  getUnreadNotificationCount,
  getFeatureFlags,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [user, profile, settings, unread, flags] = await Promise.all([
    getSessionUser(),
    getCurrentProfile(),
    getCurrentSettings(),
    getUnreadNotificationCount(),
    getFeatureFlags(),
  ]);

  // One extra round-trip for the friend-request badge (cheap, indexed count).
  let pendingRequests = 0;
  if (user) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending");
    pendingRequests = count ?? 0;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionSync
        userId={user?.id ?? null}
        profile={profile}
        settings={settings}
        unread={unread}
        pendingRequests={pendingRequests}
      />
      <Navbar />
      {flags.maintenance_banner && <MaintenanceBanner />}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 px-0 sm:px-6">
        <Sidebar />
        <main className="w-full min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-2 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <Footer />
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
