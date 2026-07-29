import type { Metadata } from "next";
import { Store, Coins, Sparkles } from "lucide-react";
import { getShopItems, getOwnedSlugs } from "@/services/shop";
import { getSessionUser, getCurrentProfile } from "@/lib/supabase/queries";
import { ShopGrid } from "@/features/economy/shop-grid";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop",
  description: "Spend your credits on frames, themes, badges, effects and boosts. No pay-to-win.",
};

export default async function ShopPage() {
  const user = await getSessionUser();
  const profile = user ? await getCurrentProfile() : null;
  const isStaff = profile?.role === "admin" || profile?.role === "moderator";
  const [items, owned] = await Promise.all([
    getShopItems(isStaff),
    user ? getOwnedSlugs() : new Set<string>(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Store className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shop</h1>
            <p className="text-sm text-muted-foreground">Cosmetics & boosts - never pay-to-win.</p>
          </div>
        </div>
        {profile && (
          <Card className="flex items-center gap-2 border-gold/30 bg-gold/5 px-4 py-2.5">
            <Coins className="size-5 text-[oklch(0.6_0.13_85)] dark:text-gold" />
            <span className="text-lg font-bold tabular-nums">{formatNumber(profile.credits)}</span>
            <span className="text-sm text-muted-foreground">credits</span>
          </Card>
        )}
      </div>

      {!user && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <Sparkles className="size-4 text-primary" />
          <span>
            <a href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </a>{" "}
            to earn credits from playing and buy cosmetics.
          </span>
        </div>
      )}

      <ShopGrid items={items} owned={[...owned]} />
    </div>
  );
}
