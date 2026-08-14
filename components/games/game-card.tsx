import Link from "next/link";
import Image from "next/image";
import { Play, Star, Users, Lock, Wrench } from "lucide-react";
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
  // Badged but not disabled, like early access rather than coming soon: the
  // game is real, still favouritable and still holds its leaderboards. Whether
  // this particular viewer may play it is settled on the game page, which knows
  // their role; the card does not, and a card that lied either way is worse.
  const inDevelopment = game.status === "in_development";
  // Early access is shown to everyone, locked. A perk nobody can see is a perk
  // nobody wants, and half the point is that other people know it is running.
  const earlyAccess = Boolean(
    game.early_access_until && new Date(game.early_access_until) > new Date(),
  );

  return (
    <div className="group relative isolate">
      <Link
        href={`/games/${game.slug}`}
        className={cn(
          "hover-lift block overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
          comingSoon && "pointer-events-none opacity-70",
        )}
        aria-disabled={comingSoon || undefined}
        tabIndex={comingSoon ? -1 : undefined}
      >
        <div className="relative aspect-[8/5] overflow-hidden bg-muted">
          <Image
            src={game.thumbnail_url ?? "/games/thumbs/snake.svg"}
            alt=""
            fill
            priority={priority}
            loading={priority ? undefined : "lazy"}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-[600ms] ease-[var(--ease-standard)] motion-safe:group-hover:scale-[1.06]"
          />
          {/* Two stops rather than three: the title sits on a solid enough base
              to stay legible over any thumbnail, light or dark. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          {/* No backdrop-blur on any of these. The library renders this card
              twenty-six times, and each filtered layer is a separate composite
              pass the GPU redoes on scroll - the single worst offender for how
              /games felt on a phone. Every one of them sits on a thumbnail that
              already has a gradient over it, so raising the opacity gets the
              same legibility for nothing. */}
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {game.featured && !comingSoon && (
              <Badge variant="gold" className="border-transparent bg-black/70 text-gold">
                <Star className="fill-current" /> Featured
              </Badge>
            )}
            {comingSoon && (
              <Badge variant="neon" className="border-transparent bg-black/70 text-neon">
                Coming soon
              </Badge>
            )}
            {inDevelopment && (
              <Badge variant="warning" className="border-transparent bg-black/70 text-warning">
                <Wrench className="size-3" /> In development
              </Badge>
            )}
            {earlyAccess && !comingSoon && (
              <Badge className="border-none bg-[#f47fff] text-white">
                <Lock className="size-3" /> Early access
              </Badge>
            )}
          </div>

          {!comingSoon && !earlyAccess && (
            <div
              aria-hidden
              className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <span className="grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg transition-transform duration-300 ease-[var(--ease-spring)] motion-safe:scale-75 motion-safe:group-hover:scale-100 motion-safe:group-focus-within:scale-100">
                <Play className="size-6 translate-x-0.5 fill-current" />
              </span>
            </div>
          )}

          <div className="absolute inset-x-3 bottom-2.5">
            <h3 className="truncate font-semibold text-white drop-shadow-sm">{game.title}</h3>
            {game.tagline && (
              <p className="truncate text-xs text-white/75">{game.tagline}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-muted-foreground">
          <span className={cn("truncate font-semibold", meta?.color)}>{game.category}</span>
          <div className="flex shrink-0 items-center gap-3 tnum">
            {game.rating_count > 0 && (
              <span className="flex items-center gap-1" title={`${game.rating.toFixed(1)} out of 5`}>
                <Star className="size-3 fill-gold text-gold" />
                {game.rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1" title={`${game.play_count} plays`}>
              <Users className="size-3" />
              {compactNumber(game.play_count)}
            </span>
          </div>
        </div>
      </Link>

      {!comingSoon && (
        <div className="absolute right-2.5 top-2.5 z-10 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
          <FavoriteButton gameId={game.id} initial={isFavorite ?? false} />
        </div>
      )}
    </div>
  );
}
