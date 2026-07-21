import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { getInventory, getWishlist } from "@/services/shop";
import { InventoryGrid } from "@/features/economy/inventory-grid";
import { WishlistSection } from "@/features/economy/wishlist-section";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/inventory");
  const [items, wishlist] = await Promise.all([getInventory(), getWishlist()]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Package className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Equip your cosmetics and track active boosts.</p>
        </div>
      </div>
      <InventoryGrid items={items} />
      <WishlistSection items={wishlist} />
    </div>
  );
}
