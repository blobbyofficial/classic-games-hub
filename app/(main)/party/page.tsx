import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/queries";
import { getPartyState } from "@/actions/parties";
import { getPublishedGames } from "@/services/games";
import { listFriends } from "@/services/social";
import { hasEngine } from "@/lib/games/registry";
import { PartyRoom } from "@/features/party/party-room";

export const metadata: Metadata = {
  title: "Party",
  description: "Play together — head-to-head matches and score races with your friends.",
};

export default async function PartyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/party");

  const [party, games, friends] = await Promise.all([getPartyState(), getPublishedGames(), listFriends()]);

  // Only games that are live *and* have a playable engine can be picked.
  const options = games
    .filter((g) => g.status === "published" && hasEngine(g.engine_id))
    .map((g) => ({ slug: g.slug, title: g.title, engine_id: g.engine_id }));

  return (
    <div className="mx-auto max-w-4xl">
      <PartyRoom initial={party} me={user.id} games={options} friends={friends} />
    </div>
  );
}
