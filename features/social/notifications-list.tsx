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
  Rss,
  Gift,
  ArrowUpRight,
} from "lucide-react";
import { markNotificationsRead, markNotificationRead } from "@/actions/profile";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationRow } from "@/types";

const fullDateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** The link a notification points to: an explicit link on the payload, else a route by type. */
function linkFor(n: NotificationRow): { href: string; label: string } | null {
  const data = (n.data ?? {}) as Record<string, string>;
  if (data.link_href) return { href: data.link_href, label: data.link_label || "Open" };
  const route = hrefFor(n);
  return route ? { href: route, label: "Open" } : null;
}

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
  follow: Rss,
  gift: Gift,
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
    case "follow":
      return data.username ? `/u/${data.username}` : null;
    case "gift":
      return "/inventory";
    default:
      return null;
  }
}

export function NotificationsList({ initial }: { initial: NotificationRow[] }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<NotificationRow | null>(null);
  const [pending, start] = useTransition();
  const setUnread = useSessionStore((s) => s.setUnread);
  const hasUnread = items.some((n) => !n.read_at);

  const markAll = () =>
    start(async () => {
      await markNotificationsRead();
      setItems((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setUnread(0);
    });

  const open = (n: NotificationRow) => {
    setSelected(n);
    if (!n.read_at) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread(Math.max(0, items.filter((x) => !x.read_at).length - 1));
      void markNotificationRead(n.id);
    }
  };

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
          return (
            <li key={n.id}>
              <button
                onClick={() => open(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent/50",
                  !n.read_at && "border-primary/30 bg-primary/5",
                )}
              >
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground/70">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
              </button>
            </li>
          );
        })}
      </ul>

      <NotificationDetail notification={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NotificationDetail({
  notification: n,
  onClose,
}: {
  notification: NotificationRow | null;
  onClose: () => void;
}) {
  const Icon = n ? ICONS[n.type] ?? Bell : Bell;
  const link = n ? linkFor(n) : null;

  return (
    <Dialog open={Boolean(n)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        {n && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                  <Icon className="size-4" />
                </span>
                {n.title}
              </DialogTitle>
              <DialogDescription className="sr-only">Notification details</DialogDescription>
            </DialogHeader>
            {n.body && <p className="whitespace-pre-wrap text-sm text-foreground/90">{n.body}</p>}
            <p className="text-xs text-muted-foreground">Sent {fullDateFmt.format(new Date(n.created_at))}</p>
            {link && (
              <Button asChild variant="gradient" className="w-full">
                {link.href.startsWith("/") ? (
                  <Link href={link.href} onClick={onClose}>
                    {link.label} <ArrowUpRight />
                  </Link>
                ) : (
                  <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={onClose}>
                    {link.label} <ArrowUpRight />
                  </a>
                )}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
