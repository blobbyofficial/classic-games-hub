import { Search } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { UserRow } from "@/features/admin/user-row";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [profile, supabase] = await Promise.all([getCurrentProfile(), createClient()]);

  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
  if (q) query = query.ilike("username", `%${q}%`);
  const { data: users } = await query;

  return (
    <div className="space-y-4">
      <form className="flex gap-2" action="/admin/users">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search by username…" className="pl-9" />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="space-y-2">
        {(users ?? []).map((u) => (
          <UserRow key={u.id} user={u} canManageRoles={profile?.role === "admin"} />
        ))}
        {(users ?? []).length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
      </div>
    </div>
  );
}
