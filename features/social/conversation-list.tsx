"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { PresenceDot } from "@/components/profile/presence-dot";
import { cn, timeAgo } from "@/lib/utils";
import { useSessionStore } from "@/lib/stores/session-store";
import type { ConversationRow } from "@/types";

export function ConversationList({ conversations }: { conversations: ConversationRow[] }) {
  const pathname = usePathname();
  const me = useSessionStore((s) => s.userId);

  if (conversations.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
        <MessageSquare className="size-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No conversations yet.</p>
        <p className="text-xs text-muted-foreground">Start one from a friend&apos;s profile.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {conversations.map((c) => {
        const active = pathname === `/messages/${c.conversation_id}`;
        const preview =
          c.last_message == null
            ? "No messages yet"
            : `${c.last_message_sender === me ? "You: " : ""}${c.last_message}`;
        return (
          <li key={c.conversation_id}>
            <Link
              href={`/messages/${c.conversation_id}`}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                active ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              <div className="relative">
                <UserAvatar src={c.other_avatar_url} name={c.other_display_name ?? c.other_username} className="size-11" />
                <span className="absolute -bottom-0.5 -right-0.5">
                  <PresenceDot lastSeen={c.other_last_seen} className="size-3" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{c.other_display_name ?? c.other_username}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.last_message_at)}</span>
                </div>
                <p className={cn("truncate text-xs", c.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {preview}
                </p>
              </div>
              {c.unread > 0 && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {c.unread > 9 ? "9+" : c.unread}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
