import { createClient } from "@/lib/supabase/server";
import { ReportRow } from "@/features/admin/report-row";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, details, status, created_at, reporter:profiles!reports_reporter_id_fkey(username), target:profiles!reports_target_user_id_fkey(username)",
    )
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);

  const reports = (data ?? []).map((r) => ({
    ...r,
    reporter: r.reporter as unknown as { username: string } | null,
    target: r.target as unknown as { username: string } | null,
  }));

  const open = reports.filter((r) => r.status === "open");
  const resolved = reports.filter((r) => r.status !== "open");

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Open <span className="text-destructive">({open.length})</span>
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open reports. Nice and quiet.</p>
        ) : (
          open.map((r) => <ReportRow key={r.id} report={r} />)
        )}
      </section>

      {resolved.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Resolved / dismissed</h2>
          {resolved.slice(0, 20).map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </section>
      )}
    </div>
  );
}
