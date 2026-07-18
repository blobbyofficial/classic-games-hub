import { createClient } from "@/lib/supabase/server";
import { GameAdminRow } from "@/features/admin/game-admin-row";
import { NewGameForm } from "@/features/admin/new-game-form";

export default async function AdminGamesPage() {
  const supabase = await createClient();
  const { data: games } = await supabase.from("games").select("*").order("sort_weight", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{games?.length ?? 0} games</p>
        <NewGameForm />
      </div>
      <div className="space-y-2">
        {(games ?? []).map((g) => (
          <GameAdminRow key={g.id} game={g} />
        ))}
      </div>
    </div>
  );
}
