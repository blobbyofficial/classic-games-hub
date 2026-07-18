"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/actions/games";
import { useSessionStore } from "@/lib/stores/session-store";

/** Optimistic favorite toggle used on cards and detail pages. */
export function FavoriteButton({
  gameId,
  initial,
  className,
  withLabel,
}: {
  gameId: string;
  initial: boolean;
  className?: string;
  withLabel?: boolean;
}) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  const userId = useSessionStore((s) => s.userId);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      toast.error("Log in to save favorites");
      return;
    }
    const next = !fav;
    setFav(next); // optimistic
    start(async () => {
      const res = await toggleFavorite(gameId, next);
      if (!res.ok) {
        setFav(!next);
        toast.error(res.error ?? "Something went wrong");
      }
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-pressed={fav}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "focus-visible-ring inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-2.5 py-2 text-sm font-medium backdrop-blur-md transition-colors hover:bg-background",
        withLabel && "px-4",
        className,
      )}
    >
      <Heart className={cn("size-4 transition-all", fav ? "scale-110 fill-rose-500 text-rose-500" : "text-muted-foreground")} />
      {withLabel && (fav ? "Favorited" : "Favorite")}
    </button>
  );
}
