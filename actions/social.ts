"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { messageSchema, reportSchema } from "@/lib/validators";
import type { PlayerSearchRow, RpcResult } from "@/types";

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function searchPlayers(query: string): Promise<PlayerSearchRow[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("search_players", { p_query: q });
  if (error) return [];
  return data ?? [];
}

export async function sendFriendRequest(username: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("send_friend_request", { p_username: username });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/friends");
  return data as RpcResult;
}

export async function respondFriendRequest(id: number, accept: boolean): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("respond_friend_request", { p_id: id, p_accept: accept });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/friends");
  return data as RpcResult;
}

export async function removeFriend(userId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { error } = await supabase.rpc("remove_friend", { p_user: userId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/friends");
  return { ok: true };
}

export async function blockUser(userId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { error } = await supabase.rpc("block_user", { p_user: userId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/friends");
  return { ok: true };
}

export async function unblockUser(userId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { error } = await supabase.rpc("unblock_user", { p_user: userId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/privacy");
  return { ok: true };
}

/** Open (or reuse) a DM conversation and return its id. */
export async function startConversation(userId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("get_or_create_dm", { p_user: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, conversation_id: data };
}

export async function sendMessage(conversationId: string, content: string): Promise<RpcResult> {
  const parsed = messageSchema.safeParse(content);
  if (!parsed.success) return { ok: false, error: "Message must be 1–2000 characters" };

  const { supabase, user } = await client();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markConversationRead(conversationId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleReaction(messageId: number, emoji: string, add: boolean): Promise<RpcResult> {
  const { supabase, user } = await client();
  if (add) {
    const { error } = await supabase
      .from("message_reactions")
      .insert({ message_id: messageId, user_id: user.id, emoji });
    if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function followUser(userId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { data, error } = await supabase.rpc("follow_user", { p_user: userId });
  if (error) return { ok: false, error: error.message };
  return data as RpcResult;
}

export async function unfollowUser(userId: string): Promise<RpcResult> {
  const { supabase } = await client();
  const { error } = await supabase.rpc("unfollow_user", { p_user: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Save a private nickname/note about another player (only the author sees it). */
export async function setUserNote(userId: string, nickname: string, note: string): Promise<RpcResult> {
  const { supabase, user } = await client();
  const { error } = await supabase.from("user_notes").upsert({
    author_id: user.id,
    target_id: userId,
    nickname: nickname.trim() || null,
    note: note.trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function submitReport(input: unknown): Promise<RpcResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, user } = await client();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.target_type,
    target_user_id: parsed.data.target_user_id ?? null,
    target_id: parsed.data.target_id ?? null,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
