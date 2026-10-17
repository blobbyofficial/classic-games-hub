"use client";

import { useMemo, useState } from "react";
import { Search, X, SlidersHorizontal, Heart, Gamepad2 } from "lucide-react";
import { GameGrid } from "@/components/games/game-grid";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { GameWithMeta } from "@/types";

type Sort = "featured" | "popular" | "rating" | "az";

export function GamesLibrary({
  games,
  favorites,
  initialCategory,
}: {
  games: GameWithMeta[];
  favorites: string[];
  initialCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(
    initialCategory && CATEGORIES.includes(initialCategory as (typeof CATEGORIES)[number])
      ? initialCategory
      : "All",
  );
  const [sort, setSort] = useState<Sort>("featured");
  const [favOnly, setFavOnly] = useState(false);
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const filtered = useMemo(() => {
    let list = games.filter((g) => {
      if (category !== "All" && g.category !== category) return false;
      if (favOnly && !favSet.has(g.id)) return false;
      if (query.trim()) {
        const q = query.trim().toLocaleLowerCase();
        return (
          g.title.toLowerCase().includes(q) ||
          g.tagline?.toLowerCase().includes(q) ||
          (g.tags ?? []).some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "popular":
          return b.play_count - a.play_count;
        case "rating":
          return b.rating - a.rating || b.rating_count - a.rating_count;
        case "az":
          return a.title.localeCompare(b.title);
        default:
          return Number(b.featured) - Number(a.featured) || b.sort_weight - a.sort_weight;
      }
    });
    return list;
  }, [games, category, favOnly, favSet, query, sort]);

  return (
    <div className="halloween-library space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games…"
            className="min-h-11 pl-9 pr-9 text-base sm:text-sm"
            aria-label="Search games"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex">
          <Button
            variant={favOnly ? "default" : "outline"}
            onClick={() => setFavOnly((f) => !f)}
            aria-pressed={favOnly}
            className="min-h-11 shrink-0"
          >
            <Heart className={favOnly ? "fill-current" : undefined} /> Favourites
          </Button>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger aria-label="Sort games by" className="min-h-11 min-w-0 w-full sm:w-40">
              <SlidersHorizontal className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="popular">Most played</SelectItem>
              <SelectItem value="rating">Top rated</SelectItem>
              <SelectItem value="az">A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrolls rather than wraps on narrow screens, so the filter row stays
          one line tall on a phone instead of pushing the grid down. */}
      <div
        role="group"
        aria-label="Filter games by category"
        className="halloween-library-filters rail -mx-4 gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {["All", ...CATEGORIES].map((cat) => {
          const selected = category === cat;
          return (
            <button
              key={cat}
              aria-pressed={selected}
              onClick={() => setCategory(cat)}
              type="button"
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                "transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease-standard)] motion-safe:active:scale-95",
                selected
                  ? "border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="No games match your filters"
          description="Try a different category, or clear everything and start again."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setCategory("All");
                setFavOnly(false);
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "game" : "games"}
          </p>
          <GameGrid games={filtered} favorites={favSet} />
        </>
      )}
    </div>
  );
}
