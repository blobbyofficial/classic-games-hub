import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShopItemBySlug, getOwnedSlugs } from "@/services/shop";
import { getSessionUser, getCurrentProfile } from "@/lib/supabase/queries";
import { ShopItemDetail } from "@/features/economy/shop-item-detail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getShopItemBySlug(slug);
  if (!item) return { title: "Item not found" };
  return { title: `${item.name} — Shop`, description: item.description ?? undefined };
}

export default async function ShopItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getShopItemBySlug(slug);
  if (!item || !item.available) notFound();

  // Staff-only items are only viewable by staff.
  const user = await getSessionUser();
  const profile = user ? await getCurrentProfile() : null;
  const isStaff = profile?.role === "admin" || profile?.role === "moderator";
  if (item.staff_only && !isStaff) notFound();

  const owned = user ? (await getOwnedSlugs()).has(item.slug) : false;

  return (
    <div className="py-2">
      <ShopItemDetail item={item} owned={owned} />
    </div>
  );
}
