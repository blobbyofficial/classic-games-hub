import Link from "next/link";
import { Heart, Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, RARITY_META } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export interface BoosterDrop {
  boosting: boolean;
  month: string;
  item: {
    slug: string;
    name: string;
    description: string | null;
    kind: string;
    rarity: string;
    owned: boolean;
  } | null;
}

const MONTH_LABEL = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric" });
};

/**
 * This month's booster-exclusive cosmetic. Shown to everyone, not just
 * boosters: the whole point of a monthly exclusive is that people can see what
 * they are missing while there is still time to get it.
 */
export function BoosterDropCard({ drop }: { drop: BoosterDrop }) {
  if (!drop.item) return null;
  const { item } = drop;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f47fff]/10 text-[#f47fff]">
          <Heart className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold">
            {item.name}
            <Badge variant="secondary" className={cn(RARITY_META[item.rarity]?.color)}>
              {RARITY_META[item.rarity]?.label ?? item.rarity}
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            {MONTH_LABEL(drop.month)} booster drop. {item.description}
          </p>
        </div>
        {item.owned ? (
          <Badge variant="secondary" className="border-success/40 text-success">
            <Check className="size-3" /> Yours
          </Badge>
        ) : drop.boosting ? (
          <Badge variant="secondary">
            <Clock className="size-3" /> Arriving shortly
          </Badge>
        ) : (
          <Button asChild variant="secondary">
            <Link href={SITE.discord}>Boost to claim</Link>
          </Button>
        )}
      </div>
      {!item.owned && (
        <p className="mt-3 text-xs text-muted-foreground">
          Boost at any point this month to receive it. Once {MONTH_LABEL(drop.month)} is over it
          cannot be earned again.
        </p>
      )}
    </section>
  );
}
