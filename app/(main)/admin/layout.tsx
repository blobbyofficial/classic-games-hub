import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { AdminNav } from "@/features/admin/admin-nav";
import { AdminPageHeading } from "@/features/admin/ui";

/**
 * Two columns on desktop, stacked on mobile.
 *
 * The nav used to sit above the content, so every page began by pushing what
 * you came for below the fold. Beside the content it stays reachable while you
 * work, and each page gets a consistent heading from the route rather than
 * opening straight into a form.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    redirect("/");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin</h1>
            <p className="text-xs text-muted-foreground">
              {profile.username} · <span className="capitalize">{profile.role}</span>
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          View site <ArrowUpRight className="size-3.5" />
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-20">
          <AdminNav role={profile.role} />
        </div>

        <div className="min-w-0 space-y-5">
          <AdminPageHeading />
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
