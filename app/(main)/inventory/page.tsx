import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getSessionUser, getCurrentProfile } from "@/lib/supabase/queries";
import { getInventory, getWishlist, getLoadoutPresets } from "@/services/shop";
import { createClient } from "@/lib/supabase/server";
import { InventoryGrid } from "@/features/economy/inventory-grid";
import { WishlistSection } from "@/features/economy/wishlist-section";
import { LoadoutPresets } from "@/features/economy/loadout-presets";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/inventory");
  const supabase = await createClient();
  const [items, wishlist, { data: boostData }, presets, profile] = await Promise.all([
    getInventory(),
    getWishlist(),
    supabase.rpc("my_boosts"),
    getLoadoutPresets(),
    getCurrentProfile(),
  ]);
  const boostState = (Array.isArray(boostData) ? boostData : []) as unknown as import("@/features/economy/inventory-grid").BoostState[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        icon={Package}
        title="Inventory"
        description="Equip your cosmetics and track active boosts."
        className="mb-0"
      />
      <InventoryGrid items={items} boostState={boostState} />
      <LoadoutPresets
        presets={presets.presets}
        limit={presets.limit}
        level={profile?.level ?? 1}
      />
      <WishlistSection items={wishlist} />
    </div>
  );
}
