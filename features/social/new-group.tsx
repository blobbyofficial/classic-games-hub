"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { createGroup } from "@/actions/social";
import { SITE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewGroupButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [invite, setInvite] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const res = await createGroup(name);
      if (!res.ok) return void toast.error(res.error ?? "Could not create group");
      setInvite({ id: res.conversation_id as string, code: res.invite_code as string });
    });

  const inviteUrl = invite ? `${SITE.url}/invite/${invite.code}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setName("");
          setInvite(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> New group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" /> {invite ? "Group created" : "New group"}
          </DialogTitle>
          <DialogDescription>
            {invite
              ? "Share this invite link so friends can join."
              : "Create a group chat and invite friends with a shareable link. (Discord-linked members, staff, and level 10+.)"}
          </DialogDescription>
        </DialogHeader>

        {invite ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={inviteUrl} readOnly className="text-xs" />
              <Button size="icon" variant="outline" onClick={copy} aria-label="Copy invite link">
                {copied ? <Check className="text-success" /> : <Copy />}
              </Button>
            </div>
            <Button variant="gradient" className="w-full" onClick={() => router.push(`/messages/${invite.id}`)}>
              Open group
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Weekend Warriors"
              />
            </div>
            <DialogFooter>
              <Button variant="gradient" onClick={create} disabled={pending || !name.trim()}>
                {pending ? "Creating…" : "Create group"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
