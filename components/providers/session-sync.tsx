"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSessionStore } from "@/lib/stores/session-store";
import type { NotificationRow, Profile, UserSettings } from "@/types";

interface Props {
  userId: string | null;
  profile: Profile | null;
  settings: UserSettings | null;
  unread: number;
  pendingRequests: number;
}

/**
 * Hydrates the client session store from the server, then keeps it live:
 *  • sends a presence heartbeat every 60s (respecting the privacy setting)
 *  • subscribes to realtime notification inserts → toast + unread badge
 *  • refreshes RSC data when a friend request resolves
 */
export function SessionSync({ userId, profile, settings, unread, pendingRequests }: Props) {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const setUnread = useSessionStore((s) => s.setUnread);
  const setPending = useSessionStore((s) => s.setPendingRequests);
  const lastToast = useRef(0);

  useEffect(() => {
    setSession({ userId, profile, settings });
    setUnread(unread);
    setPending(pendingRequests);
  }, [userId, profile, settings, unread, pendingRequests, setSession, setUnread, setPending]);

  useEffect(() => {
    if (!userId) return;

    // This component mounts on every route but does nothing until someone is
    // signed in, and the Supabase client (auth + realtime) is the single
    // largest dependency in the bundle. Importing it here rather than at module
    // scope keeps it out of the initial payload for every visitor, and off the
    // critical path entirely for signed-out ones.
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void import("@/lib/supabase/client").then(({ createClient }) => {
      if (disposed) return;
      const supabase = createClient();

      // Presence heartbeat.
      const beat = () => {
        if (settings?.show_online_status !== false) void supabase.rpc("heartbeat");
      };
      beat();
      const interval = setInterval(beat, 60_000);
      const onVisible = () => document.visibilityState === "visible" && beat();
      document.addEventListener("visibilitychange", onVisible);

      // Realtime notifications.
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const n = payload.new as NotificationRow;
            setUnread(useSessionStore.getState().unreadNotifications + 1);
            if (n.type === "friend_request") setPending(useSessionStore.getState().pendingFriendRequests + 1);
            // Debounce so a burst (e.g. announcement) doesn't spam toasts.
            if (Date.now() - lastToast.current > 800) {
              lastToast.current = Date.now();
              toast(n.title, { description: n.body ?? undefined });
            }
            router.refresh();
          },
        )
        .subscribe();

      cleanup = () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisible);
        void supabase.removeChannel(channel);
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [userId, settings?.show_online_status, router, setUnread, setPending]);

  return null;
}
