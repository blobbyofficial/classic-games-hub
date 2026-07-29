"use client";

import { useState, useTransition } from "react";
import { Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { inviteToParty } from "@/actions/parties";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/ui/avatar";
import { PlayerName } from "@/components/profile/player-name";
import type { FriendRow, PartyMember } from "@/types";

/**
 * Invite friends straight from the lobby. The invite is a notification carrying
 * the party's code, so the recipient still chooses whether to join.
 */
export function InviteFriends({ friends, members }: { friends: FriendRow[]; members: PartyMember[] }) {
  const [open, setOpen] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const inParty = new Set(members.map((m) => m.user_id));
  const invitable = friends.filter((f) => !inParty.has(f.user_id));

  const invite = (userId: string, name: string) =>
    start(async () => {
      const res = await inviteToParty(userId);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't send that invite");
        return;
      }
      setInvited((prev) => new Set(prev).add(userId));
      toast.success(`Invited ${name}`);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Invite friends">
          <UserPlus />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
          <DialogDescription>They&apos;ll get a notification with the invite code.</DialogDescription>
        </DialogHeader>

        {invitable.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {friends.length === 0
              ? "Add some friends first - then you can invite them here."
              : "All your friends are already in the party."}
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="space-y-1 pr-3">
              {invitable.map((f) => {
                const name = f.display_name ?? f.username;
                const done = invited.has(f.user_id);
                return (
                  <li key={f.user_id} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                    <UserAvatar src={f.avatar_url} name={name} frame={f.equipped?.avatar_frame} decoration={f.equipped?.decoration} className="size-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        <PlayerName name={name} equipped={f.equipped} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Level {f.level} · {f.is_online ? "online" : "offline"}
                      </p>
                    </div>
                    <Button
                      variant={done ? "ghost" : "outline"}
                      size="sm"
                      onClick={() => invite(f.user_id, name)}
                      disabled={pending || done}
                    >
                      {done ? <Check className="size-4" /> : "Invite"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
