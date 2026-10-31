import { isActiveShopItem } from "@/lib/profile-catalogue";
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { RpcResult } from "@/types";

// Server actions can be called with arbitrary runtime values. Keep validation at
// this boundary; database functions must independently enforce ownership and
// economic invariants (balances, entitlements, prices and one-time claims).
const identifierSchema = z.string().trim().min(1).max(128);
const userIdSchema = z.string().uuid();
const slugSchema = z.string().trim().min(1).max(128);
const nameSchema = z.string().trim().min(1).max(80);
const seasonTierSchema = z.number().int().positive().safe();
const wishlistStateSchema = z.boolean();

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type RpcOperation = (supabase: SupabaseClient) => PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}>;

const genericFailure = "The action couldn't be completed. Please try again.";

function invalid<T>(schema: z.ZodType<T>, value: unknown, label: string):
  | { ok: true; value: T }
  | { ok: false; error: string } {
  const result = schema.safeParse(value);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: `Invalid ${label}.` };
}

function resultFromRpc(data: unknown): RpcResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    console.error("[economy] RPC returned an unexpected result shape");
    return { ok: false, error: genericFailure };
  }
  const result = data as Record<string, unknown>;
  if (typeof result.ok !== "boolean") {
    console.error("[economy] RPC result missing boolean ok field");
    return { ok: false, error: genericFailure };
  }
  if (!result.ok) {
    // Do not expose arbitrary database messages (which may contain internals).
    // Known business errors may later be mapped to friendly messages centrally.
    return {
      ok: false,
      error: typeof result.error === "string" && result.error.length <= 160
        ? result.error
        : genericFailure,
    };
  }
  return data as RpcResult;
}

async function runRpc(
  operation: RpcOperation,
  paths: readonly string[],
  options: { voidResultIsSuccess?: boolean } = {},
): Promise<RpcResult> {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return { ok: false, error: "Sign in to continue." };

    const { data, error } = await operation(supabase);
    if (error) {
      console.error("[economy] RPC failed", { message: error.message });
      return { ok: false, error: genericFailure };
    }
    const result = options.voidResultIsSuccess && data == null
      ? ({ ok: true } as RpcResult)
      : resultFromRpc(data);
    if (result.ok) for (const path of paths) revalidatePath(path, path === "/" ? "layout" : "page");
    return result;
  } catch (error) {
    console.error("[economy] Unexpected action failure", error);
    return { ok: false, error: genericFailure };
  }
}

export async function claimDailyReward(): Promise<RpcResult> {
  return runRpc((db) => db.rpc("claim_daily_reward"), ["/"]);
}

export async function purchaseItem(slug: string): Promise<RpcResult> {
  const item = invalid(slugSchema, slug, "item");
  if (!item.ok) return { ok: false, error: item.error };
  if (!isActiveShopItem(item.value)) return { ok: false, error: "This item has been retired." };
  return runRpc((db) => db.rpc("purchase_shop_item", { p_slug: item.value }), ["/shop", "/inventory", "/"]);
}

export async function equipItem(slug: string): Promise<RpcResult> {
  const item = invalid(slugSchema, slug, "item");
  if (!item.ok) return { ok: false, error: item.error };
  if (!isActiveShopItem(item.value)) return { ok: false, error: "This item has been retired." };
  return runRpc((db) => db.rpc("equip_item", { p_slug: item.value }), ["/inventory", "/"]);
}

export async function unequipItem(kind: string): Promise<RpcResult> {
  const itemKind = invalid(identifierSchema, kind, "equipment type");
  if (!itemKind.ok) return { ok: false, error: itemKind.error };
  // This RPC may return void; still honour an explicit { ok: false }.
  return runRpc((db) => db.rpc("unequip_item", { p_kind: itemKind.value }), ["/inventory", "/"], { voidResultIsSuccess: true });
}

export async function claimChallenge(challengeId: string): Promise<RpcResult> {
  const challenge = invalid(identifierSchema, challengeId, "challenge");
  if (!challenge.ok) return { ok: false, error: challenge.error };
  return runRpc((db) => db.rpc("claim_challenge", { p_challenge: challenge.value }), ["/challenges", "/"]);
}

