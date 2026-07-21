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

export interface ConversationMember {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string;
}

export interface ConversationDetail {
  id: string;
  isGroup: boolean;
  /** Group name (groups only). */
  name: string | null;
  /** The other participant (DMs only). */
  other: ConversationMember | null;
  /** All other members (groups: everyone but me; used for sender lookup). */
  members: ConversationMember[];
  /** When the other member last read this conversation — powers "Seen" receipts (DMs only). */
  otherLastReadAt: string | null;
  messages: {
    id: number;
    sender_id: string;
    content: string;
    created_at: string;
    reactions: { emoji: string; user_id: string }[];
  }[];
}

export const getConversation = cache(async (conversationId: string): Promise<ConversationDetail | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, is_group, name")
    .eq("id", conversationId)
    .maybeSingle();
  if (!convo) return null;

  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id, last_read_at, profiles(id, username, display_name, avatar_url, last_seen_at)")
    .eq("conversation_id", conversationId);

  if (!members || !members.some((m) => m.user_id === user.id)) return null;
  const others = members
    .filter((m) => m.user_id !== user.id)
    .map((m) => m.profiles as unknown as ConversationMember);
  const otherMember = members.find((m) => m.user_id !== user.id);
  if (!convo.is_group && !otherMember) return null;

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  const ids = (messages ?? []).map((m) => m.id);
  let reactionRows: { message_id: number; emoji: string; user_id: string }[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("message_reactions")
      .select("message_id, emoji, user_id")
      .in("message_id", ids);
    reactionRows = data ?? [];
  }

  return {
    id: conversationId,
    isGroup: convo.is_group,
    name: convo.name,
    other: convo.is_group ? null : (otherMember!.profiles as unknown as ConversationMember),
    members: others,
    otherLastReadAt: convo.is_group ? null : (otherMember!.last_read_at ?? null),
    messages: (messages ?? []).map((m) => ({
      ...m,
      reactions: reactionRows
        .filter((r) => r.message_id === m.id)
        .map((r) => ({ emoji: r.emoji, user_id: r.user_id })),
    })),
  };
});
