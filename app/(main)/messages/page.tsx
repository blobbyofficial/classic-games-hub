import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getSessionUser, getCurrentProfile } from "@/lib/supabase/queries";
import { listConversations, getActiveStories } from "@/services/social";
import { ConversationList } from "@/features/social/conversation-list";
import { NewGroupButton } from "@/features/social/new-group";
import { StoriesStrip } from "@/features/social/stories-strip";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/messages");
  const [conversations, stories, profile] = await Promise.all([
    listConversations(),
    getActiveStories(),
    getCurrentProfile(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <MessageSquare className="size-6" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with your friends in real time.</p>
        </div>
        <NewGroupButton />
      </div>

      {profile && (
        <StoriesStrip
          stories={stories}
          currentUser={{
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            canPost: profile.discord_linked || profile.role === "admin" || profile.role === "moderator",
          }}
        />
      )}

      <ConversationList conversations={conversations} />
    </div>
  );
}
