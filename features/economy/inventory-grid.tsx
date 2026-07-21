"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Search, Zap, Coins } from "lucide-react";
import { toast } from "sonner";
import { equipItem, unequipItem } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BoostTimer } from "./boost-timer";
import { cn, RARITY_META } from "@/lib/utils";
import type { OwnedItem } from "@/services/shop";

const EQUIPPABLE = new Set(["avatar_frame", "profile_theme", "badge", "effect", "banner", "nameplate"]);

const TYPE_FILTERS: { key: string; label: string; kinds: string[] }[] = [
  { key: "all", label: "All", kinds: [] },
  { key: "frames", label: "Frames", kinds: ["avatar_frame"] },
  { key: "themes", label: "Themes", kinds: ["profile_theme"] },
  { key: "banners", label: "Banners", kinds: ["banner"] },
  { key: "nameplates", label: "Nameplates", kinds: ["nameplate"] },
  { key: "badges", label: "Badges", kinds: ["badge"] },
  { key: "effects", label: "Effects", kinds: ["effect"] },
  { key: "collectibles", label: "Collectibles", kinds: ["collectible"] },
];

const RARITY_ORDER: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
const SORTS = ["Recent", "Name", "Rarity"] as const;
type Sort = (typeof SORTS)[number];

export function InventoryGrid({ items }: { items: OwnedItem[] }) {
  const profile = useSessionStore((s) => s.profile);
  const patchProfile = useSessionStore((s) => s.patchProfile);
  const [equipped, setEquipped] = useState<Record<string, string>>(profile?.equipped ?? {});
  const [pending, start] = useTransition();

  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [sort, setSort] = useState<Sort>("Recent");

  const toggle = (item: OwnedItem) => {
    const isEquipped = equipped[item.kind] === item.slug;
    start(async () => {
      if (isEquipped) {
        const res = await unequipItem(item.kind);
        if (!res.ok) return void toast.error(res.error ?? "Failed");
        const next = { ...equipped };
        delete next[item.kind];
        setEquipped(next);
        patchProfile({ equipped: next });
        toast.success(`Unequipped ${item.name}`);
      } else {
        const res = await equipItem(item.slug);
        if (!res.ok) return void toast.error(res.error ?? "Failed");
        const next = { ...equipped, [item.kind]: item.slug };
        setEquipped(next);
        patchProfile({ equipped: next });
        toast.success(`Equipped ${item.name}`);
      }
    });
  };

  const boosts = items.filter((i) => i.kind === "xp_boost" || i.kind === "credit_boost");
  const allCosmetics = items.filter((i) => EQUIPPABLE.has(i.kind) || i.kind === "collectible");

  const cosmetics = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeType = TYPE_FILTERS.find((t) => t.key === type)!;
    let list = allCosmetics.filter((i) => {
      if (activeType.kinds.length && !activeType.kinds.includes(i.kind)) return false;
      if (rarity !== "all" && i.rarity !== rarity) return false;
      if (q && !`${i.name} ${i.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "Name") return a.name.localeCompare(b.name);
      if (sort === "Rarity") return (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9);
      return new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime();
    });
    return list;
  }, [allCosmetics, query, type, rarity, sort]);

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">Your inventory is empty.</p>
        <a href="/shop" className="mt-1 text-sm font-medium text-primary hover:underline">
          Visit the shop →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {boosts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Active boosts</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {boosts.map((b) => {
              const active = b.expires_at && new Date(b.expires_at) > new Date();
              const multiplier = (b.preview as { multiplier?: number } | null)?.multiplier ?? 2;
              const isXp = b.kind === "xp_boost";
              return (
                <div
                  key={b.id}
                  className={cn(
                    "relative flex items-center gap-3 overflow-hidden rounded-xl border p-3",
                    active
                      ? cn(
                          "border-primary/40 bg-primary/5",
                          isXp ? "shadow-[0_0_16px_-4px] shadow-neon/50" : "shadow-[0_0_16px_-4px] shadow-gold/50",
                        )
                      : "border-border opacity-60",
                  )}
                >
                  {active && (
                    <span
                      className="pointer-events-none absolute -inset-y-4 -left-1/3 w-1/3 motion-safe:animate-sheen"
                      style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.18), transparent)" }}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "relative grid size-10 place-items-center rounded-lg",
                      isXp ? "bg-neon/15 text-neon" : "bg-gold/15 text-[oklch(0.55_0.13_85)] dark:text-gold",
                      active && "motion-safe:animate-glow-pulse",
                    )}
                    style={active ? { boxShadow: `0 0 14px ${isXp ? "rgba(34,211,238,0.55)" : "rgba(251,191,36,0.55)"}` } : undefined}
                  >
                    {isXp ? <Zap className="size-5" /> : <Coins className="size-5" />}
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {b.name}
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-bold text-primary">
                        {multiplier}×
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {active ? <BoostTimer expiresAt={b.expires_at!} /> : "Expired"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Cosmetics</h2>
          <div className="relative w-40 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-9 pl-8"
              aria-label="Search cosmetics"
            />
          </div>
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap items-center gap-2">
          {TYPE_FILTERS.map((t) => (
            <FilterChip key={t.key} active={type === t.key} onClick={() => setType(t.key)}>
              {t.label}
            </FilterChip>
          ))}
        </div>

        {/* Rarity + sort */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={rarity === "all"} onClick={() => setRarity("all")}>
            Any rarity
          </FilterChip>
          {(["common", "rare", "epic", "legendary"] as const).map((r) => (
            <FilterChip key={r} active={rarity === r} onClick={() => setRarity(r)}>
              {RARITY_META[r].label}
            </FilterChip>
          ))}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              aria-label="Sort cosmetics"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {cosmetics.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No cosmetics match those filters.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cosmetics.map((item) => {
              const meta = RARITY_META[item.rarity];
              const colors = item.preview?.colors ?? ["#8b5cf6", "#ec4899"];
              const isEquipped = equipped[item.kind] === item.slug;
              const canEquip = EQUIPPABLE.has(item.kind);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-card ring-1 transition-shadow",
                    meta.ring,
                    isEquipped && "ring-2 ring-primary",
                  )}
                >
                  <div
                    className="relative grid h-24 place-items-center"
                    style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})` }}
                  >
                    <div className="grid size-12 place-items-center rounded-xl bg-black/20 backdrop-blur-sm">
                      <DynamicIcon name={item.preview?.icon ?? "star"} className="size-6 text-white" />
                    </div>
                    {isEquipped && (
                      <Badge className="absolute right-1.5 top-1.5 border-none bg-primary text-primary-foreground">
                        <Check className="size-3" /> Applied
                      </Badge>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className={cn("truncate text-sm font-medium", meta.color)}>{item.name}</p>
                    <p className="text-[0.7rem] text-muted-foreground">{meta.label}</p>
                    {canEquip ? (
                      <Button
                        size="sm"
                        variant={isEquipped ? "secondary" : "outline"}
                        className="mt-2 w-full"
                        onClick={() => toggle(item)}
                        disabled={pending}
                      >
                        {isEquipped ? "Unequip" : "Equip"}
                      </Button>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Collectible</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
