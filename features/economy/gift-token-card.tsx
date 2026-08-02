import Link from "next/link";
import { Ticket, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";
import type { GiftToken } from "@/services/shop";

/**
 * The monthly booster gift token. Shown to non-boosters too, for the same
 * reason the monthly drop is: a perk nobody can see is a perk nobody wants.
 */
export function GiftTokenCard({ token }: { token: GiftToken }) {
  const spent = Boolean(token.token?.used);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f47fff]/10 text-[#f47fff]">
          <Ticket className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Monthly gift token</h2>
          <p className="text-sm text-muted-foreground">
            {spent ? (
              <>
                Spent this month on <b>{token.token?.item}</b>
                {token.token?.gifted_to ? (
                  <>
                    {" "}
                    for <b>@{token.token.gifted_to}</b>
                  </>
                ) : null}
                . A new one arrives next month.
              </>
            ) : token.token ? (
              "Give any friend a cosmetic for 30 days, free. Spend it from the gift button on any shop item."
            ) : (
              "Boosters get one token a month to give a friend a cosmetic for 30 days, free."
            )}
          </p>
        </div>
        {spent ? (
          <Badge variant="secondary" className="border-success/40 text-success">
            <Check className="size-3" /> Used
          </Badge>
        ) : token.token ? (
          <Button asChild variant="secondary">
            <Link href="/shop">Pick a gift</Link>
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={SITE.discord}>Boost to claim</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
