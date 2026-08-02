"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Check, X, MessageSquare, UserX, Search, Clock, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  searchPlayers,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  startConversation,
} from "@/actions/social";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PresenceDot } from "@/components/profile/presence-dot";
import { PlayerName } from "@/components/profile/player-name";
import { timeAgo } from "@/lib/utils";
import type { FriendRow, FriendRequestRow, PlayerSearchRow } from "@/types";

/** Live player search with inline "Add friend" actions. */
export function AddFriend() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const rows = await searchPlayers(q);
      setResults(rows);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setTouched(true);
            setQuery(e.target.value);
          }}
          placeholder="Search players by name to add"
          className="pl-9"
          maxLength={24}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {touched && query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">No players found for “{query.trim()}”.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((p) => (
            <PlayerResult key={p.id} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerResult({ player }: { player: PlayerSearchRow }) {
  const [relation, setRelation] = useState(player.relation);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      const res = await sendFriendRequest(player.username);
      if (!res.ok) {
        toast.error(res.error ?? "Could not send request");
        return;
      }
      setRelation(res.status === "accepted" ? "friends" : "outgoing");
      toast.success(res.status === "accepted" ? "You are now friends!" : "Friend request sent");
    });

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <Link href={`/u/${player.username}`}>
          <UserAvatar
            src={player.avatar_url}
            name={player.display_name ?? player.username}
            frame={player.equipped?.avatar_frame}
            decoration={player.equipped?.decoration}
            className="size-10"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${player.username}`} className="truncate text-sm font-medium hover:underline">
            <PlayerName name={player.display_name ?? player.username} equipped={player.equipped} />
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            @{player.username} · Level {player.level}
          </p>
        </div>
        {relation === "none" && (
          <Button size="sm" variant="gradient" onClick={add} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Add
          </Button>
        )}
        {relation === "outgoing" && (
          <Button size="sm" variant="secondary" disabled>
            <Clock /> Requested
          </Button>
        )}
        {relation === "friends" && (
          <Button size="sm" variant="secondary" disabled>
            <UserCheck /> Friends
          </Button>
        )}
        {relation === "incoming" && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/u/${player.username}`}>Respond</Link>
          </Button>
        )}
        {relation === "blocked" && (
          <Button size="sm" variant="outline" disabled>
            Blocked
          </Button>
        )}
      </CardContent>
    </Card>
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
        { label: `Online - ${online.length}`, items: online },
        { label: `Offline - ${offline.length}`, items: offline },
      ].map(
        (group) =>
          group.items.length > 0 && (
            <div key={group.label} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{group.label}</h2>
              {group.items.map((f) => (
                <Card key={f.user_id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Link href={`/u/${f.username}`} className="relative">
                      <UserAvatar src={f.avatar_url} name={f.display_name ?? f.username} frame={f.equipped?.avatar_frame} decoration={f.equipped?.decoration} className="size-10" />
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
