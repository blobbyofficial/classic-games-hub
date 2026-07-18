"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Star, Users } from "lucide-react";
import { motion } from "framer-motion";
import { cn, compactNumber } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { GameWithMeta } from "@/types";
import { FavoriteButton } from "./favorite-button";

export function GameCard({
  game,
  isFavorite,
  priority,
}: {
  game: GameWithMeta;
  isFavorite?: boolean;
  priority?: boolean;
}) {
  const meta = CATEGORY_META[game.category];
  const comingSoon = game.status === "coming_soon";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative"
    >
      <Link
        href={`/games/${game.slug}`}
        className={cn(
          "focus-visible-ring block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-xl",
          meta?.glow && `hover:${meta.glow}`,
        )}
        aria-disabled={comingSoon}
      >
        <div className="relative aspect-[8/5] overflow-hidden">
          <Image
            src={game.thumbnail_url ?? "/games/thumbs/snake.svg"}
            alt={game.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {game.featured && !comingSoon && (
              <Badge variant="gold" className="backdrop-blur-md">
                <Star className="size-3 fill-current" /> Featured
              </Badge>
            )}
            {comingSoon && (
              <Badge variant="neon" className="backdrop-blur-md">
                Coming soon
              </Badge>
            )}
          </div>

          {!comingSoon && (
            <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
              <span className="grid size-14 place-items-center rounded-full bg-primary/90 text-white shadow-lg backdrop-blur-sm">
                <Play className="size-6 translate-x-0.5 fill-current" />
              </span>
            </div>
          )}

          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white drop-shadow">{game.title}</h3>
              {game.tagline && (
                <p className="truncate text-xs text-white/70">{game.tagline}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2.5 text-xs text-muted-foreground">
          <span className={cn("font-medium", meta?.color)}>{game.category}</span>
          <div className="flex items-center gap-3">
            {game.rating_count > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-3 fill-gold text-gold" />
                {game.rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {compactNumber(game.play_count)}
            </span>
          </div>
        </div>
      </Link>

      {!comingSoon && (
        <div className="absolute right-2.5 top-2.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <FavoriteButton gameId={game.id} initial={isFavorite ?? false} />
        </div>
      )}
    </motion.div>
  );
}
