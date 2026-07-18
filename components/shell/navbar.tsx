"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { CreditsPill } from "./credits-pill";
import { LevelPill } from "./level-pill";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/stores/ui-store";
import { useSessionStore } from "@/lib/stores/session-store";

export function Navbar() {
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const userId = useSessionStore((s) => s.userId);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <Logo className="lg:w-52" />

        <button
          onClick={() => setCommandOpen(true)}
          className="focus-visible-ring group ml-auto flex h-10 max-w-md flex-1 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 lg:ml-0"
          aria-label="Open search"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">Search games, players…</span>
          <span className="sm:hidden">Search…</span>
          <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-4">
          <ThemeToggle />
          {userId ? (
            <>
              <div className="hidden sm:block">
                <CreditsPill />
              </div>
              <NotificationsBell />
              <div className="hidden sm:block">
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
