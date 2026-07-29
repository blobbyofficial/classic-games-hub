import Link from "next/link";
import { Crown, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/utils";

export async function GameLeaderboard({ slug, currentUserId }: { slug: string; currentUserId?: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("game_leaderboard", { p_slug: slug, p_limit: 20 });
  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border py-10 text-center">
        <Trophy className="size-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No scores yet - be the first!</p>
      </div>
    );
  }

  const medal = ["text-gold", "text-slate-300", "text-amber-600"];

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border">
      {rows.map((r, i) => {
        const me = r.user_id === currentUserId;
        return (
          <li
            key={r.user_id}
            className={`flex items-center gap-3 px-3 py-2.5 ${me ? "bg-primary/5" : ""}`}
          >
            <span className={`w-6 text-center text-sm font-bold tabular-nums ${medal[i] ?? "text-muted-foreground"}`}>
              {i < 3 ? <Crown className="mx-auto size-4 fill-current" /> : r.rank}
            </span>
            <Link href={`/u/${r.username}`} className="flex min-w-0 flex-1 items-center gap-2.5 hover:underline">
              <UserAvatar src={r.avatar_url} name={r.display_name ?? r.username} className="size-8" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {r.display_name ?? r.username}
                  {me && <span className="ml-1 text-xs text-primary">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">Lvl {r.level}</p>
              </div>
            </Link>
            <span className="text-sm font-bold tabular-nums text-gold">{formatNumber(r.best_score)}</span>
          </li>
        );
      })}
    </ul>
  );
}
