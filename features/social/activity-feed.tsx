import Link from "next/link";
import { Trophy, Award, ShoppingBag, UserPlus, Activity } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { PlayerName } from "@/components/profile/player-name";
import { cn, timeAgo, formatNumber, RARITY_META } from "@/lib/utils";
import type { ActivityEvent } from "@/services/social";

/**
 * A quiet feed of what your friends have been doing.
 *
 * Deliberately a server component: it is read-only, it renders once, and
 * nothing on it is interactive, so there is no reason for any of it to reach
 * the browser as JavaScript.
 *
 * An unrecognised event type renders nothing rather than a broken row. Events
 * are written by a dozen different RPCs and more types will be added over
 * time; a feed that showed "undefined did undefined" for anything it had not
 * been taught about would be worse than one that quietly skips it.
 */

const ICONS: Record<string, typeof Trophy> = {
  high_score: Trophy,
  achievement_unlocked: Award,
  item_purchased: ShoppingBag,
  friend_added: UserPlus,
};

const TONES: Record<string, string> = {
  high_score: "bg-gold/15 text-[oklch(0.6_0.13_85)] dark:text-gold",
  achievement_unlocked: "bg-primary/10 text-primary",
  item_purchased: "bg-neon/15 text-neon",
  friend_added: "bg-success/15 text-success",
};

function describe(event: ActivityEvent): React.ReactNode | null {
  const d = event.data as Record<string, string | number | undefined>;
  switch (event.type) {
    case "high_score":
      return (
        <>
          scored <b>{formatNumber(Number(d.score ?? 0))}</b> on{" "}
          <Link href={`/games/${d.game}`} className="font-medium hover:underline">
            {d.title ?? d.game}
          </Link>
        </>
      );
    case "achievement_unlocked":
      return (
        <>
          unlocked <b>{d.name}</b>
        </>
      );
    case "item_purchased":
      return (
        <>
          bought{" "}
          <Link href={`/shop/${d.slug}`} className="font-medium hover:underline">
            <span className={cn(RARITY_META[String(d.rarity)]?.color)}>{d.name}</span>
          </Link>
        </>
      );
    case "friend_added":
      return <>made a new friend</>;
    default:
      return null;
  }
}

function Row({ event }: { event: ActivityEvent }) {
  const body = describe(event);
  if (!body) return null;

  const Icon = ICONS[event.type] ?? Activity;
  const name = event.actor.display_name ?? event.actor.username;

  return (
    <li className="flex items-start gap-3 py-3">
      <Link href={`/u/${event.actor.username}`} className="shrink-0">
        <UserAvatar
          src={event.actor.avatar_url}
          name={name}
          frame={event.actor.equipped?.avatar_frame}
          decoration={event.actor.equipped?.decoration}
          className="size-9"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <Link href={`/u/${event.actor.username}`} className="hover:underline">
            <PlayerName name={name} equipped={event.actor.equipped} />
          </Link>{" "}
          <span className="text-muted-foreground">{body}</span>
        </p>
        <p className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</p>
      </div>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          TONES[event.type] ?? "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
    </li>
  );
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const rows = events.filter((e) => describe(e) !== null);

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nothing from your friends yet. Once they play a game or unlock something, it will show up
        here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-card px-4 sm:px-5">
      {rows.map((event) => (
        <Row key={event.id} event={event} />
      ))}
    </ul>
  );
}
