"use client";
import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";
import { musicEngine, TRACKS } from "@/lib/audio/music-engine";
export function profileTrackKey(slug?: string | null): string | null {
  if (!slug) return null;
  const key = slug.replace(/^track-/, "");
  return Object.prototype.hasOwnProperty.call(TRACKS, key) ? key : null;
}
export function ProfileMusic({ slug }: { slug?: string | null }) {
  const trackKey = profileTrackKey(slug);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  useEffect(() => () => { if (startedRef.current && musicEngine?.playing === trackKey) musicEngine.stop(); }, [trackKey]);
  if (!trackKey) return null;
  const name = TRACKS[trackKey].name;
  const toggle = async () => {
    if (!musicEngine || loading) return;
    if (playing) {
      if (musicEngine.playing === trackKey) musicEngine.stop();
      startedRef.current = false; setPlaying(false); return;
    }
    setLoading(true); setError(null);
    try {
      const ok = await musicEngine.play(trackKey);
      startedRef.current = ok; setPlaying(ok);
      if (!ok) setError("Unable to play this track");
    } catch { startedRef.current = false; setPlaying(false); setError("Unable to play this track"); }
    finally { setLoading(false); }
  };
  return (
    <button type="button" onClick={toggle} disabled={loading} aria-label={`${playing ? "Pause" : "Play"} profile music: ${name}`} aria-pressed={playing}
      className="focus-visible-ring inline-flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-accent/50 disabled:opacity-60">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Music2 className="size-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span aria-live="polite" className="block text-xs text-muted-foreground">{error ?? (loading ? "Loading…" : playing ? "Now playing" : "Profile music")}</span>
        <span className="block truncate text-sm font-semibold">{name}</span>
      </span>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted">{playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}</span>
    </button>
  );
}
