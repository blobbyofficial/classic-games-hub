"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { ShopItemCard } from "./shop-item-card";
import type { ShopItem } from "@/types";

const GROUPS: { key: string; label: string; kinds: string[] }[] = [
  { key: "all", label: "All", kinds: [] },
  { key: "frames", label: "Frames", kinds: ["avatar_frame"] },
  { key: "themes", label: "Themes", kinds: ["profile_theme"] },
  { key: "banners", label: "Banners", kinds: ["banner"] },
  { key: "nameplates", label: "Nameplates", kinds: ["nameplate"] },
  { key: "badges", label: "Badges", kinds: ["badge"] },
  { key: "tracks", label: "Tracks", kinds: ["track"] },
  { key: "boosts", label: "Boosts", kinds: ["xp_boost", "credit_boost"] },
];

export function ShopGrid({ items, owned }: { items: ShopItem[]; owned: string[] }) {
  const [group, setGroup] = useState("all");
  const ownedSet = new Set(owned);
  const visibleGroups = GROUPS.filter((g) => g.key === "all" || items.some((item) => g.kinds.includes(item.kind)));
  const active = visibleGroups.find((g) => g.key === group) ?? visibleGroups[0];
  const filtered = active.kinds.length === 0 ? items : items.filter((i) => active.kinds.includes(i.kind));

  return (
    <div className="space-y-5">
      <div
        role="group"
        aria-label="Filter shop items"
        className="rail -mx-4 gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {visibleGroups.map((g) => (
          <button
            key={g.key}
            type="button"
            aria-pressed={group === g.key}
            onClick={() => setGroup(g.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium",
              "transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease-standard)] motion-safe:active:scale-95",
              group === g.key
                ? "border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "border-border text-muted-foreground hover:border-primary/30 hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={group === "all" ? "The shop is empty right now" : "Nothing in this category yet"}
          description="New cosmetics and boosts are added regularly - check back soon."
        />
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] sm:gap-4">
          {filtered.map((item) => (
            <ShopItemCard key={item.id} item={item} owned={ownedSet.has(item.slug)} />
          ))}
        </div>
      )}
    </div>
  );
}
