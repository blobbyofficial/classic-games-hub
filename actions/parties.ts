"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PartyState, RpcResult } from "@/types";

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/**
 * The RPCs return machine-readable codes so the wording lives here, in one
 * place, instead of being spread across a dozen SQL string literals.
 */
const MESSAGES: Record<string, string> = {
  suspended: "Your account is suspended.",
  already_in_party: "You're already in a party — leave it first.",
  already_in_a_party: "They're already in a party.",
  invalid_code: "No party with that code. Check it and try again.",
  party_full: "That party is full.",
  blocked: "You can't join that party.",
  not_in_party: "You're not in a party.",
  not_leader: "Only the party leader can do that.",
  not_a_member: "They're not in your party.",
  cannot_kick_self: "You can't remove yourself — leave the party instead.",
  unknown_game: "That game isn't available.",
};

/** Turn an `{ok:false, error:"code"}` envelope into something readable. */
function readable(result: RpcResult): RpcResult {
  if (result.ok || !result.error) return result;
  return { ...result, error: MESSAGES[result.error] ?? result.error };
}

export async function getPartyState(): Promise<PartyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { in_party: false };

  const { data, error } = await supabase.rpc("party_state");
  if (error || !data) return { in_party: false };
  return data as unknown as PartyState;
}

export async function createParty(name?: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("create_party", { p_name: name?.trim() || null });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/party");
  return readable(data as RpcResult);
}

export async function joinParty(code: string): Promise<RpcResult> {
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length !== 6) return { ok: false, error: "Invite codes are six characters." };

  const { supabase } = await client();
  const { data, error } = await supabase.rpc("join_party", { p_code: trimmed });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/party");
  return readable(data as RpcResult);
}

export async function leaveParty(): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("leave_party");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/party");
  return readable(data as RpcResult);
}

export async function kickFromParty(userId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("kick_from_party", { p_user: userId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/party");
  return readable(data as RpcResult);
}

/** Leader-only: choose what the party plays next (null clears the choice). */
export async function setPartyGame(slug: string | null): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("set_party_game", { p_slug: slug });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/party");
  return readable(data as RpcResult);
}

/** Send a party invite as a notification carrying the invite code. */
export async function inviteToParty(userId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("invite_to_party", { p_user: userId });
  if (error) return { ok: false, error: error.message };
  return readable(data as RpcResult);
}
