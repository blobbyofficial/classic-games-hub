import { createClient } from "@/lib/supabase/server";
import { AnnouncementForm } from "@/features/admin/announcement-form";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

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
          <div key={a.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">{a.title}</span>
              <Badge variant={a.published ? "success" : "secondary"}>{a.published ? "Published" : "Draft"}</Badge>
              <Badge variant="outline">{a.level}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">{timeAgo(a.created_at)}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
          </div>
        ))}
        {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
      </div>
    </div>
  );
}
