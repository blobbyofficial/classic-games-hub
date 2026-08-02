import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { CommunityEventManager } from "@/features/admin/community-event-manager";

export const metadata: Metadata = { title: "Community events - Admin" };

export default async function AdminEventsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("community_events")
    .select("id, title, description, target, progress, credits_reward, starts_at, ends_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return <CommunityEventManager events={events ?? []} />;
}
