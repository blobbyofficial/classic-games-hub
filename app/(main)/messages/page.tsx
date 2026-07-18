import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { listConversations } from "@/services/social";
import { ConversationList } from "@/features/social/conversation-list";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/messages");
  const conversations = await listConversations();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <MessageSquare className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with your friends in real time.</p>
        </div>
      </div>
      <ConversationList conversations={conversations} />
    </div>
  );
}
