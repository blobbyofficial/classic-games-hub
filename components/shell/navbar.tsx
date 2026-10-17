"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { CreditsPill } from "./credits-pill";
import { LevelPill } from "./level-pill";
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
    <header className="halloween-navigation sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] min-w-0 items-center gap-1.5 px-2 min-[380px]:gap-2 min-[380px]:px-3 sm:gap-3 sm:px-6">
        <MobileMenu />
        <Logo className="min-w-0 shrink-0 [&>span:last-child]:hidden sm:[&>span:last-child]:inline lg:w-52" />
        <span className="halloween-nav-tag hidden" aria-hidden="true">AFTER DARK</span>

        <button
          onClick={() => setCommandOpen(true)}
          className="halloween-search group ml-auto flex h-10 min-w-0 max-w-md flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-2 text-sm text-muted-foreground transition-[background-color,border-color] duration-200 hover:border-primary/30 hover:bg-muted/70 min-[380px]:justify-start sm:gap-2.5 sm:px-3 lg:ml-0"
          aria-label="Search games and players"
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search className="size-4 shrink-0 transition-transform duration-200 motion-safe:group-hover:scale-110" />
          <span className="hidden truncate sm:inline">Search games</span>
          <span className="hidden truncate min-[380px]:inline sm:hidden">Search</span>
          <kbd aria-hidden="true" className="ml-auto hidden shrink-0 items-center rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium sm:flex">
            ⌘K
          </kbd>
        </button>

        <div className="ml-0 flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1.5 lg:ml-4">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {userId ? (
            <>
              <div className="hidden sm:block">
                <CreditsPill />
              </div>
              <div className="hidden min-[400px]:block"><MusicPlayerLazy /></div>
              <NotificationsBell />
              <div className="hidden lg:block">
                <LevelPill />
              </div>
              <UserMenu />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="gradient" asChild className="max-[379px]:px-2">
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
