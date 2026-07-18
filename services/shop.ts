import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ShopItem } from "@/types";

export const getShopItems = cache(async (): Promise<ShopItem[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_items")
    .select("*")
    .eq("available", true)
    .order("sort_weight", { ascending: false });
  return data ?? [];
});

export interface OwnedItem extends ShopItem {
  acquired_at: string;
  expires_at: string | null;
}

export const getInventory = cache(async (): Promise<OwnedItem[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("inventory_items")
    .select("acquired_at, expires_at, shop_items(*)")
    .eq("user_id", user.id)
    .order("acquired_at", { ascending: false });
  return (data ?? []).map((r) => ({
    ...(r.shop_items as unknown as ShopItem),
    acquired_at: r.acquired_at,
    expires_at: r.expires_at,
  }));
});

export const getOwnedSlugs = cache(async (): Promise<Set<string>> => {
  const items = await getInventory();
  return new Set(items.filter((i) => !i.expires_at || new Date(i.expires_at) > new Date()).map((i) => i.slug));
});
