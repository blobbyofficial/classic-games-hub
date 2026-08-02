"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play } from "lucide-react";
import { musicEngine, TRACKS } from "@/lib/audio/music-engine";

/**
 * The equipped `track` cosmetic, playing on its owner's profile (roadmap
 * v1.5.0, "short looping profile music").
 *
 * No new shop rows and no new audio: this is the v1.3 track library, which was
 * already bought, already owned and already rendered procedurally in the
 * browser. Equipping a track simply gives it a second place to be heard.
 *
 * Deliberately click-to-play. Browsers block autoplay with sound outright, so
 * an auto-starting version would mostly be silent and occasionally ambush
 * someone - and a profile that starts making noise on its own is the reason
 * people remember profile music badly. The chip says what will play before
 * anything does.
 */

/** Shop slugs are `track-<key>`; the engine knows the bare key. */
export function profileTrackKey(slug?: string | null): string | null {
  if (!slug) return null;
  const key = slug.replace(/^track-/, "");
  return key in TRACKS ? key : null;
}

export function ProfileMusic({ slug }: { slug?: string | null }) {
  const trackKey = profileTrackKey(slug);
  const [playing, setPlaying] = useState(false);
  const startedRef = useRef(false);

  // Leaving the profile should not leave the music running behind you, but
  // only if this chip is what started it - the shell player shares the engine.
  useEffect(() => {
    return () => {
      if (startedRef.current && musicEngine?.playing === trackKey) musicEngine.stop();
    };
  }, [trackKey]);

  if (!trackKey) return null;
  const name = TRACKS[trackKey].name;

  const toggle = async () => {
    if (!musicEngine) return;
    if (playing) {
      musicEngine.stop();
      startedRef.current = false;
      setPlaying(false);
      return;
    }
    const ok = await musicEngine.play(trackKey);
    startedRef.current = ok;
    setPlaying(ok);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      className="focus-visible-ring inline-flex items-center gap-2.5 rounded-xl border border-border bg-card/60 px-2.5 py-1.5 text-left transition-colors hover:bg-accent/50"
    >
      <span className="grid h-6 w-9 place-items-center rounded bg-muted text-muted-foreground">
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Music className="size-3" />
          {playing ? "Now playing" : "Profile theme"}
        </span>
        <span className="block truncate text-sm font-medium">{name}</span>
      </span>
    </button>
  );
}
