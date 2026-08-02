import Link from "next/link";
import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

export interface NowPlaying {
  slug: string;
  title: string;
  thumbnail_url: string | null;
  at: string;
  live: boolean;
}

/**
 * A small "playing X" chip for a profile.
 *
 * Entirely derived from the player's most recent session, so it can never
 * claim someone is playing a game they stopped playing last week - and it
 * returns nothing at all for anyone who has hidden their online status, since
 * "playing Snake right now" is presence arriving through a different door.
 */
export function NowPlayingChip({ playing }: { playing: NowPlaying }) {
  return (
    <Link
      href={`/games/${playing.slug}`}
      className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-card/60 px-2.5 py-1.5 transition-colors hover:bg-accent/50"
    >
      {playing.thumbnail_url ? (
        <Image
          src={playing.thumbnail_url}
          alt=""
          width={36}
          height={24}
          className="h-6 w-9 rounded object-cover"
        />
      ) : (
        <span className="grid h-6 w-9 place-items-center rounded bg-muted">
          <Gamepad2 className="size-3.5 text-muted-foreground" />
        </span>
      )}
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {playing.live && (
            <span
              className="size-1.5 rounded-full bg-success motion-safe:animate-pulse"
              aria-hidden
            />
          )}
          {playing.live ? "Playing now" : `Last played ${timeAgo(playing.at)}`}
        </span>
        <span className={cn("block truncate text-sm font-medium")}>{playing.title}</span>
      </span>
    </Link>
  );
}
