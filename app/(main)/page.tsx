import Link from "next/link";
import { Suspense } from "react";
import { Gamepad2, Sparkles, Trophy, Flame, History, Star, Users, Zap } from "lucide-react";
import { getFeaturedGames, getPublishedGames, getFavoriteGameIds, getRecentlyPlayed } from "@/services/games";
import { getDailyRewardStatus } from "@/services/economy";
import { getCurrentProfile, getFlagPayload } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { GameGrid } from "@/components/games/game-grid";
import { GameCard } from "@/components/games/game-card";
import { SectionHeader } from "@/components/section-header";
import { DailyRewardCard } from "@/features/economy/daily-reward-card";
import { CommunityEventCard } from "@/features/economy/community-event-card";
import { CategoryRail } from "@/components/games/category-rail";
import { HomeLeaderboardPreview } from "@/features/leaderboards/home-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { compactNumber } from "@/lib/utils";

// Section keys the admin can reorder/hide from Admin → Flags ("home_layout").
const DEFAULT_ORDER = ["event", "daily", "recent", "featured", "categories", "all_games"] as const;
type SectionKey = (typeof DEFAULT_ORDER)[number];

export default async function HomePage() {
  const [profile, featured, allGames, layoutFlag] = await Promise.all([
    getCurrentProfile(),
    getFeaturedGames(),
    getPublishedGames(),
    getFlagPayload("home_layout"),
  ]);
  const user = profile;
  const favorites = user ? await getFavoriteGameIds() : new Set<string>();
  const totalPlays = allGames.reduce((sum, g) => sum + g.play_count, 0);
  const displayName = profile ? profile.display_name ?? profile.username : null;

  // Admin-customisable section order (roadmap v1.4): unknown keys are ignored,
  // missing keys are appended in default order, hidden keys are dropped.
  const cfg = (layoutFlag?.enabled ? layoutFlag.payload : null) as
    | { order?: string[]; hidden?: string[] }
    | null;
  const hidden = new Set(cfg?.hidden ?? []);
  const configured = (cfg?.order ?? []).filter((k): k is SectionKey =>
    (DEFAULT_ORDER as readonly string[]).includes(k),
  );
  const order = [...configured, ...DEFAULT_ORDER.filter((k) => !configured.includes(k))].filter(
    (k) => !hidden.has(k),
  );

  const sections: Record<SectionKey, React.ReactNode> = {
    event: (
      <Suspense key="event" fallback={null}>
        <CommunityEventCard />
      </Suspense>
    ),
    daily: user ? (
      <Suspense key="daily">
        <DailyRewardSlot />
      </Suspense>
    ) : null,
    recent: user ? (
      <Suspense key="recent" fallback={null}>
        <RecentlyPlayed favorites={favorites} />
      </Suspense>
    ) : null,
    featured: (
      <section key="featured">
        <SectionHeader
          title="Featured games"
          subtitle="Hand-picked classics to jump into"
          icon={Sparkles}
          href="/games"
        />
        <GameGrid games={featured} favorites={favorites} priorityCount={5} />
      </section>
    ),
    categories: <CategoryRail key="categories" />,
    all_games: (
      <section key="all_games" className="grid gap-6 defer-paint lg:grid-cols-[1fr_360px]">
        <div>
          <SectionHeader title="All games" subtitle={`${allGames.length} classics and counting`} icon={Gamepad2} href="/games" />
          <GameGrid games={allGames.slice(0, 10)} favorites={favorites} />
        </div>
        <div className="space-y-4">
          <SectionHeader title="Top players" icon={Trophy} href="/leaderboards" className="mb-3" />
          <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
            <HomeLeaderboardPreview />
          </Suspense>
        </div>
      </section>
    ),
  };

  return (
    <div className="space-y-10 sm:space-y-14">
      <Hero
        gameCount={allGames.length}
        totalPlays={totalPlays}
        isAuthed={Boolean(user)}
        displayName={displayName}
      />
      {order.map((key) => sections[key])}
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
    /* The ambient glow is painted as a background gradient rather than two
       blurred divs — same look, no filter for the compositor to maintain, which
       is what kept this section janky while scrolling on low-end phones. */
    <section className="relative overflow-hidden rounded-3xl border border-border bg-aurora px-6 py-12 shadow-sm sm:px-10 sm:py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="relative max-w-2xl motion-safe:animate-rise">
        <Badge variant="neon" className="mb-5">
          <Zap /> Rebuilt for 2026
        </Badge>
        <h1 className="text-display font-black">
          {displayName ? (
            <>
              Welcome back,
              <br />
              <span className="text-gradient">{displayName}</span>
            </>
          ) : (
            <>
              Your arcade,
              <br />
              <span className="text-gradient">reimagined.</span>
            </>
          )}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Play {gameCount} timeless games, earn credits and XP, unlock achievements, climb the
          leaderboards and hang out with friends. No pay-to-win — just the classics, done right.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
        <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Stat icon={Gamepad2} label="Games" value={gameCount.toString()} />
          <Stat icon={Users} label="Plays" value={compactNumber(totalPlays)} />
          <Stat icon={Star} label="Free forever" value="100%" />
        </dl>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-primary" />
      <dd className="font-bold tnum">{value}</dd>
      <dt className="text-muted-foreground">{label}</dt>
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
