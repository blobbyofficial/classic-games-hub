"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { CreditsPill } from "./credits-pill";
import { LevelPill } from "./level-pill";
import { NotificationsBell } from "./notifications-bell";
import { MusicPlayer } from "./music-player";
import { UserMenu } from "./user-menu";
import { MobileMenu } from "./mobile-menu";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/stores/ui-store";
import { useSessionStore } from "@/lib/stores/session-store";

export function Navbar() {
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const userId = useSessionStore((s) => s.userId);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <MobileMenu />
        <Logo className="shrink-0 lg:w-52" />

        <button
          onClick={() => setCommandOpen(true)}
          className="group ml-auto flex h-10 max-w-md flex-1 items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-[background-color,border-color] duration-200 hover:border-primary/30 hover:bg-muted/70 lg:ml-0"
          aria-label="Search games and players"
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search className="size-4 shrink-0 transition-transform duration-200 motion-safe:group-hover:scale-110" />
          <span className="hidden truncate sm:inline">Search games, players…</span>
          <span className="truncate sm:hidden">Search…</span>
          <kbd className="ml-auto hidden shrink-0 items-center rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium sm:flex">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5 lg:ml-4">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {userId ? (
            <>
              <div className="hidden sm:block">
                <CreditsPill />
              </div>
              <MusicPlayer />
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
              <Button variant="gradient" asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