/** Set a shop item's wishlist state; duplicate additions are already successful. */
export async function toggleWishlist(slug: string, on: boolean): Promise<RpcResult> {
  const itemSlug = invalid(slugSchema, slug, "item");
  if (!itemSlug.ok) return { ok: false, error: itemSlug.error };
  const state = invalid(wishlistStateSchema, on, "wishlist state");
  if (!state.ok) return { ok: false, error: state.error };

  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return { ok: false, error: "Sign in to continue." };

    const { data: item, error: lookupError } = await supabase
      .from("shop_items").select("id").eq("slug", itemSlug.value).maybeSingle();
    if (lookupError) {
      console.error("[wishlist] Item lookup failed", lookupError);
      return { ok: false, error: genericFailure };
    }
    if (!item) return { ok: false, error: "Item not found." };

    if (state.value) {
      const { error } = await supabase.from("wishlist_items").insert({
        user_id: auth.user.id,
        item_id: item.id,
      });
      // PostgreSQL unique_violation: don't suppress unrelated failures based
      // on a substring in a vendor-supplied message.
      if (error && error.code !== "23505") {
        console.error("[wishlist] Add failed", error);
        return { ok: false, error: genericFailure };
      }
    } else {
      const { error } = await supabase.from("wishlist_items")
        .delete().eq("user_id", auth.user.id).eq("item_id", item.id);
      if (error) {
        console.error("[wishlist] Remove failed", error);
        return { ok: false, error: genericFailure };
      }
    }
    revalidatePath("/shop");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (error) {
    console.error("[wishlist] Unexpected action failure", error);
    return { ok: false, error: genericFailure };
  }
}

/** Gift cost is calculated by the database, never by the supplied client. */
export async function giftItem(slug: string, toUserId: string): Promise<RpcResult> {
  const item = invalid(slugSchema, slug, "item");
  const recipient = invalid(userIdSchema, toUserId, "recipient");
  if (!item.ok) return { ok: false, error: item.error };
  if (!recipient.ok) return { ok: false, error: recipient.error };
  if (!isActiveShopItem(item.value)) return { ok: false, error: "This item has been retired." };
  return runRpc((db) => db.rpc("gift_item", { p_slug: item.value, p_to: recipient.value }), ["/"]);
}

export async function saveLoadoutPreset(name: string, id?: string): Promise<RpcResult> {
  const presetName = invalid(nameSchema, name, "preset name");
  if (!presetName.ok) return { ok: false, error: presetName.error };
  const presetId = id === undefined ? null : invalid(identifierSchema, id, "preset ID");
  if (presetId !== null && !presetId.ok) return { ok: false, error: presetId.error };
  return runRpc(
    (db) => db.rpc("save_loadout_preset", {
      p_name: presetName.value,
      p_id: presetId === null ? null : presetId.value,
    }),
    ["/inventory"],
  );
}

export async function applyLoadoutPreset(id: string): Promise<RpcResult> {
  const preset = invalid(identifierSchema, id, "preset ID");
  if (!preset.ok) return { ok: false, error: preset.error };
  return runRpc((db) => db.rpc("apply_loadout_preset", { p_id: preset.value }), ["/inventory", "/"]);
}

export async function deleteLoadoutPreset(id: string): Promise<RpcResult> {
  const preset = invalid(identifierSchema, id, "preset ID");
  if (!preset.ok) return { ok: false, error: preset.error };
  return runRpc((db) => db.rpc("delete_loadout_preset", { p_id: preset.value }), ["/inventory"]);
}

export async function claimCollection(slug: string): Promise<RpcResult> {
  const collection = invalid(slugSchema, slug, "collection");
  if (!collection.ok) return { ok: false, error: collection.error };
  return runRpc((db) => db.rpc("claim_collection", { p_slug: collection.value }), ["/collections", "/"]);
}

export async function claimSeasonTier(tier: number): Promise<RpcResult> {
  const seasonTier = invalid(seasonTierSchema, tier, "season tier");
  if (!seasonTier.ok) return { ok: false, error: seasonTier.error };
  return runRpc((db) => db.rpc("claim_season_tier", { p_tier: seasonTier.value }), ["/collections", "/"]);
}

export async function giftWithToken(slug: string, toUserId: string): Promise<RpcResult> {
  const item = invalid(slugSchema, slug, "item");
  const recipient = invalid(userIdSchema, toUserId, "recipient");
  if (!item.ok) return { ok: false, error: item.error };
  if (!recipient.ok) return { ok: false, error: recipient.error };
  if (!isActiveShopItem(item.value)) return { ok: false, error: "This item has been retired." };
  return runRpc((db) => db.rpc("gift_with_token", { p_slug: item.value, p_to: recipient.value }), ["/shop", "/"]);
}
