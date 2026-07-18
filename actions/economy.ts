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
