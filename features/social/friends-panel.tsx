"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Check, X, MessageSquare, UserX, Search } from "lucide-react";
import { toast } from "sonner";
import { sendFriendRequest, respondFriendRequest, removeFriend, startConversation } from "@/actions/social";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PresenceDot } from "@/components/profile/presence-dot";
import { timeAgo } from "@/lib/utils";
import type { FriendRow, FriendRequestRow } from "@/types";

export function AddFriend() {
  const [username, setUsername] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    start(async () => {
      const res = await sendFriendRequest(username.trim());
      if (!res.ok) {
        toast.error(res.error ?? "Could not send request");
        return;
      }
      toast.success(res.status === "accepted" ? "You are now friends!" : "Friend request sent");
      setUsername("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
          placeholder="Add a friend by username"
          className="pl-9"
          maxLength={24}
        />
      </div>
      <Button type="submit" variant="gradient" disabled={pending || !username.trim()}>
        <UserPlus /> Add
      </Button>
    </form>
  );
}

export function FriendRequests({ requests }: { requests: FriendRequestRow[] }) {
  const [list, setList] = useState(requests);
  const [pending, start] = useTransition();
  const router = useRouter();

  const respond = (id: number, accept: boolean) =>
    start(async () => {
      const res = await respondFriendRequest(id, accept);
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong");
        return;
      }
      setList((l) => l.filter((r) => r.request_id !== id));
      toast.success(accept ? "Friend added!" : "Request declined");
      router.refresh();
    });

  if (list.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Requests <span className="text-primary">({list.length})</span>
      </h2>
      {list.map((r) => (
        <Card key={r.request_id}>
          <CardContent className="flex items-center gap-3 p-3">
            <Link href={`/u/${r.username}`}>
              <UserAvatar src={r.avatar_url} name={r.display_name ?? r.username} className="size-10" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/u/${r.username}`} className="truncate text-sm font-medium hover:underline">
                {r.display_name ?? r.username}
              </Link>
              <p className="text-xs text-muted-foreground">wants to be friends · {timeAgo(r.created_at)}</p>
            </div>
            <Button size="icon-sm" variant="gradient" onClick={() => respond(r.request_id, true)} disabled={pending} aria-label="Accept">
              <Check />
            </Button>
            <Button size="icon-sm" variant="outline" onClick={() => respond(r.request_id, false)} disabled={pending} aria-label="Decline">
              <X />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FriendsList({ friends }: { friends: FriendRow[] }) {
  const [list, setList] = useState(friends);
  const [pending, start] = useTransition();
  const router = useRouter();

  const message = (id: string) =>
    start(async () => {
      const res = await startConversation(id);
      if (!res.ok) {
        toast.error(res.error ?? "Cannot message this player");
        return;
      }
      router.push(`/messages/${res.conversation_id}`);
    });

  const unfriend = (f: FriendRow) =>
    start(async () => {
      const res = await removeFriend(f.user_id);
      if (!res.ok) {
        toast.error(res.error ?? "Could not remove");
        return;
      }
      setList((l) => l.filter((x) => x.user_id !== f.user_id));
      toast.success(`Removed ${f.display_name ?? f.username}`);
    });

  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="grid place-items-center py-12 text-center">
          <p className="text-sm text-muted-foreground">No friends yet. Add someone by username above!</p>
        </CardContent>
      </Card>
    );
  }

  const online = list.filter((f) => f.is_online);
  const offline = list.filter((f) => !f.is_online);

  return (
    <div className="space-y-4">
      {[
        { label: `Online — ${online.length}`, items: online },
        { label: `Offline — ${offline.length}`, items: offline },
      ].map(
        (group) =>
          group.items.length > 0 && (
            <div key={group.label} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{group.label}</h2>
              {group.items.map((f) => (
                <Card key={f.user_id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Link href={`/u/${f.username}`} className="relative">
                      <UserAvatar src={f.avatar_url} name={f.display_name ?? f.username} frame={f.equipped?.avatar_frame} className="size-10" />
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <PresenceDot lastSeen={f.is_online ? new Date().toISOString() : f.last_seen_at} className="size-3.5" />
                      </span>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/u/${f.username}`} className="truncate text-sm font-medium hover:underline">
                        {f.display_name ?? f.username}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {f.is_online ? "Online" : f.last_seen_at ? `Last seen ${timeAgo(f.last_seen_at)}` : `Level ${f.level}`}
                      </p>
                    </div>
                    <Button size="icon-sm" variant="outline" onClick={() => message(f.user_id)} disabled={pending} aria-label="Message">
                      <MessageSquare />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => unfriend(f)} disabled={pending} aria-label="Remove friend" className="text-muted-foreground hover:text-destructive">
                      <UserX />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ),
      )}
    </div>
  );
}
