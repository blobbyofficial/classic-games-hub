import { PartyPopper, Users, Coins, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";

export interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  target: number;
  progress: number;
  credits_reward: number;
  ends_at: string;
  completed_at: string | null;
  participants: number;
  my_contributions: number;
}

/**
 * Community mega-event banner (roadmap v1.3): a server-wide co-op goal with a
 * live progress bar. Every scored play counts; everyone who took part gets
 * the reward when the goal lands.
 */
export async function CommunityEventCard() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_community_event");
  if (!data) return null;
  const event = data as unknown as CommunityEvent;

  const pct = Math.min(100, Math.round((event.progress / event.target) * 100));
  const done = Boolean(event.completed_at) || event.progress >= event.target;
  const hoursLeft = Math.max(0, Math.round((new Date(event.ends_at).getTime() - Date.now()) / 3600_000));

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-neon/10 p-5"
      aria-label="Community event"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <PartyPopper className="size-4" /> Community event
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight">{event.title}</h2>
          {event.description && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{event.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {formatNumber(event.participants)} playing
          </span>
          <span className="inline-flex items-center gap-1">
            <Coins className="size-3.5 text-gold" /> {formatNumber(event.credits_reward)} credits each
          </span>
          {!done && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {hoursLeft}h left
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div
          className="h-3 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={event.progress}
          aria-valuemin={0}
          aria-valuemax={event.target}
          aria-label={`${formatNumber(event.progress)} of ${formatNumber(event.target)} plays`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-neon transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium">
            {done
              ? "🎊 Goal reached — rewards delivered to everyone who played!"
              : `${formatNumber(event.progress)} / ${formatNumber(event.target)} plays — every game counts`}
          </span>
          {event.my_contributions > 0 && (
            <span className="text-muted-foreground">You&rsquo;ve added {formatNumber(event.my_contributions)}</span>
          )}
        </div>
      </div>
    </section>
  );
}
