import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Crown } from "lucide-react";
import { getPublishedGames } from "@/services/games";
import { getSessionUser } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardTabs } from "@/features/leaderboards/leaderboard-tabs";
import { GamePicker } from "@/features/leaderboards/game-picker";
import { PlayerName } from "@/components/profile/player-name";
import { UserAvatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, compactNumber } from "@/lib/utils";

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
  const PODIUM = {
    1: {
      avatar: "size-20",
      ring: "ring-gold",
      badge: "bg-gold",
      pedestal: "from-gold/70 to-gold/30",
      height: "h-24",
    },
    2: {
      avatar: "size-14",
      ring: "ring-slate-300",
      badge: "bg-slate-400",
      pedestal: "from-slate-300/70 to-slate-300/25",
      height: "h-16",
    },
    3: {
      avatar: "size-14",
      ring: "ring-amber-600",
      badge: "bg-amber-600",
      pedestal: "from-amber-600/70 to-amber-600/25",
      height: "h-12",
    },
  } as const;

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
            <div className="mb-6 grid grid-cols-3 items-end gap-2 sm:gap-4">
              {[rows[1], rows[0], rows[2]].map((r) => {
                const style = PODIUM[r.rank as 1 | 2 | 3];
                return (
                  <Link key={r.user_id} href={`/u/${r.username}`} className="group flex flex-col items-center">
                    <div className="relative mb-2">
                      {r.rank === 1 && (
                        <Crown className="absolute -top-5 left-1/2 size-6 -translate-x-1/2 text-gold drop-shadow motion-safe:animate-glow-pulse" />
                      )}
                      <UserAvatar
                        src={r.avatar_url}
                        name={r.display_name ?? r.username}
                        frame={r.equipped?.avatar_frame}
                        decoration={r.equipped?.decoration}
                        className={cn(
                          "border-2 border-card ring-2 transition-transform group-hover:scale-105",
                          style.ring,
                          style.avatar,
                        )}
                      />
                      <span
                        className={cn(
                          "absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full text-xs font-black text-white ring-2 ring-card",
                          style.badge,
                        )}
                      >
                        {r.rank}
                      </span>
                    </div>
                    <p className="max-w-full truncate px-1 text-center text-sm font-semibold">
                      <PlayerName name={r.display_name ?? r.username} equipped={r.equipped} />
                    </p>
                    <p className="text-[11px] text-muted-foreground">Lvl {r.level}</p>
                    <p className="text-sm font-bold text-primary">{compactNumber(r.xp)} XP</p>
                    <div
                      className={cn(
                        "mt-2 grid w-full place-items-center rounded-t-xl bg-gradient-to-b text-2xl font-black text-white/90 shadow-inner",
                        style.pedestal,
                        style.height,
                      )}
                    >
                      {r.rank}
                    </div>
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
                        <UserAvatar src={r.avatar_url} name={r.display_name ?? r.username} frame={r.equipped?.avatar_frame} decoration={r.equipped?.decoration} className="size-8" />
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
              {selected && <LeaderboardTabs slug={selected} currentUserId={user?.id} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
