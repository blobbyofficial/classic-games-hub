import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ShopItem } from "@/types";

export const getShopItems = cache(async (includeStaffOnly = false): Promise<ShopItem[]> => {
  const supabase = await createClient();
  let query = supabase.from("shop_items").select("*").eq("available", true);
  if (!includeStaffOnly) query = query.eq("staff_only", false);
  const { data } = await query.order("sort_weight", { ascending: false });
  return data ?? [];
});

export const getShopItemBySlug = cache(async (slug: string): Promise<ShopItem | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("shop_items").select("*").eq("slug", slug).maybeSingle();
  return data ?? null;
});

/** A specific user's wishlist (public - for gifting discovery on their profile). */
export const getUserWishlist = cache(async (userId: string): Promise<ShopItem[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlist_items")
    .select("created_at, shop_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);
  return (data ?? []).map((r) => r.shop_items as unknown as ShopItem);
});

export const getWishlist = cache(async (): Promise<ShopItem[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("wishlist_items")
    .select("created_at, shop_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.shop_items as unknown as ShopItem);
});

export const getWishlistSlugs = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("wishlist_items")
    .select("shop_items(slug)")
    .eq("user_id", user.id);
  return (data ?? []).map((r) => (r.shop_items as unknown as { slug: string }).slug);
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

export interface LoadoutPreset {
  id: string;
  name: string;
  equipped: Record<string, string>;
  updated_at: string;
}

/**
 * The player's saved looks plus how many slots they currently have. The limit
 * comes from the database rather than being recomputed here, so the level-20
 * milestone lives in exactly one place.
 */
export const getLoadoutPresets = cache(
  async (): Promise<{ presets: LoadoutPreset[]; limit: number }> => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("my_loadout_presets");
    const payload = (data ?? {}) as { presets?: LoadoutPreset[]; limit?: number };
    return { presets: payload.presets ?? [], limit: payload.limit ?? 0 };
  },
);

export interface CollectionItem {
  slug: string;
  name: string;
  kind: string;
  rarity: string;
  owned: boolean;
}

export interface Collection {
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  season: string | null;
  reward_credits: number;
  reward_item: { slug: string; name: string; kind: string; rarity: string } | null;
  claimed: boolean;
  items: CollectionItem[];
}

/**
 * Collections with the viewer's ownership already resolved per item. Progress
 * is derived in the database rather than stored, so this is always the truth
 * even after an item expires or a purchase is refunded.
 */
export const getCollections = cache(async (): Promise<Collection[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_collections");
  return (data ?? []) as unknown as Collection[];
});

/** This month's booster-exclusive drop, and whether the viewer has it yet. */
export const getBoosterDrop = cache(async (): Promise<import("@/features/economy/booster-drop-card").BoosterDrop | null> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_booster_drop");
  return (data ?? null) as unknown as import("@/features/economy/booster-drop-card").BoosterDrop | null;
});

export interface SeasonTier {
  tier: number;
  xp_required: number;
  reward_credits: number;
  reward_item: { slug: string; name: string; kind: string; rarity: string } | null;
  claimed: boolean;
}

export interface Season {
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  starts_at: string;
  ends_at: string;
  /** Derived from play sessions inside the season window, never stored. */
  xp: number;
  tiers: SeasonTier[];
}

/** The season running right now, with the viewer's progress. Null between seasons. */
export const getSeason = cache(async (): Promise<Season | null> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_season");
  return (data ?? null) as unknown as Season | null;
});

export interface GiftToken {
  boosting: boolean;
  month: string;
  token: { used: boolean; used_at: string | null; gifted_to: string | null; item: string | null } | null;
}

/** This month's booster gift token, and whether it has been spent. */
export const getGiftToken = cache(async (): Promise<GiftToken | null> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_gift_token");
  return (data ?? null) as unknown as GiftToken | null;
});
