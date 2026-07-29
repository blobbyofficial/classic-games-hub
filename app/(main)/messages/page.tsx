import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getSessionUser, getCurrentProfile } from "@/lib/supabase/queries";
import { listConversations, getActiveStories } from "@/services/social";
import { ConversationList } from "@/features/social/conversation-list";
import { NewGroupButton } from "@/features/social/new-group";
import { StoriesStrip } from "@/features/social/stories-strip";
import { PageHeader } from "@/components/page-header";

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
      <PageHeader
        icon={MessageSquare}
        title="Messages"
        description="Chat with your friends in real time."
        actions={<NewGroupButton />}
        className="mb-0"
      />

      {profile && (
        <StoriesStrip
          stories={stories}
          currentUser={{
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            canPost:
              profile.discord_linked ||
              profile.role === "admin" ||
              profile.role === "moderator" ||
              profile.level >= 15,
          }}
        />
      )}

      <ConversationList conversations={conversations} />
    </div>
  );
}
