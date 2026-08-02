import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { listFriends, listFriendRequests, getFriendsActivity } from "@/services/social";
import { AddFriend, FriendRequests, FriendsList } from "@/features/social/friends-panel";
import { ActivityFeed } from "@/features/social/activity-feed";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/friends");

  const [friends, requests, activity] = await Promise.all([
    listFriends(),
    listFriendRequests(),
    getFriendsActivity(30),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        icon={Users}
        title="Friends"
        description={`${friends.length} ${friends.length === 1 ? "friend" : "friends"} - add more by username.`}
        className="mb-0"
      />

      <AddFriend />
      <FriendRequests requests={requests} />
      <FriendsList friends={friends} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <ActivityFeed events={activity} />
      </section>
    </div>
  );
}
