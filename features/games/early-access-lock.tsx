import Link from "next/link";
import { Lock, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/constants";

/**
 * Stands in for the game player while a title is in booster early access.
 *
 * Shows the game rather than hiding it: the countdown is the pitch. Someone who
 * cannot play today still learns the game exists, that boosting would let them
 * in now, and exactly how long until it opens anyway - which is a far better
 * prompt than a game that simply is not there.
 *
 * The database refuses to record a play for a non-booster regardless (`0056`),
 * so this is presentation, not the boundary.
 */
export function EarlyAccessLock({ until, title }: { until: string; title: string }) {
  const opens = new Date(until);
  const days = Math.max(0, Math.ceil((opens.getTime() - Date.now()) / 86_400_000));

  return (
    <Card className="grid aspect-video place-items-center overflow-hidden p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#f47fff]/10 text-[#f47fff]">
          <Lock className="size-7" />
        </span>

        <Badge className="mb-3 border-none bg-[#f47fff]/15 text-[#f47fff]">Early access</Badge>

        <h2 className="text-lg font-bold">{title} is out early for boosters</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Boost the Discord server to play it now, or wait{" "}
          <b className="text-foreground">
            {days} {days === 1 ? "day" : "days"}
          </b>{" "}
          until it opens to everyone on{" "}
          {opens.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.
        </p>

        <Button asChild variant="gradient" className="mt-5">
          <Link href={SITE.discord}>
            <Heart className="size-4" /> Boost the server
          </Link>
        </Button>

        <p className="mt-3 text-xs text-muted-foreground">
          Boosting also gets you a monthly exclusive cosmetic, a gift token for a friend, bigger
          daily rewards and premium themes.
        </p>
      </div>
    </Card>
  );
}
