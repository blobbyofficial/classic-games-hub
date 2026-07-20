import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ConversationRow, FriendRequestRow, FriendRow, NotificationRow } from "@/types";

export const listFriends = cache(async (): Promise<FriendRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_friends");
  return data ?? [];
});

export const listFriendRequests = cache(async (): Promise<FriendRequestRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_friend_requests");
  return data ?? [];
});

export const listConversations = cache(async (): Promise<ConversationRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_conversations");
  return data ?? [];
});

export const getNotifications = cache(async (): Promise<NotificationRow[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
});

export interface ConversationDetail {
  id: string;
  other: { id: string; username: string; display_name: string | null; avatar_url: string | null; last_seen_at: string };
  /** When the other member last read this conversation — powers "Seen" receipts. */
  otherLastReadAt: string | null;
  messages: { id: number; sender_id: string; content: string; created_at: string }[];
}

export const getConversation = cache(async (conversationId: string): Promise<ConversationDetail | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id, last_read_at, profiles(id, username, display_name, avatar_url, last_seen_at)")
    .eq("conversation_id", conversationId);

  if (!members || !members.some((m) => m.user_id === user.id)) return null;
  const otherMember = members.find((m) => m.user_id !== user.id);
  if (!otherMember) return null;

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  return {
    id: conversationId,
    other: otherMember.profiles as unknown as ConversationDetail["other"],
    otherLastReadAt: otherMember.last_read_at ?? null,
    messages: messages ?? [],
  };
});
