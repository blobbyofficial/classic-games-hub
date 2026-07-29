"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ShopItemCard } from "./shop-item-card";
import type { ShopItem } from "@/types";

const GROUPS: { key: string; label: string; kinds: string[] }[] = [
  { key: "all", label: "All", kinds: [] },
  { key: "frames", label: "Frames", kinds: ["avatar_frame"] },
  { key: "decorations", label: "Decorations", kinds: ["decoration"] },
  { key: "themes", label: "Themes", kinds: ["profile_theme", "banner"] },
  { key: "nameplates", label: "Nameplates", kinds: ["nameplate"] },
  { key: "badges", label: "Badges", kinds: ["badge"] },
  { key: "effects", label: "Effects", kinds: ["effect"] },
  { key: "collectibles", label: "Collectibles", kinds: ["collectible"] },
  { key: "boosts", label: "Boosts", kinds: ["xp_boost", "credit_boost"] },
];

export function ShopGrid({ items, owned }: { items: ShopItem[]; owned: string[] }) {
  const [group, setGroup] = useState("all");
  const ownedSet = new Set(owned);
  const active = GROUPS.find((g) => g.key === group)!;
  const filtered = active.kinds.length === 0 ? items : items.filter((i) => active.kinds.includes(i.kind));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setGroup(g.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              group === g.key ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item) => (
          <ShopItemCard key={item.id} item={item} owned={ownedSet.has(item.slug)} />
        ))}
      </div>
    </div>
  );
}
