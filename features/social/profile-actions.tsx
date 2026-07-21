"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  UserPlus,
  UserCheck,
  UserX,
  UserRound,
  MessageSquare,
  MoreHorizontal,
  Ban,
  Flag,
  Check,
  X,
  Clock,
  Rss,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  blockUser,
  startConversation,
  followUser,
  unfollowUser,
  setUserNote,
} from "@/actions/social";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ReportDialog } from "./report-dialog";
import type { FriendshipRelation } from "@/types";

export function ProfileActions({
  targetId,
  username,
  relation,
  requestId,
  isFollowing = false,
  note,
  nickname,
}: {
  targetId: string;
  username: string;
  relation: FriendshipRelation;
  requestId?: number;
  isFollowing?: boolean;
  note?: string | null;
  nickname?: string | null;
}) {
  const router = useRouter();
  const [rel, setRel] = useState<FriendshipRelation>(relation);
  const [following, setFollowing] = useState(isFollowing);
  const [pending, start] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  if (rel === "self") return null;

  const toggleFollow = () => {
    const next = !following;
    setFollowing(next);
    start(async () => {
      const res = next ? await followUser(targetId) : await unfollowUser(targetId);
      if (!res.ok) {
        setFollowing(!next);
        toast.error(res.error ?? "Something went wrong");
      } else {
        toast.success(next ? `Following @${username}` : `Unfollowed @${username}`);
        router.refresh();
      }
    });
  };

  const act = (fn: () => Promise<{ ok: boolean; error?: string; status?: string }>, next: FriendshipRelation, ok: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong");
        return;
      }
      setRel(res.status === "accepted" ? "friends" : next);
      toast.success(ok);
      router.refresh();
    });

  const openChat = () =>
    start(async () => {
      const res = await startConversation(targetId);
      if (!res.ok) { toast.error(res.error ?? "Cannot message this player"); return; }
      router.push(`/messages/${res.conversation_id}`);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {rel === "none" && (
        <Button
          variant="gradient"
          onClick={() => act(() => sendFriendRequest(username), "outgoing", "Friend request sent")}
          disabled={pending}
        >
          <UserPlus /> Add friend
        </Button>
      )}
      {rel === "outgoing" && (
        <Button variant="secondary" disabled>
          <Clock /> Request sent
        </Button>
      )}
      {rel === "incoming" && requestId && (
        <div className="flex gap-2">
          <Button
            variant="gradient"
            onClick={() => act(() => respondFriendRequest(requestId, true), "friends", "You are now friends")}
            disabled={pending}
          >
            <Check /> Accept
          </Button>
          <Button
            variant="outline"
            onClick={() => act(() => respondFriendRequest(requestId, false), "none", "Request declined")}
            disabled={pending}
          >
            <X /> Decline
          </Button>
        </div>
      )}
      {rel === "friends" && (
        <Button variant="secondary" disabled>
          <UserCheck /> Friends
        </Button>
      )}
      {rel === "blocked" && (
        <Button variant="outline" disabled>
          <Ban /> Blocked
        </Button>
      )}

      {rel !== "blocked" && (
        <Button variant="outline" onClick={openChat} disabled={pending}>
          <MessageSquare /> Message
        </Button>
      )}

      {rel !== "blocked" && (
        <Button variant={following ? "secondary" : "outline"} onClick={toggleFollow} disabled={pending}>
          {following ? <UserCheck /> : <Rss />} {following ? "Following" : "Follow"}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {rel === "friends" && (
            <DropdownMenuItem
              onClick={() => act(() => removeFriend(targetId), "none", "Friend removed")}
              className="text-destructive"
            >
              <UserX /> Remove friend
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setNoteOpen(true)}>
            <StickyNote /> {note || nickname ? "Edit note" : "Add note"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setReportOpen(true)}>
            <Flag /> Report
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => act(() => blockUser(targetId), "blocked", `Blocked @${username}`)}
            className="text-destructive"
          >
            <Ban /> Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="user"
        targetUserId={targetId}
        label={`@${username}`}
      />

      <NoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        targetId={targetId}
        username={username}
        initialNote={note ?? ""}
        initialNickname={nickname ?? ""}
      />
    </div>
  );
}

function NoteDialog({
  open,
  onOpenChange,
  targetId,
  username,
  initialNote,
  initialNickname,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetId: string;
  username: string;
  initialNote: string;
  initialNickname: string;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [note, setNote] = useState(initialNote);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await setUserNote(targetId, nickname, note);
      if (!res.ok) return void toast.error(res.error ?? "Could not save");
      toast.success("Note saved — only you can see it");
      onOpenChange(false);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5" /> Private note
          </DialogTitle>
          <DialogDescription>
            A private nickname and note about @{username}. Only you can see this.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={40}
              placeholder="What you call them"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="How you know them, reminders…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="gradient" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
