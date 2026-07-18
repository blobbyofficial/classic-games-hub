import Link from "next/link";
import { Users, Gamepad2, Coins, Flag, TrendingUp, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, timeAgo } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: users },
    { count: openReports },
    { data: games },
    { data: recentSessions },
    { data: topGames },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("games").select("play_count"),
    supabase
      .from("play_sessions")
      .select("created_at, score, games(title, slug), profiles(username)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("games").select("title, slug, play_count").order("play_count", { ascending: false }).limit(5),
  ]);

  const totalPlays = (games ?? []).reduce((s, g) => s + g.play_count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Users} label="Players" value={formatNumber(users ?? 0)} />
        <StatTile icon={Gamepad2} label="Total plays" value={formatNumber(totalPlays)} accent="text-sky-400" />
        <StatTile icon={Gamepad2} label="Games" value={games?.length ?? 0} accent="text-emerald-400" />
        <StatTile icon={Flag} label="Open reports" value={openReports ?? 0} accent="text-destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentSessions ?? []).map((s, i) => {
              const g = s.games as unknown as { title: string; slug: string } | null;
              const p = s.profiles as unknown as { username: string } | null;
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{p?.username ?? "player"}</span>
                    <span className="text-muted-foreground"> played </span>
                    <span className="font-medium">{g?.title ?? "a game"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(s.created_at)}</span>
                </div>
              );
            })}
            {(recentSessions ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No plays yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-gold" /> Most played
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(topGames ?? []).map((g, i) => (
              <Link
                key={g.slug}
                href={`/games/${g.slug}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent/50"
              >
                <span className="flex items-center gap-2">
                  <span className="w-4 text-center font-bold text-muted-foreground">{i + 1}</span>
                  {g.title}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Coins className="size-3" /> {formatNumber(g.play_count)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
