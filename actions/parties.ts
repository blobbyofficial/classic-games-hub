"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { PartyState, RpcResult } from "@/types";

// Server Actions are externally callable. Their TypeScript parameter types do
// not validate input received over the network.
const partyNameSchema = z.string().trim().min(1).max(80);
const inviteCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/, {
  message: "Invite codes must contain six letters or numbers.",
});
const userIdSchema = z.string().uuid();
const gameSlugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i);

const MESSAGES: Record<string, string> = {
  suspended: "Your account is suspended.",
  already_in_party: "You're already in a party - leave it first.",
  already_in_a_party: "They're already in a party.",
  invalid_code: "No party with that code. Check it and try again.",
  party_full: "That party is full.",
  blocked: "You can't join that party.",
  not_in_party: "You're not in a party.",
  not_leader: "Only the party leader can do that.",
  not_a_member: "They're not in your party.",
  cannot_kick_self: "You can't remove yourself - leave the party instead.",
  unknown_game: "That game isn't available.",
};

const GENERIC_ERROR = "Couldn't complete that party action. Please try again.";

function messageFor(code: string): string {
  return Object.prototype.hasOwnProperty.call(MESSAGES, code) ? MESSAGES[code] : GENERIC_ERROR;
}

// Parse the actual RPC response instead of asserting its shape with `as`.
// Unknown or malformed results must never be treated as successful.
function parseRpcResult(data: unknown): RpcResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    console.error("[party] RPC returned an invalid response");
    return { ok: false, error: GENERIC_ERROR };
  }
  const result = data as Record<string, unknown>;
  if (result.ok === false) {
    const code = typeof result.error === "string" ? result.error : "";
    return { ok: false, error: messageFor(code) };
  }
  if (result.ok !== true) {
    console.error("[party] RPC response missing an explicit ok boolean");
    return { ok: false, error: GENERIC_ERROR };
  }
  return data as RpcResult;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return supabase;
}

type PartyRpcName =
  | "create_party"
  | "join_party"
  | "leave_party"
  | "kick_from_party"
  | "set_party_game"
  | "invite_to_party";

async function callPartyRpc(
  operation: PartyRpcName,
  params?: Record<string, string | null>,
  revalidate = true,
): Promise<RpcResult> {
  try {
    const supabase = await authenticatedClient();
    if (!supabase) return { ok: false, error: "Sign in to manage your party." };
    // The database functions are responsible for authorisation, membership,
    // and atomic updates. Do not replace those checks in this action layer.
    const { data, error } = await supabase.rpc(operation, params);
    if (error) {
      console.error(`[party] ${operation} failed`, { code: error.code });
      return { ok: false, error: GENERIC_ERROR };
    }
    const result = parseRpcResult(data);
    if (result.ok && revalidate) revalidatePath("/party");
    return result;
  } catch (error) {
    console.error(`[party] ${operation} threw`, error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Fetch the user's current party. Never invent an empty state on RPC failure. */
export async function getPartyState(): Promise<PartyState> {
  // Public callers already rely on `in_party: false` for unauthenticated users.
  const supabase = await authenticatedClient();
  if (!supabase) return { in_party: false };

  const { data, error } = await supabase.rpc("party_state");
  if (error) {
    console.error("[party] party_state failed", { code: error.code });
    throw new Error("Couldn't load your party. Please try again.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      typeof (data as { in_party?: unknown }).in_party !== "boolean") {
    console.error("[party] party_state returned an invalid response");
    throw new Error("Couldn't load your party. Please try again.");
  }
  return data as PartyState;
}

export async function createParty(name?: string): Promise<RpcResult> {
  if (name !== undefined && typeof name !== "string") {
    return { ok: false, error: "Invalid party name." };
  }
  // Keep empty names as null for automatically named parties.
  const normalized = name?.trim() || null;
  if (normalized !== null) {
    const parsed = partyNameSchema.safeParse(normalized);
    if (!parsed.success) return { ok: false, error: "Party names must be 1–80 characters." };
  }
  return callPartyRpc("create_party", { p_name: normalized });
}

export async function joinParty(code: string): Promise<RpcResult> {
  const parsed = inviteCodeSchema.safeParse(code);
  if (!parsed.success) return { ok: false, error: "Invite codes must contain six letters or numbers." };
  return callPartyRpc("join_party", { p_code: parsed.data });
}

export async function leaveParty(): Promise<RpcResult> {
  return callPartyRpc("leave_party");
}

export async function kickFromParty(userId: string): Promise<RpcResult> {
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) return { ok: false, error: "Invalid player ID." };
  return callPartyRpc("kick_from_party", { p_user: parsed.data });
}

/** Leader-only: choose what the party plays next (null clears the choice). */
export async function setPartyGame(slug: string | null): Promise<RpcResult> {
  if (slug !== null) {
    const parsed = gameSlugSchema.safeParse(slug);
    if (!parsed.success) return { ok: false, error: "Invalid game identifier." };
    return callPartyRpc("set_party_game", { p_slug: parsed.data });
  }
  return callPartyRpc("set_party_game", { p_slug: null });
}

/** Send a party invite as a notification carrying the invite code. */
export async function inviteToParty(userId: string): Promise<RpcResult> {
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) return { ok: false, error: "Invalid player ID." };
  // An invite does not change the sender's party-state page.
  return callPartyRpc("invite_to_party", { p_user: parsed.data }, false);
}
