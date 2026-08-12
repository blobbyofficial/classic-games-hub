"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Gamepad2,
  Home,
  Trophy,
  Store,
  Award,
  Users,
  MessageSquare,
  Settings,
  Search,
  Package,
  Target,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useUIStore } from "@/lib/stores/ui-store";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type GameHit = { slug: string; title: string; category: string };

/**
 * The game list is small, identical for every visitor and changes about as often
 * as a release, so it's fetched once per page load and kept in module scope.
 * That replaced a whole query-cache dependency for this single call site.
 */
let gamesCache: GameHit[] | null = null;
let gamesInFlight: Promise<GameHit[]> | null = null;

async function loadGames(): Promise<GameHit[]> {
  if (gamesCache) return gamesCache;
  gamesInFlight ??= (async () => {
    try {
      const { data } = await createClient()
        .from("games")
        .select("slug, title, category")
        .in("status", ["published", "in_development"])
        .order("sort_weight", { ascending: false });
      gamesCache = (data as GameHit[] | null) ?? [];
      return gamesCache;
    } catch {
      // Let the next open retry rather than caching a network blip forever.
      gamesInFlight = null;
      return [];
    }
  })();
  return gamesInFlight;
}

const NAV = [
  { label: "Home", href: "/", icon: Home },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Leaderboards", href: "/leaderboards", icon: Trophy },
  { label: "Shop", href: "/shop", icon: Store },
  { label: "Achievements", href: "/achievements", icon: Award },
  { label: "Challenges", href: "/challenges", icon: Target },
  { label: "Friends", href: "/friends", icon: Users },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const toggle = useUIStore((s) => s.toggleCommand);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const [games, setGames] = useState<GameHit[]>([]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    loadGames().then((list) => {
      if (live) setGames(list);
    });
    return () => {
      live = false;
    };
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        className="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-[15%]"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command loop>
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Search games, pages, actions…"
              className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/80 sm:text-sm"
            />
            <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
              esc
            </kbd>
          </div>
          <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain p-2">
            <Command.Empty className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing matches that. Try a game title or a page name.
            </Command.Empty>

            <Command.Group heading="Games" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
              {games.map((g) => (
                <Item key={g.slug} onSelect={() => go(`/games/${g.slug}`)}>
                  <Gamepad2 className="size-4 text-muted-foreground" />
                  <span>{g.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{g.category}</span>
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
              {NAV.map((n) => (
                <Item key={n.href} onSelect={() => go(n.href)}>
                  <n.icon className="size-4 text-muted-foreground" />
                  <span>{n.label}</span>
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
              <Item
                onSelect={() => {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                  setOpen(false);
                }}
              >
                {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                <span>Toggle theme</span>
              </Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      {children}
    </Command.Item>
  );
}
