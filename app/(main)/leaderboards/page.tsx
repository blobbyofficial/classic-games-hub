import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Crown } from "lucide-react";
import { getPublishedGames } from "@/services/games";
import { getSessionUser } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { GameLeaderboard } from "@/features/leaderboards/game-leaderboard";
import { GamePicker } from "@/features/leaderboards/game-picker";
import { PlayerName } from "@/components/profile/player-name";
import { UserAvatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compactNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Leaderboards",
  description: "See the top players globally and per game.",
};

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const [user, games] = await Promise.all([getSessionUser(), getPublishedGames()]);
  const supabase = await createClient();
  const { data: global } = await supabase.rpc("global_leaderboard", { p_limit: 50 });
  const rows = global ?? [];
  const selected = gameSlug && games.some((g) => g.slug === gameSlug) ? gameSlug : games[0]?.slug;
  const medal = ["text-gold", "text-slate-300", "text-amber-600"];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-gold/15 text-[oklch(0.6_0.13_85)] dark:text-gold">
          <Trophy className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboards</h1>
          <p className="text-sm text-muted-foreground">The best of the best.</p>
        </div>
      </div>

      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global">Global (Level)</TabsTrigger>
          <TabsTrigger value="games">Per game</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          {rows.length >= 3 && (
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[rows[1], rows[0], rows[2]].map((r, idx) => {
                const rank = r.rank;
                const tall = rank === 1;
                return (
                  <Link
                    key={r.user_id}
                    href={`/u/${r.username}`}
                    className={`flex flex-col items-center rounded-2xl border border-border bg-card p-4 ${tall ? "-mt-2 border-gold/40" : "mt-2"}`}
                  >
                    <div className="relative">
                      <UserAvatar
                        src={r.avatar_url}
                        name={r.display_name ?? r.username}
                        frame={r.equipped?.avatar_frame}
                        className={tall ? "size-16" : "size-12"}
                      />
                      <Crown className={`absolute -top-3 left-1/2 size-5 -translate-x-1/2 ${medal[rank - 1]}`} />
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">
                      <PlayerName name={r.display_name ?? r.username} equipped={r.equipped} />
                    </p>
                    <p className="text-xs text-muted-foreground">Lvl {r.level}</p>
                    <p className="mt-1 text-sm font-bold text-primary">{compactNumber(r.xp)} XP</p>
                  </Link>
                );
              })}
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border/60">
                {rows.map((r) => {
                  const me = r.user_id === user?.id;
                  return (
                    <li key={r.user_id} className={`flex items-center gap-3 px-4 py-2.5 ${me ? "bg-primary/5" : ""}`}>
                      <span className={`w-6 text-center text-sm font-bold tabular-nums ${medal[r.rank - 1] ?? "text-muted-foreground"}`}>
                        {r.rank}
                      </span>
                      <Link href={`/u/${r.username}`} className="flex min-w-0 flex-1 items-center gap-2.5 hover:underline">
                        <UserAvatar src={r.avatar_url} name={r.display_name ?? r.username} frame={r.equipped?.avatar_frame} className="size-8" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            <PlayerName name={r.display_name ?? r.username} equipped={r.equipped} />
                            {me && <span className="ml-1 text-xs text-primary">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">Level {r.level}</p>
                        </div>
                      </Link>
                      <span className="text-sm font-bold tabular-nums text-primary">{compactNumber(r.xp)} XP</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Choose a game</CardTitle>
              <div className="max-w-xs">
                <GamePicker games={games.map((g) => ({ slug: g.slug, title: g.title }))} selected={selected} />
              </div>
            </CardHeader>
            <CardContent>
              {selected && <GameLeaderboard slug={selected} currentUserId={user?.id} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
