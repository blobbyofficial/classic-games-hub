import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { getCollections, getBoosterDrop, getSeason, getGiftToken } from "@/services/shop";
import { CollectionCard } from "@/features/economy/collection-card";
import { BoosterDropCard } from "@/features/economy/booster-drop-card";
import { SeasonTrack } from "@/features/economy/season-track";
import { GiftTokenCard } from "@/features/economy/gift-token-card";

export const metadata: Metadata = {
  title: "Collections",
  description: "The current season, collectable cosmetic sets, and this month's booster drop.",
};

export default async function CollectionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/collections");

  const [collections, boosterDrop, season, giftToken] = await Promise.all([
    getCollections(),
    getBoosterDrop(),
    getSeason(),
    getGiftToken(),
  ]);
  const done = collections.filter((c) => c.items.length > 0 && c.items.every((i) => i.owned)).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Gift className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-sm text-muted-foreground">
            {done} of {collections.length} complete. Finish a set for credits and a badge that is
            not for sale.
          </p>
        </div>
      </div>

      {season && <SeasonTrack season={season} />}

      {boosterDrop?.item && <BoosterDropCard drop={boosterDrop} />}

      {giftToken && <GiftTokenCard token={giftToken} />}

      {collections.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No collections are running right now. Check back soon.
        </p>
      ) : (
        collections.map((c) => <CollectionCard key={c.slug} collection={c} />)
      )}
    </div>
  );
}
