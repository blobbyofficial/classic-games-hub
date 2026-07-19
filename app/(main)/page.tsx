import Link from "next/link";
import { Suspense } from "react";
import { Gamepad2, Sparkles, Trophy, Flame, History, Star, Users, Zap } from "lucide-react";
import { getFeaturedGames, getPublishedGames, getFavoriteGameIds, getRecentlyPlayed } from "@/services/games";
import { getDailyRewardStatus } from "@/services/economy";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { GameGrid } from "@/components/games/game-grid";
import { GameCard } from "@/components/games/game-card";
import { SectionHeader } from "@/components/section-header";
import { DailyRewardCard } from "@/features/economy/daily-reward-card";
import { CategoryRail } from "@/components/games/category-rail";
import { HomeLeaderboardPreview } from "@/features/leaderboards/home-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { compactNumber } from "@/lib/utils";

export default async function HomePage() {
  const [profile, featured, allGames] = await Promise.all([
    getCurrentProfile(),
    getFeaturedGames(),
    getPublishedGames(),
  ]);
  const user = profile;
  const favorites = user ? await getFavoriteGameIds() : new Set<string>();
  const totalPlays = allGames.reduce((sum, g) => sum + g.play_count, 0);
  const displayName = profile ? profile.display_name ?? profile.username : null;

  return (
    <div className="space-y-12">
      <Hero
        gameCount={allGames.length}
        totalPlays={totalPlays}
        isAuthed={Boolean(user)}
        displayName={displayName}
      />

      {user && (
        <Suspense>
          <DailyRewardSlot />
        </Suspense>
      )}

      {user && (
        <Suspense fallback={null}>
          <RecentlyPlayed favorites={favorites} />
        </Suspense>
      )}

      <section>
        <SectionHeader
          title="Featured games"
          subtitle="Hand-picked classics to jump into"
          icon={Sparkles}
          href="/games"
        />
        <GameGrid games={featured} favorites={favorites} priorityCount={5} />
      </section>

      <CategoryRail />

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <SectionHeader title="All games" subtitle={`${allGames.length} classics and counting`} icon={Gamepad2} href="/games" />
          <GameGrid games={allGames.slice(0, 10)} favorites={favorites} />
        </div>
        <div className="space-y-4">
          <SectionHeader title="Top players" icon={Trophy} href="/leaderboards" className="mb-3" />
          <Suspense fallback={<div className="h-80 rounded-2xl bg-muted/40" />}>
            <HomeLeaderboardPreview />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

function Hero({
  gameCount,
  totalPlays,
  isAuthed,
  displayName,
}: {
  gameCount: number;
  totalPlays: number;
  isAuthed: boolean;
  displayName?: string | null;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-grid px-6 py-12 sm:px-10 sm:py-16">
      <div className="pointer-events-none absolute -left-20 top-0 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 size-72 rounded-full bg-[oklch(0.7_0.18_330)]/20 blur-3xl" />
      <div className="relative max-w-2xl">
        <Badge variant="neon" className="mb-4">
          <Zap className="size-3" /> Rebuilt for 2026
        </Badge>
        {displayName ? (
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Welcome back,
            <br />
            <span className="text-gradient">{displayName}</span>
          </h1>
        ) : (
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Your arcade,
            <br />
            <span className="text-gradient">reimagined.</span>
          </h1>
        )}
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Play {gameCount} timeless games, earn credits and XP, unlock achievements, climb the
          leaderboards and hang out with friends. No pay-to-win — just the classics, done right.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg" variant="gradient" asChild>
            <Link href="/games">
              <Gamepad2 /> Browse games
            </Link>
          </Button>
          {!isAuthed && (
            <Button size="lg" variant="glass" asChild>
              <Link href="/register">Create free account</Link>
            </Button>
          )}
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Stat icon={Gamepad2} label="Games" value={gameCount.toString()} />
          <Stat icon={Users} label="Plays" value={compactNumber(totalPlays)} />
          <Stat icon={Star} label="Free forever" value="100%" />
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-primary" />
      <span className="font-bold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

async function DailyRewardSlot() {
  const { claimed, streak } = await getDailyRewardStatus();
  return <DailyRewardCard alreadyClaimed={claimed} streak={streak} />;
}

async function RecentlyPlayed({ favorites }: { favorites: Set<string> }) {
  const recent = await getRecentlyPlayed(5);
  if (recent.length === 0) return null;
  return (
    <section>
      <SectionHeader title="Continue playing" icon={History} href="/games" hrefLabel="Library" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {recent.map((g) => (
          <GameCard key={g.id} game={g} isFavorite={favorites.has(g.id)} />
        ))}
      </div>
    </section>
  );
}
