"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Gift, Lock } from "lucide-react";
import { toast } from "sonner";
import { claimCollection } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DeferredSpinner } from "@/components/ui/deferred";
import { cn, formatNumber, RARITY_META } from "@/lib/utils";
import type { Collection } from "@/services/shop";

/**
 * One collection: what is in it, how far along you are, and the reward for
 * finishing. The claim button only decides what to *show* - claim_collection()
 * re-counts ownership itself, so a stale page cannot claim an unfinished set.
 */
export function CollectionCard({ collection }: { collection: Collection }) {
  const [claimed, setClaimed] = useState(collection.claimed);
  const [pending, start] = useTransition();
  const setCredits = useSessionStore((s) => s.setCredits);

  const owned = collection.items.filter((i) => i.owned).length;
  const total = collection.items.length;
  const complete = total > 0 && owned === total;
  const percent = total ? (owned / total) * 100 : 0;

  const claim = () => {
    start(async () => {
      const res = await claimCollection(collection.slug);
      if (!res.ok) return void toast.error(res.error ?? "Could not claim this collection");
      setClaimed(true);
      if (typeof res.balance === "number") setCredits(res.balance);
      toast.success(`"${collection.name}" complete! +${formatNumber(collection.reward_credits)} credits`);
    });
  };

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-4 sm:p-5",
        claimed ? "border-success/40" : complete ? "border-primary/50" : "border-border",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <DynamicIcon name={collection.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{collection.name}</h2>
          {collection.description && (
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          )}
        </div>
        <Badge variant={complete ? "default" : "secondary"} className="tabular-nums">
          {owned}/{total}
        </Badge>
      </div>

      <Progress value={percent} className="mb-4 h-2" />

      <ul className="mb-4 flex flex-wrap gap-2">
        {collection.items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/shop/${item.slug}`}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                item.owned
                  ? "border-success/40 bg-success/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent/50",
              )}
            >
              {item.owned ? <Check className="size-3 text-success" /> : <Lock className="size-3" />}
              <span className={cn(RARITY_META[item.rarity]?.color)}>{item.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-muted-foreground">
          Reward: <b className="text-foreground">{formatNumber(collection.reward_credits)} credits</b>
          {collection.reward_item && (
            <>
              {" "}
              and the <b className="text-foreground">{collection.reward_item.name}</b> badge, which
              cannot be bought.
            </>
          )}
        </p>
        {claimed ? (
          <Badge variant="secondary" className="border-success/40 text-success">
            <Check className="size-3" /> Claimed
          </Badge>
        ) : (
          <Button variant="gradient" disabled={!complete || pending} onClick={claim}>
            {pending ? <DeferredSpinner /> : <Gift className="size-4" />}
            {complete ? "Claim reward" : `${total - owned} to go`}
          </Button>
        )}
      </div>
    </section>
  );
}
