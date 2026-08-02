"use client";

import dynamic from "next/dynamic";
import { useSessionStore } from "@/lib/stores/session-store";

/**
 * The player renders nothing for signed-out players and for anyone who hasn't
 * bought a track yet - which is most visitors - but it pulls in the music
 * engine, a popover and the Supabase client to decide that. Gating the import
 * on a session keeps all of it out of the first load, and the real check for
 * owned tracks still happens inside the component.
 */
const MusicPlayer = dynamic(() => import("./music-player").then((m) => m.MusicPlayer), {
  ssr: false,
});

export function MusicPlayerLazy() {
  const userId = useSessionStore((s) => s.userId);
  if (!userId) return null;
  return <MusicPlayer />;
}
