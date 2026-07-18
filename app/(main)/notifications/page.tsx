import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { getNotifications } from "@/services/social";
import { NotificationsList } from "@/features/social/notifications-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/notifications");
  const notifications = await getNotifications();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Bell className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Requests, achievements, messages and more.</p>
        </div>
      </div>
      <NotificationsList initial={notifications} />
    </div>
  );
}
