"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function GamePicker({
  games,
  selected,
}: {
  games: { slug: string; title: string }[];
  selected?: string;
}) {
  const router = useRouter();
  return (
    <Select defaultValue={selected} onValueChange={(v) => router.push(`/leaderboards?game=${v}`)}>
      <SelectTrigger>
        <SelectValue placeholder="Select a game" />
      </SelectTrigger>
      <SelectContent>
        {games.map((g) => (
          <SelectItem key={g.slug} value={g.slug}>
            {g.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
