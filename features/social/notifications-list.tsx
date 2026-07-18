"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  UserPlus,
  Trophy,
  Award,
  Coins,
  MessageSquare,
  Megaphone,
  CheckCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { markNotificationsRead } from "@/actions/profile";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationRow } from "@/types";

const ICONS: Record<string, typeof Bell> = {
  friend_request: UserPlus,
  friend_accepted: UserPlus,
  achievement: Award,
  level_up: Trophy,
  credits: Coins,
  message: MessageSquare,
  announcement: Megaphone,
  challenge: Target,
  welcome: Sparkles,
};

function hrefFor(n: NotificationRow): string | null {
  const data = (n.data ?? {}) as Record<string, string>;
  switch (n.type) {
    case "friend_request":
    case "friend_accepted":
      return data.username ? `/u/${data.username}` : "/friends";
    case "message":
      return data.conversation_id ? `/messages/${data.conversation_id}` : "/messages";
    case "achievement":
      return "/achievements";
    case "challenge":
      return "/challenges";
    default:
      return null;
  }
}

export function NotificationsList({ initial }: { initial: NotificationRow[] }) {
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const setUnread = useSessionStore((s) => s.setUnread);
  const hasUnread = items.some((n) => !n.read_at);

  const markAll = () =>
    start(async () => {
      await markNotificationsRead();
      setItems((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setUnread(0);
    });

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
        <Bell className="size-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">You&apos;re all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={markAll} disabled={pending}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
      )}
      <ul className="space-y-1.5">
        {items.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          const href = hrefFor(n);
          const body = (
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border p-3 transition-colors",
                !n.read_at && "border-primary/30 bg-primary/5",
                href && "hover:bg-accent/50",
              )}
            >
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground/70">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
            </div>
          );
          return <li key={n.id}>{href ? <Link href={href}>{body}</Link> : body}</li>;
        })}
      </ul>
    </div>
  );
}
