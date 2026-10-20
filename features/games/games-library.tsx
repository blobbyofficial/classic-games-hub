"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, SlidersHorizontal, Heart, Gamepad2, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { GameGrid } from "@/components/games/game-grid";
import { LibraryBackToTop } from "./library-polish";
import { RecentGamesStrip } from "./recent-games";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { GameWithMeta } from "@/types";

type Sort = "featured" | "popular" | "rating" | "az";

function categoryFromUrl(value?: string | null) {
  return CATEGORIES.find((category) => category.toLowerCase() === value?.toLowerCase()) ?? "All";
}

export function GamesLibrary({
  games,
  favorites,
  initialCategory,
}: {
  games: GameWithMeta[];
  favorites: string[];
  initialCategory?: string;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(
    categoryFromUrl(initialCategory),
  );
  const [sort, setSort] = useState<Sort>("featured");
  const [favOnly, setFavOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  // Follow navigation to a different category, including browser Back/Forward.
  // The library remains client-filtered: changing the URL does not need a
  // server fetch or a full-page transition.
  useEffect(() => {
    setCategory(categoryFromUrl(initialCategory));
  }, [initialCategory]);

  useEffect(() => {
    const onPopState = () => {
      setCategory(categoryFromUrl(new URLSearchParams(window.location.search).get("category")));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // "/" focuses search unless a text field or modifier key already owns the shortcut.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectCategory = (next: string) => {
    if (next === category) return;
    setCategory(next);
    const url = new URL(window.location.href);
    if (next === "All") url.searchParams.delete("category");
    else url.searchParams.set("category", next.toLowerCase());
    // Native History API integration is supported by the Next.js App Router.
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
  };

  const resetFilters = () => {
    setQuery("");
    setFavOnly(false);
    selectCategory("All");
  };

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let list = games.filter((g) => {
      if (category !== "All" && g.category !== category) return false;
      if (favOnly && !favSet.has(g.id)) return false;
      if (normalizedQuery) {
        return (
          g.title.toLowerCase().includes(normalizedQuery) ||
          g.category.toLowerCase().includes(normalizedQuery) ||
          g.tagline?.toLowerCase().includes(normalizedQuery) ||
          (g.tags ?? []).some((t) => t.toLowerCase().includes(normalizedQuery))
        );
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "popular":
          return b.play_count - a.play_count;
        case "rating":
          return Number(b.rating_count > 0) - Number(a.rating_count > 0)
            || b.rating - a.rating
            || b.rating_count - a.rating_count
            || a.title.localeCompare(b.title);
        case "az":
          return a.title.localeCompare(b.title);
        default:
          return Number(b.featured) - Number(a.featured) || b.sort_weight - a.sort_weight;
      }
    });
    return list;
  }, [games, category, favOnly, favSet, query, sort]);

  useEffect(() => { setVisibleCount(24); }, [query, category, sort, favOnly]);

  const surpriseCandidates = useMemo(() => games.filter((game) =>
    game.status === "published" &&
    (category === "All" || game.category === category) &&
    (!game.early_access_until || new Date(game.early_access_until).getTime() <= Date.now())
  ), [games, category]);

  return (
    <div className="halloween-library space-y-5">
      <LibraryBackToTop />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games…"
            className="min-h-11 pl-9 pr-9 text-base sm:text-sm"
            aria-label="Search games"
            onKeyDown={(event) => { if (event.key === "Escape" && query) { event.preventDefault(); setQuery(""); } }}
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
          {surpriseCandidates.length > 0 && <Button variant="outline" className="min-h-11 shrink-0" onClick={() => {
            const game = surpriseCandidates[Math.floor(Math.random() * surpriseCandidates.length)];
            router.push(`/games/${game.slug}`);
          }}><Shuffle /> Surprise me</Button>}
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
              onClick={() => selectCategory(cat)}
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

      <RecentGamesStrip games={games} />
      {filtered.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="No games match your filters"
          description={query.trim() ? "No titles or tags match your search. Try another term." : favOnly ? "None of your favourites match the current category." : "Try another category or clear the filters."}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {query.trim() && <Button variant="outline" onClick={() => setQuery("")}>Clear search</Button>}
              {favOnly && <Button variant="outline" onClick={() => setFavOnly(false)}>Show all favourites and games</Button>}
              {category !== "All" && <Button variant="outline" onClick={() => selectCategory("All")}>All categories</Button>}
              <Button variant="outline" onClick={resetFilters}>Clear all filters</Button>
            </div>
          }
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "game" : "games"}
          </p>
          <GameGrid games={filtered.slice(0, visibleCount)} favorites={favSet} highlightQuery={query} />
          {filtered.length > visibleCount && (
            <div className="flex justify-center">
              <Button variant="outline" className="min-h-11" onClick={() => setVisibleCount((count) => Math.min(count + 24, filtered.length))}>
                Show more games ({Math.min(24, filtered.length - visibleCount)} more)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
