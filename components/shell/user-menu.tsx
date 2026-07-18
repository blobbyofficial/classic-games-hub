"use client";

import Link from "next/link";
import { LogOut, User, Settings, Package, ShieldCheck, Coins, Trophy } from "lucide-react";
import { useSessionStore } from "@/lib/stores/session-store";
import { signOut } from "@/actions/auth";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const profile = useSessionStore((s) => s.profile);
  if (!profile) return null;

  const isStaff = profile.role === "admin" || profile.role === "moderator";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible-ring rounded-full">
        <UserAvatar
          src={profile.avatar_url}
          name={profile.display_name ?? profile.username}
          frame={profile.equipped?.avatar_frame}
          className="size-9"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <UserAvatar
            src={profile.avatar_url}
            name={profile.display_name ?? profile.username}
            frame={profile.equipped?.avatar_frame}
            className="size-10"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.display_name ?? profile.username}</p>
            <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
        <div className="flex gap-2 px-2 pb-2 text-xs">
          <span className="flex items-center gap-1 rounded-md bg-gold/10 px-2 py-1 font-medium text-[oklch(0.55_0.13_85)] dark:text-gold">
            <Coins className="size-3" /> {formatNumber(profile.credits)}
          </span>
          <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-medium text-primary">
            <Trophy className="size-3" /> Lv {profile.level}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/u/${profile.username}`}>
            <User /> My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/inventory">
            <Package /> Inventory
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        {isStaff && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Staff</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck /> Admin dashboard
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-2 px-2.5 font-normal text-destructive hover:text-destructive"
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
