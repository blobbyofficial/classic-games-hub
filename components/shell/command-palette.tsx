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
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUIStore } from "@/lib/stores/ui-store";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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

  const { data: games = [] } = useQuery({
    queryKey: ["command-games"],
    enabled: open,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("games")
        .select("slug, title, category")
        .eq("status", "published")
        .order("sort_weight", { ascending: false });
      return data ?? [];
    },
  });

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent hideClose className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command
          className="[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-border"
          loop
        >
          <div className="flex items-center gap-2 px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Search games, pages, actions…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
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
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      {children}
    </Command.Item>
  );
}
