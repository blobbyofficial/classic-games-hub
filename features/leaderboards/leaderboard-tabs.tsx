import { Suspense } from "react";
import { GameLeaderboard } from "./game-leaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * A board per difficulty, on one card.
 *
 * All three render on the server rather than fetching on tab change: the whole
 * point of separate boards is comparing your standing across them, and a
 * spinner between each one makes that a chore. Three ranked queries against an
 * index that now leads with difficulty is cheap.
 *
 * Each board is its own Suspense boundary so a slow one cannot hold up the
 * other two.
 */
export function LeaderboardTabs({ slug, currentUserId }: { slug: string; currentUserId?: string }) {
  return (
    <Tabs defaultValue="regular">
      <TabsList className="mb-3 w-full">
        <TabsTrigger value="easy" className="flex-1">
          Easy
        </TabsTrigger>
        <TabsTrigger value="regular" className="flex-1">
          Regular
        </TabsTrigger>
        <TabsTrigger value="hard" className="flex-1">
          Hard
        </TabsTrigger>
      </TabsList>
      {(["easy", "regular", "hard"] as const).map((d) => (
        <TabsContent key={d} value={d}>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <GameLeaderboard slug={slug} currentUserId={currentUserId} difficulty={d} />
          </Suspense>
        </TabsContent>
      ))}
    </Tabs>
  );
}
