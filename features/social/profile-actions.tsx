"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  UserPlus,
  UserCheck,
  UserX,
  MessageSquare,
  MoreHorizontal,
  Ban,
  Flag,
  Check,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  blockUser,
  startConversation,
} from "@/actions/social";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "./report-dialog";
import type { FriendshipRelation } from "@/types";

export function ProfileActions({
  targetId,
  username,
  relation,
  requestId,
}: {
  targetId: string;
  username: string;
  relation: FriendshipRelation;
  requestId?: number;
}) {
  const router = useRouter();
  const [rel, setRel] = useState<FriendshipRelation>(relation);
  const [pending, start] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);

  if (rel === "self") return null;

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
    </div>
  );
}
