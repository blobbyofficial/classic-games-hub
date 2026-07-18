import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { AdminNav } from "@/features/admin/admin-nav";
import { ShieldCheck } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {profile.username} · {profile.role}
          </p>
        </div>
      </div>
      <AdminNav role={profile.role} />
      <div>{children}</div>
    </div>
  );
}
