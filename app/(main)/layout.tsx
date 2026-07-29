import { Navbar } from "@/components/shell/navbar";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Footer } from "@/components/shell/footer";
import { CommandPaletteLazy } from "@/components/shell/command-palette-lazy";
import { SessionSync } from "@/components/providers/session-sync";
import { MaintenanceBanner } from "@/components/shell/maintenance-banner";
import { SiteBanner } from "@/components/shell/site-banner";
import { SeasonalBanner } from "@/components/shell/seasonal-banner";
import {
  getCurrentProfile,
  getCurrentSettings,
  getSessionUser,
  getUnreadNotificationCount,
  getBanners,
  getSeasonalEvent,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [user, profile, settings, unread, banners, seasonalEvent] = await Promise.all([
    getSessionUser(),
    getCurrentProfile(),
    getCurrentSettings(),
    getUnreadNotificationCount(),
    getBanners(),
    getSeasonalEvent(),
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
      {/* First tab stop on every page — jumps a keyboard user past the navbar
          and the whole sidebar straight into the page content. */}
      <a
        href="#main"
        className="skip-link rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg"
      >
        Skip to content
      </a>
      <SessionSync
        userId={user?.id ?? null}
        profile={profile}
        settings={settings}
        unread={unread}
        pendingRequests={pendingRequests}
      />
      <Navbar />
      {banners.maintenance && <MaintenanceBanner message={banners.maintenance.message} />}
      {seasonalEvent && <SeasonalBanner event={seasonalEvent} />}
      {banners.site && <SiteBanner config={banners.site} />}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 px-0 sm:px-6">
        <Sidebar />
        {/* pb-24 clears the fixed mobile tab bar; the safe-area inset keeps the
            last row of content off a gesture bar on iOS. */}
        <main
          id="main"
          tabIndex={-1}
          className="w-full min-w-0 flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-2 sm:pt-8 lg:px-8 lg:pb-12"
        >
          {children}
        </main>
      </div>
      <Footer />
      <MobileNav />
      <CommandPaletteLazy />
    </div>
  );
}
