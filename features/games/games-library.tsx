"use client";

import { useMemo, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { GameGrid } from "@/components/games/game-grid";
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
  const [category, setCategory] = useState<string>(initialCategory ?? "All");
  const [sort, setSort] = useState<Sort>("featured");
  const [favOnly, setFavOnly] = useState(false);
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const filtered = useMemo(() => {
    let list = games.filter((g) => {
      if (category !== "All" && g.category !== category) return false;
      if (favOnly && !favSet.has(g.id)) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          g.title.toLowerCase().includes(q) ||
          g.tagline?.toLowerCase().includes(q) ||
          g.tags.some((t) => t.toLowerCase().includes(q))
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games…"
            className="pl-9 pr-9"
            aria-label="Search games"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={favOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFavOnly((f) => !f)}
            className="shrink-0"
          >
            ♥ Favorites
          </Button>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-36">
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

      <div className="flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              category === cat ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {category === cat && (
              <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <span className="relative z-10">{cat}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No games match your filters.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              setQuery("");
              setCategory("All");
              setFavOnly(false);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "game" : "games"}
          </p>
          <GameGrid games={filtered} favorites={favSet} />
        </>
      )}
    </div>
  );
}
