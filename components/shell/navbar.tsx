"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications-bell";
import { MusicPlayerLazy } from "./music-player-lazy";
import { UserMenu } from "./user-menu";
import { MobileMenu } from "./mobile-menu";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/stores/ui-store";
import { useSessionStore } from "@/lib/stores/session-store";

export function Navbar() {
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const userId = useSessionStore((s) => s.userId);

  return (
    <header className="halloween-navigation sticky top-0 z-40 border-b border-border/70 bg-background/95">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <MobileMenu />
        <Logo className="min-w-0 shrink-0 [&>span:last-child]:hidden sm:[&>span:last-child]:inline lg:w-52" />
        <span className="halloween-nav-tag hidden" aria-hidden="true">AFTER DARK</span>

        <button
          onClick={() => setCommandOpen(true)}
          className="halloween-search ml-auto flex h-10 min-w-10 max-w-md flex-none items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 sm:flex-1 sm:justify-start sm:px-3 lg:ml-0"
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search className="size-4 shrink-0" />
          <span className="sr-only">Search games and pages</span>
          <span aria-hidden="true" className="hidden truncate sm:inline">Search games</span>
          <kbd aria-hidden="true" className="ml-auto hidden shrink-0 items-center rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium sm:flex">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-0 flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1.5 lg:ml-4">
          {userId ? (
            <>
              <div className="hidden md:block"><MusicPlayerLazy /></div>
              <NotificationsBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="gradient" asChild className="px-3 sm:px-4">
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
