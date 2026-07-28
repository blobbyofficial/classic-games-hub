import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { SiteSurfaces } from "@/features/admin/site-surfaces";

export const metadata: Metadata = { title: "Site — Admin" };

export default async function AdminSitePage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase
    .from("feature_flags")
    .select("key, enabled, payload")
    .in("key", ["home_layout", "roadmap_override"]);

  const flags = Object.fromEntries((data ?? []).map((f) => [f.key, f]));

  return (
    <SiteSurfaces
      homeLayout={flags.home_layout ?? { key: "home_layout", enabled: false, payload: { order: [], hidden: [] } }}
      roadmapOverride={flags.roadmap_override ?? { key: "roadmap_override", enabled: false, payload: {} }}
    />
  );
}
