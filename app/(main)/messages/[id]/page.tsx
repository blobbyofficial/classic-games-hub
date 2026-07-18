import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/supabase/queries";
import { getConversation } from "@/services/social";
import { ChatThread } from "@/features/social/chat-thread";

export const metadata: Metadata = { title: "Chat" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/messages/${id}`);

  const conversation = await getConversation(id);
  if (!conversation) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <ChatThread conversation={conversation} />
    </div>
  );
}
