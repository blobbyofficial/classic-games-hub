"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { messageSchema, reportSchema } from "@/lib/validators";
import type { PlayerSearchRow, RpcResult } from "@/types";

// These are input-shape checks, not a substitute for RLS or RPC authorization.
const uuid = z.string().uuid();
const positiveId = z.number().int().positive().safe();
const username = z.string().trim().min(1).max(64);
const searchQuery = z.string().trim().min(2).max(80);
const groupName = z.string().trim().min(1).max(100);
const inviteCode = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const storyKind = z.enum(["text", "achievement"]);
const storyContent = z.string().trim().min(1).max(2000);
const emojiSchema = z.string().trim().min(1).max(32);
const noteText = z.string().trim().max(2000);
const nicknameText = z.string().trim().max(100);

const AUTH_ERROR = "Log in to continue.";
const REQUEST_ERROR = "Couldn't complete that request. Try again.";

type AuthClient = Awaited<ReturnType<typeof createClient>>;
type AuthContext = { supabase: AuthClient; userId: string };

async function authenticated(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

function validationError(result: { success: true } | { success: false; error: z.ZodError }): RpcResult {
  return { ok: false, error: result.success ? "Invalid input" : result.error.issues[0]?.message ?? "Invalid input" };
}

function databaseError(operation: string, error: { code?: string; message?: string }): RpcResult {
  console.error(`[social] ${operation} failed`, { code: error.code, message: error.message });
  return { ok: false, error: REQUEST_ERROR };
}

// Database functions can return {ok,error,...} OR no payload. Only the explicitly
// documented void RPCs may be treated as successful without a result envelope.
function parseResult(value: unknown, operation: string): RpcResult {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const res = value as Record<string, unknown>;
    if (typeof res.ok === "boolean") {
      if (res.ok) return value as RpcResult;
      return { ok: false, error: typeof res.error === "string" ? res.error : REQUEST_ERROR };
    }
  }
  console.error(`[social] ${operation} returned an unexpected response`);
  return { ok: false, error: REQUEST_ERROR };
}

function invalidateFriends() { revalidatePath("/friends"); }
function invalidateMessages() { revalidatePath("/messages"); }

export async function searchPlayers(query: string): Promise<PlayerSearchRow[]> {
  const valid = searchQuery.safeParse(query);
  if (!valid.success) return [];
  const ctx = await authenticated();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase.rpc("search_players", { p_query: valid.data });
  if (error) {
    databaseError("searchPlayers", error);
    return [];
  }
  return Array.isArray(data) ? (data as PlayerSearchRow[]).slice(0, 50) : [];
}

export async function sendFriendRequest(name: string): Promise<RpcResult> {
  const parsed = username.safeParse(name);
  if (!parsed.success) return validationError(parsed);
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc("send_friend_request", { p_username: parsed.data });
  if (error) return databaseError("sendFriendRequest", error);
  const result = parseResult(data, "sendFriendRequest");
  if (result.ok) invalidateFriends();
  return result;
}

export async function respondFriendRequest(id: number, accept: boolean): Promise<RpcResult> {
  const parsed = positiveId.safeParse(id);
  if (!parsed.success || typeof accept !== "boolean") return { ok: false, error: "Invalid friend request." };
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc("respond_friend_request", { p_id: parsed.data, p_accept: accept });
  if (error) return databaseError("respondFriendRequest", error);
  const result = parseResult(data, "respondFriendRequest");
  if (result.ok) invalidateFriends();
  return result;
}

async function voidUserRpc(operation: "remove_friend" | "block_user" | "unblock_user" | "unfollow_user", userId: string): Promise<RpcResult> {
  const parsed = uuid.safeParse(userId);
  if (!parsed.success) return { ok: false, error: "Invalid user ID." };
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc(operation, { p_user: parsed.data });
  if (error) return databaseError(operation, error);
  // Legacy void RPCs return null. If a newer version returns an envelope, honor failures.
  return data == null ? { ok: true } : parseResult(data, operation);
}

export async function removeFriend(userId: string): Promise<RpcResult> {
  const result = await voidUserRpc("remove_friend", userId);
  if (result.ok) invalidateFriends();
  return result;
}
export async function blockUser(userId: string): Promise<RpcResult> {
  const result = await voidUserRpc("block_user", userId);
  if (result.ok) { invalidateFriends(); invalidateMessages(); }
  return result;
}
export async function unblockUser(userId: string): Promise<RpcResult> {
  const result = await voidUserRpc("unblock_user", userId);
  if (result.ok) revalidatePath("/settings/privacy");
  return result;
}

/** Open/reuse a DM; the RPC MUST check blocks and conversation eligibility. */
export async function startConversation(userId: string): Promise<RpcResult> {
  const parsed = uuid.safeParse(userId);
  if (!parsed.success) return { ok: false, error: "Invalid user ID." };
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc("get_or_create_dm", { p_user: parsed.data });
  if (error) return databaseError("startConversation", error);
  if (typeof data !== "string" || !uuid.safeParse(data).success) {
    console.error("[social] get_or_create_dm returned an invalid conversation ID");
    return { ok: false, error: REQUEST_ERROR };
  }
  return { ok: true, conversation_id: data };
}

