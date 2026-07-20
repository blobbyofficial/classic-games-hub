"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RpcResult } from "@/types";

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function claimDailyReward(): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("claim_daily_reward");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return data as RpcResult;
}

export async function purchaseItem(slug: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("purchase_shop_item", { p_slug: slug });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/shop");
  revalidatePath("/inventory");
  revalidatePath("/", "layout");
  return data as RpcResult;
}

export async function equipItem(slug: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("equip_item", { p_slug: slug });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  revalidatePath("/", "layout");
  return data as RpcResult;
}

export async function unequipItem(kind: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { error } = await supabase.rpc("unequip_item", { p_kind: kind });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function claimChallenge(challengeId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("claim_challenge", { p_challenge: challengeId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/challenges");
  revalidatePath("/", "layout");
  return data as RpcResult;
}

/** Add or remove a shop item from the current user's wishlist. */
export async function toggleWishlist(slug: string, on: boolean): Promise<RpcResult> {
  const { supabase, user } = await client();
  const { data: item } = await supabase.from("shop_items").select("id").eq("slug", slug).maybeSingle();
  if (!item) return { ok: false, error: "Item not found" };
  if (on) {
    const { error } = await supabase.from("wishlist_items").insert({ user_id: user.id, item_id: item.id });
    if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("item_id", item.id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/shop");
  revalidatePath("/inventory");
  return { ok: true };
}

/** Gift a shop item to another player (charged at 75% of the list price). */
export async function giftItem(slug: string, toUserId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("gift_item", { p_slug: slug, p_to: toUserId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return data as RpcResult;
}
