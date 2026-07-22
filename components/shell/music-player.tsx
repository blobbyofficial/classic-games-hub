"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Music, Pause, Play, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/lib/stores/session-store";
import { musicEngine, TRACKS } from "@/lib/audio/music-engine";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface OwnedTrack {
  slug: string; // engine key, e.g. "neon-drift"
  name: string;
}

const VOLUME_KEY = "cgh:music:volume";

/**
 * Background-music player (roadmap v1.3). Level-5+ players buy original,
 * procedurally rendered tracks in the shop and play them while they browse.
 * Playback starts only from a click (browser autoplay policy) and never
 * auto-resumes on page load.
 */
export function MusicPlayer() {
  const userId = useSessionStore((s) => s.userId);
  const [tracks, setTracks] = useState<OwnedTrack[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.6);

  useEffect(() => {
    const stored = parseFloat(localStorage.getItem(VOLUME_KEY) ?? "");
    if (Number.isFinite(stored)) {
      setVolume(stored);
      musicEngine?.setVolume(stored);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setTracks(null);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("inventory_items")
      .select("shop_items!inner(slug, name, kind, preview)")
      .eq("user_id", userId)
      .eq("shop_items.kind", "track")
      .then(({ data }) => {
        if (cancelled) return;
        const owned = (data ?? [])
          .map((row) => {
            const item = row.shop_items as unknown as {
              name: string;
              preview: { track?: string } | null;
            };
            const key = item.preview?.track;
            return key && key in TRACKS ? { slug: key, name: item.name } : null;
          })
          .filter((t): t is OwnedTrack => t !== null);
        setTracks(owned);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Nothing to show for signed-out users or players with no tracks yet.
  if (!userId || !tracks || tracks.length === 0) return null;

  const toggle = async (slug: string) => {
    if (!musicEngine) return;
    if (playing === slug) {
      musicEngine.stop();
      setPlaying(null);
    } else {
      const ok = await musicEngine.play(slug);
      setPlaying(ok ? slug : null);
    }
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    musicEngine?.setVolume(v);
    localStorage.setItem(VOLUME_KEY, String(v));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Background music" className="relative">
          <Music className={cn("size-4", playing && "text-primary")} />
          {playing && (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary motion-safe:animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="mb-2 text-sm font-semibold">Your tracks</p>
        <div className="space-y-1">
          {tracks.map((t) => (
            <button
              key={t.slug}
              onClick={() => void toggle(t.slug)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/60",
                playing === t.slug && "bg-primary/10 text-primary",
              )}
            >
              {playing === t.slug ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {t.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
          <Volume2 className="size-4 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            className="h-1.5 w-full accent-[var(--primary)]"
            aria-label="Music volume"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Original in-house tracks, rendered live in your browser.{" "}
          <Link href="/shop" className="text-primary hover:underline">
            More in the shop
          </Link>
        </p>
      </PopoverContent>
    </Popover>
  );
}
