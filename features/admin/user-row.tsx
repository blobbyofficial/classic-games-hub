"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, Coins, Shield, Ban, Check } from "lucide-react";
import { toast } from "sonner";
import { adminAdjustCredits, adminSetRole, adminSetBanned } from "@/actions/admin";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber } from "@/lib/utils";
import type { Profile } from "@/types";

export function UserRow({ user, canManageRoles }: { user: Profile; canManageRoles: boolean }) {
  const [banned, setBanned] = useState(user.is_banned);
  const [role, setRole] = useState(user.role);
  const [pending, start] = useTransition();
  const [creditOpen, setCreditOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const adjustCredits = () =>
    start(async () => {
      const n = parseInt(amount, 10);
      if (!Number.isFinite(n) || n === 0) return;
      const res = await adminAdjustCredits(user.id, n, reason || "Manual adjustment");
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success(`Adjusted ${user.username} by ${n} credits`);
      setCreditOpen(false);
      setAmount("");
      setReason("");
    });

  const changeRole = (r: "user" | "moderator" | "admin") =>
    start(async () => {
      const res = await adminSetRole(user.id, r);
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      setRole(r);
      toast.success(`${user.username} is now ${r}`);
    });

  const toggleBan = () =>
    start(async () => {
      const res = await adminSetBanned(user.id, !banned);
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      setBanned(!banned);
      toast.success(!banned ? `Banned ${user.username}` : `Unbanned ${user.username}`);
    });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <Link href={`/u/${user.username}`}>
        <UserAvatar src={user.avatar_url} name={user.display_name ?? user.username} className="size-10" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/u/${user.username}`} className="truncate text-sm font-medium hover:underline">
            {user.display_name ?? user.username}
          </Link>
          {role !== "user" && <Badge variant={role === "admin" ? "destructive" : "neon"}>{role}</Badge>}
          {banned && <Badge variant="destructive">Banned</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          @{user.username} · Lvl {user.level} · <Coins className="inline size-3" /> {formatNumber(user.credits)}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={pending} aria-label="Manage user">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setCreditOpen(true)}>
            <Coins /> Adjust credits
          </DropdownMenuItem>
          {canManageRoles && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Role</DropdownMenuLabel>
              {(["user", "moderator", "admin"] as const).map((r) => (
                <DropdownMenuItem key={r} onClick={() => changeRole(r)}>
                  <Shield /> {r} {role === r && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleBan} className="text-destructive">
            <Ban /> {banned ? "Unban" : "Ban"} user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust credits for @{user.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (negative to remove)"
            />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={adjustCredits} disabled={pending}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
