import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { getNotifications } from "@/services/social";
import { NotificationsList } from "@/features/social/notifications-list";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/notifications");
  const notifications = await getNotifications();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="Requests, achievements, messages and more."
        className="mb-0"
      />
      <NotificationsList initial={notifications} />
    </div>
  );
}
