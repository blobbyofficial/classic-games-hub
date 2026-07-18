"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";

export function NotificationsBell() {
  const unread = useSessionStore((s) => s.unreadNotifications);

  return (
    <Button variant="ghost" size="icon" asChild aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
      <Link href="/notifications" className="relative">
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
