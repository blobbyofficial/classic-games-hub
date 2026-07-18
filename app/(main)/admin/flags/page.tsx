import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { FlagToggle } from "@/features/admin/flag-toggle";

export default async function AdminFlagsPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const { data: flags } = await supabase.from("feature_flags").select("*").order("key");

  return (
    <div className="space-y-2">
      <p className="mb-4 text-sm text-muted-foreground">
        Feature flags toggle platform capabilities instantly for everyone.
      </p>
      {(flags ?? []).map((f) => (
        <FlagToggle key={f.key} flag={f} />
      ))}
    </div>
  );
}
