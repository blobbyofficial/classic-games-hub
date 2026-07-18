import { ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, target_type, target_id, details, created_at, actor:profiles!audit_logs_actor_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-2">
      <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <ScrollText className="size-4" /> Last 100 privileged actions.
      </p>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Target</th>
              <th className="px-3 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {(data ?? []).map((log) => {
              const actor = log.actor as unknown as { username: string } | null;
              return (
                <tr key={log.id}>
                  <td className="px-3 py-2 font-medium">{actor?.username ?? "system"}</td>
                  <td className="px-3 py-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.action}</code>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {log.target_type}
                    {log.target_id ? `:${log.target_id.slice(0, 12)}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{timeAgo(log.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(data ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No audit entries yet.</p>}
      </div>
    </div>
  );
}
