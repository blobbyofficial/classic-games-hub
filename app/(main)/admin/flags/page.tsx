import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { FlagToggle } from "@/features/admin/flag-toggle";
import { BannerEditor } from "@/features/admin/banner-editor";

export default async function AdminFlagsPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const { data: flags } = await supabase.from("feature_flags").select("*").order("key");

  const all = flags ?? [];
  const maintenance = all.find((f) => f.key === "maintenance_banner");
  const site = all.find((f) => f.key === "site_banner");
  const rest = all.filter((f) => f.key !== "maintenance_banner" && f.key !== "site_banner");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Banners</h2>
          <p className="text-xs text-muted-foreground">
            Edit the site-wide banners shown above every page.
          </p>
        </div>
        {site && <BannerEditor flag={site} kind="site" title="Site banner" />}
        {maintenance && (
          <BannerEditor flag={maintenance} kind="maintenance" title="Maintenance banner" />
        )}
      </section>

      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold">Feature flags</h2>
          <p className="text-xs text-muted-foreground">
            Toggle platform capabilities instantly for everyone.
          </p>
        </div>
        {rest.map((f) => (
          <FlagToggle key={f.key} flag={f} />
        ))}
      </section>
    </div>
  );
}
