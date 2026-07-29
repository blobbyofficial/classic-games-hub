import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShopItemBySlug, getOwnedSlugs, getWishlistSlugs } from "@/services/shop";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { ShopItemDetail } from "@/features/economy/shop-item-detail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getShopItemBySlug(slug);
  if (!item) return { title: "Item not found" };
  return { title: `${item.name} - Shop`, description: item.description ?? undefined };
}

export default async function ShopItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Each of these resolves to an empty/null value when signed out and they all
  // share the cached session, so one batch replaces four sequential trips.
  const [item, profile, ownedSet, wishlist] = await Promise.all([
    getShopItemBySlug(slug),
    getCurrentProfile(),
    getOwnedSlugs(),
    getWishlistSlugs(),
  ]);
  if (!item || !item.available) notFound();

  // Staff-only items are only viewable by staff.
  const isStaff = profile?.role === "admin" || profile?.role === "moderator";
  if (item.staff_only && !isStaff) notFound();

  return (
    <div className="py-2">
      <ShopItemDetail item={item} owned={ownedSet.has(item.slug)} wishlisted={wishlist.includes(item.slug)} />
    </div>
  );
}