export async function sendMessage(conversationId: string, content: string): Promise<RpcResult> {
  const id = uuid.safeParse(conversationId);
  if (!id.success) return { ok: false, error: "Invalid conversation." };
  const parsed = messageSchema.safeParse(content);
  if (!parsed.success) return validationError(parsed);
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  // RLS MUST verify sender membership and blocked-user rules, not just sender_id.
  const { data, error } = await ctx.supabase.from("messages")
    .insert({ conversation_id: id.data, sender_id: ctx.userId, content: parsed.data })
    .select("id, sender_id, content, created_at").single();
  if (error) return databaseError("sendMessage", error);
  if (!data) return { ok: false, error: REQUEST_ERROR };
  return { ok: true, message: data };
}

export async function markConversationRead(conversationId: string): Promise<RpcResult> {
  const parsed = uuid.safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: "Invalid conversation." };
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc("mark_conversation_read", { p_conversation: parsed.data });
  if (error) return databaseError("markConversationRead", error);
  return data == null ? { ok: true } : parseResult(data, "markConversationRead");
}

export async function postStory(kind: "text" | "achievement", content: string): Promise<RpcResult> {
  const k = storyKind.safeParse(kind);
  const c = storyContent.safeParse(content);
  if (!k.success) return validationError(k);
  if (!c.success) return validationError(c);
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc("post_story", { p_kind: k.data, p_content: c.data });
  if (error) return databaseError("postStory", error);
  const result = parseResult(data, "postStory");
  if (result.ok) invalidateMessages();
  return result;
}

export async function deleteStory(id: number): Promise<RpcResult> {
  const parsed = positiveId.safeParse(id);
  if (!parsed.success) return validationError(parsed);
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  // Both RLS and the explicit user filter protect ownership.
  const { error } = await ctx.supabase.from("stories").delete()
    .eq("id", parsed.data).eq("user_id", ctx.userId);
  if (error) return databaseError("deleteStory", error);
  invalidateMessages();
  return { ok: true };
}

export async function createGroup(name: string): Promise<RpcResult> {
  const parsed = groupName.safeParse(name);
  if (!parsed.success) return validationError(parsed);
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc("create_group", { p_name: parsed.data });
  if (error) return databaseError("createGroup", error);
  const result = parseResult(data, "createGroup");
  if (result.ok) invalidateMessages();
  return result;
}

export async function joinGroup(code: string): Promise<RpcResult> {
  const parsed = inviteCode.safeParse(code);
  if (!parsed.success) return { ok: false, error: "Invalid group invite code." };
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc("join_group", { p_code: parsed.data });
  if (error) return databaseError("joinGroup", error);
  const result = parseResult(data, "joinGroup");
  if (result.ok) invalidateMessages();
  return result;
}

export async function leaveConversation(id: string): Promise<RpcResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid conversation." };
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc("leave_conversation", { p_id: parsed.data });
  if (error) return databaseError("leaveConversation", error);
  const result = data == null ? { ok: true as const } : parseResult(data, "leaveConversation");
  if (result.ok) invalidateMessages();
  return result;
}

export async function toggleReaction(messageId: number, emoji: string, add: boolean): Promise<RpcResult> {
  const id = positiveId.safeParse(messageId);
  const symbol = emojiSchema.safeParse(emoji);
  if (!id.success) return validationError(id);
  if (!symbol.success) return validationError(symbol);
  if (typeof add !== "boolean") return { ok: false, error: "Invalid reaction action." };
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  if (add) {
    const { error } = await ctx.supabase.from("message_reactions")
      .insert({ message_id: id.data, user_id: ctx.userId, emoji: symbol.data });
    if (error && error.code !== "23505") return databaseError("toggleReaction", error);
  } else {
    const { error } = await ctx.supabase.from("message_reactions").delete()
      .eq("message_id", id.data).eq("user_id", ctx.userId).eq("emoji", symbol.data);
    if (error) return databaseError("toggleReaction", error);
  }
  return { ok: true };
}

export async function followUser(userId: string): Promise<RpcResult> {
  const parsed = uuid.safeParse(userId);
  if (!parsed.success) return { ok: false, error: "Invalid user ID." };
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { data, error } = await ctx.supabase.rpc("follow_user", { p_user: parsed.data });
  if (error) return databaseError("followUser", error);
  return parseResult(data, "followUser");
}
export async function unfollowUser(userId: string): Promise<RpcResult> {
  return voidUserRpc("unfollow_user", userId);
}

export async function setUserNote(userId: string, nickname: string, note: string): Promise<RpcResult> {
  const id = uuid.safeParse(userId);
  const nick = nicknameText.safeParse(nickname);
  const text = noteText.safeParse(note);
  if (!id.success || !nick.success || !text.success) return { ok: false, error: "Invalid note or user." };
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { error } = await ctx.supabase.from("user_notes").upsert({
    author_id: ctx.userId, target_id: id.data,
    nickname: nick.data || null, note: text.data || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "author_id,target_id" });
  if (error) return databaseError("setUserNote", error);
  return { ok: true };
}

export async function submitReport(input: unknown): Promise<RpcResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed);
  const ctx = await authenticated();
  if (!ctx) return { ok: false, error: AUTH_ERROR };
  const { error } = await ctx.supabase.from("reports").insert({
    reporter_id: ctx.userId,
    target_type: parsed.data.target_type,
    target_user_id: parsed.data.target_user_id ?? null,
    target_id: parsed.data.target_id ?? null,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) return databaseError("submitReport", error);
  return { ok: true };
}
