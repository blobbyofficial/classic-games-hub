import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/queries";
import { listFriends, listFriendRequests } from "@/services/social";
import { AddFriend, FriendRequests, FriendsList } from "@/features/social/friends-panel";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/friends");

  const [friends, requests] = await Promise.all([listFriends(), listFriendRequests()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Users className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
          <p className="text-sm text-muted-foreground">
            {friends.length} {friends.length === 1 ? "friend" : "friends"}
          </p>
        </div>
      </div>

      <AddFriend />
      <FriendRequests requests={requests} />
      <FriendsList friends={friends} />
    </div>
  );
}
