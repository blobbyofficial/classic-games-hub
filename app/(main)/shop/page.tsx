import type { Metadata } from "next";
import Link from "next/link";
import { Store, Coins, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        icon={Store}
        title="Shop"
        description="Cosmetics and boosts - never pay-to-win."
        className="mb-0"
        actions={
          profile && (
            <Card className="flex items-center gap-2 border-gold/30 bg-gold/5 px-4 py-2.5">
              <Coins className="size-5 text-[oklch(0.52_0.13_85)] dark:text-gold" />
              <span className="text-lg font-bold tnum">{formatNumber(profile.credits)}</span>
              <span className="text-sm text-muted-foreground">credits</span>
            </Card>
          )
        }
      />

      {!user && (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span>
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>{" "}
            to earn credits from playing and buy cosmetics.
          </span>
        </div>
      )}

      <ShopGrid items={items} owned={[...owned]} />
    </div>
  );
}
