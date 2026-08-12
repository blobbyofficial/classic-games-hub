import Link from "next/link";
import { Wrench, Map } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Stands in for the game player while a title is being rebuilt.
 *
 * Shows the game rather than hiding it, for the same reason `EarlyAccessLock`
 * does: someone who cannot play today still sees that the game exists, learns
 * it is being worked on rather than quietly broken, and gets a link to the plan
 * for this specific game. A game that simply vanished from the library would
 * read as a game that had been removed.
 *
 * The database refuses to record a play for a non-staff account regardless
 * (`0070`), so this is presentation, not the boundary.
 */
export function InDevelopmentLock({ title }: { title: string }) {
  return (
    <Card className="grid aspect-video place-items-center overflow-hidden p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-warning/10 text-[oklch(0.5_0.15_75)] dark:text-warning">
          <Wrench className="size-7" />
        </span>

        <Badge variant="warning" className="mb-3">
          In development
        </Badge>

        <h2 className="text-lg font-bold">{title} is being rebuilt</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Every game in the arcade is being overhauled from the ground up - how it feels to play,
          how it sounds, how it handles on a phone. {title} is locked while that work happens, and
          it opens again the moment it is finished.
        </p>

        <Button asChild variant="gradient" className="mt-5">
          <Link href="/roadmap">
            <Map className="size-4" /> See what is changing
          </Link>
        </Button>

        <p className="mt-3 text-xs text-muted-foreground">
          Your scores, your best runs and this game&apos;s leaderboards are all still here - nothing
          is being reset.
        </p>
      </div>
    </Card>
  );
}
