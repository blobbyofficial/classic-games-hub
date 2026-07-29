import Link from "next/link";
import { Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { PlayerName } from "@/components/profile/player-name";
import { compactNumber } from "@/lib/utils";

export async function HomeLeaderboardPreview() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("global_leaderboard", { p_limit: 6 });
  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <Card className="grid h-72 place-items-center p-6 text-center text-sm text-muted-foreground">
        Be the first to top the charts - start playing!
      </Card>
    );
  }

  const medal = ["text-gold", "text-slate-300", "text-amber-600"];

  return (
    <Card className="divide-y divide-border/60 overflow-hidden">
      {rows.map((r, i) => (
        <Link
          key={r.user_id}
          href={`/u/${r.username}`}
          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50"
        >
          <span className={`w-5 text-center text-sm font-bold tabular-nums ${medal[i] ?? "text-muted-foreground"}`}>
            {i < 3 ? <Crown className="mx-auto size-4 fill-current" /> : r.rank}
          </span>
          <UserAvatar
            src={r.avatar_url}
            name={r.display_name ?? r.username}
            frame={r.equipped?.avatar_frame}
            className="size-8"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              <PlayerName name={r.display_name ?? r.username} equipped={r.equipped} />
            </p>
            <p className="truncate text-xs text-muted-foreground">Level {r.level}</p>
          </div>
          <span className="text-xs font-semibold text-primary">{compactNumber(r.xp)} XP</span>
        </Link>
      ))}
    </Card>
  );
}
