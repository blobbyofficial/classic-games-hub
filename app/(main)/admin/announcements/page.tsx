import { createClient } from "@/lib/supabase/server";
import { AnnouncementForm } from "@/features/admin/announcement-form";
import { AnnouncementItem } from "@/features/admin/announcement-item";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, level, published, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-5">
      <AnnouncementForm />
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
        {(data ?? []).map((a) => (
          <AnnouncementItem key={a.id} item={a} />
        ))}
        {(data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}
