"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Film, Loader2, Search } from "lucide-react";
import { searchGifs, type GifResult } from "@/actions/gifs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Discord-style GIF picker: search Giphy and tap a result to send it. Loads
 * trending GIFs on open, debounces the search, and hands the chosen GIF's URL
 * back to the composer (which sends it as a normal message that renders inline).
 */
export function GifPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [pending, start] = useTransition();
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const mine = ++seq.current;
    const delay = query.trim() ? 300 : 0; // debounce typed queries; trending is instant
    const t = setTimeout(() => {
      start(async () => {
        const r = await searchGifs(query);
        if (mine === seq.current) setResults(r);
      });
    }, delay);
    return () => clearTimeout(t);
  }, [open, query]);

  const pick = (url: string) => {
    onSelect(url);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Send a GIF">
          <Film />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs…"
            className="pl-8"
            autoFocus
            maxLength={80}
          />
        </div>
        <div className="mt-2 h-64 overflow-y-auto">
          {pending && results.length === 0 ? (
            <div className="grid h-full place-items-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
              {query.trim() ? "No GIFs found - try another search." : "GIF search is unavailable right now."}
            </p>
          ) : (
            <div className="columns-2 gap-2">
              {results.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => pick(g.url)}
                  className="mb-2 block w-full overflow-hidden rounded-lg border border-transparent transition-colors hover:border-primary"
                  aria-label={`Send ${g.title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.preview}
                    alt={g.title}
                    loading="lazy"
                    className="w-full bg-muted"
                    style={{ aspectRatio: `${g.width} / ${g.height}` }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-center text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          Powered by GIPHY
        </p>
      </PopoverContent>
    </Popover>
  );
}
