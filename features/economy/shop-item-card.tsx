"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Coins, Check, Loader2, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { purchaseItem, equipItem, unequipItem } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber, RARITY_META } from "@/lib/utils";
import type { ShopItem } from "@/types";

const EQUIPPABLE = new Set(["avatar_frame", "profile_theme", "badge", "effect", "banner", "nameplate", "decoration", "profile_frame", "entrance", "cursor_trail", "track"]);

const KIND_LABEL: Record<string, string> = {
  avatar_frame: "Avatar frame",
  profile_theme: "Profile theme",
  badge: "Badge",
  effect: "Effect",
  banner: "Banner",
  nameplate: "Nameplate",
  collectible: "Collectible",
  xp_boost: "XP boost",
  credit_boost: "Credit boost",
  track: "Music track",
  decoration: "Decoration",
  profile_frame: "Profile frame",
  entrance: "Entrance",
  cursor_trail: "Cursor trail",
};

export function ShopItemCard({ item, owned }: { item: ShopItem; owned: boolean }) {
  const [isOwned, setOwned] = useState(owned);
  const [pending, start] = useTransition();
  const credits = useSessionStore((s) => s.profile?.credits ?? 0);
  const setCredits = useSessionStore((s) => s.setCredits);
  const profile = useSessionStore((s) => s.profile);
  const patchProfile = useSessionStore((s) => s.patchProfile);
  const userId = useSessionStore((s) => s.userId);
  const rarity = RARITY_META[item.rarity];
  const colors = item.preview?.colors ?? ["#8b5cf6", "#ec4899"];
  const isBoost = item.kind === "xp_boost" || item.kind === "credit_boost";
  const canAfford = credits >= item.price;
  const levelLocked = (item.min_level ?? 0) > (profile?.level ?? 0);
  const canEquip = EQUIPPABLE.has(item.kind);
  const isEquipped = (profile?.equipped ?? {})[item.kind] === item.slug;

  const apply = () => {
    const equipped = profile?.equipped ?? {};
    start(async () => {
      if (isEquipped) {
        const res = await unequipItem(item.kind);
        if (!res.ok) return void toast.error(res.error ?? "Failed");
        const next = { ...equipped };
        delete next[item.kind];
        patchProfile({ equipped: next });
        toast.success(`Unequipped ${item.name}`);
      } else {
        const res = await equipItem(item.slug);
        if (!res.ok) return void toast.error(res.error ?? "Failed");
        patchProfile({ equipped: { ...equipped, [item.kind]: item.slug } });
        toast.success(`Equipped ${item.name}`);
      }
    });
  };

  const buy = () => {
    if (!userId) {
      toast.error("Log in to buy items");
      return;
    }
    start(async () => {
      const res = await purchaseItem(item.slug);
      if (!res.ok) {
        toast.error(res.error ?? "Purchase failed");
        return;
      }
      if (profile) setCredits(profile.credits - item.price);
      if (!isBoost) setOwned(true);
      toast.success(`Purchased ${item.name}!`, { description: isBoost ? "Active for 24 hours" : "Equip it from your inventory" });
    });
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transform-none",
        `ring-1 ${rarity.ring}`,
      )}
    >
      <Link
        href={`/shop/${item.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group/preview relative grid h-28 place-items-center"
        style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})` }}
        aria-label={`Preview ${item.name}`}
      >
        <div className="grid size-14 place-items-center rounded-2xl bg-black/20 backdrop-blur-sm">
          <DynamicIcon name={item.preview?.icon ?? kindIcon(item.kind)} className="size-7 text-white" />
        </div>
        <Badge className="absolute left-2 top-2 border-none bg-black/30 text-white backdrop-blur-sm">
          {rarity.label}
        </Badge>
        {item.seasonal && (
          <Badge className="absolute right-2 top-2 border-none bg-black/30 text-white backdrop-blur-sm">Seasonal</Badge>
        )}
        {item.staff_only && (
          <Badge className="absolute right-2 top-2 border-none bg-rose-500/80 text-white backdrop-blur-sm">Staff</Badge>
        )}
        {(item.min_level ?? 0) > 0 && !item.staff_only && (
          <Badge className="absolute right-2 top-2 border-none bg-black/30 text-white backdrop-blur-sm">
            Lv {item.min_level}+
          </Badge>
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover/preview:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-black">
            <Eye className="size-3.5" /> Preview
          </span>
        </span>
      </Link>
      <div className="p-3">
        <p className="text-xs text-muted-foreground">{KIND_LABEL[item.kind]}</p>
        <h3 className="truncate font-semibold">{item.name}</h3>
        <p className="mt-0.5 line-clamp-2 h-8 text-xs text-muted-foreground">{item.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 font-bold text-[oklch(0.55_0.13_85)] dark:text-gold">
            <Coins className="size-4" /> {formatNumber(item.price)}
          </span>
          {isOwned && !isBoost ? (
            canEquip ? (
              <Button
                size="sm"
                variant={isEquipped ? "secondary" : "outline"}
                onClick={apply}
                disabled={pending}
              >
                {isEquipped ? (
                  <>
                    <Check /> Applied
                  </>
                ) : (
                  "Apply"
                )}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled>
                <Check /> Owned
              </Button>
            )
          ) : (
            <Button
              size="sm"
              variant={canAfford && !levelLocked ? "gradient" : "outline"}
              onClick={buy}
              disabled={pending || !canAfford || levelLocked}
            >
              {pending ? <Loader2 className="animate-spin" /> : isBoost ? <Clock /> : null}
              {levelLocked ? `Lv ${item.min_level}+` : canAfford ? "Buy" : "Need more"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function kindIcon(kind: string): string {
  const map: Record<string, string> = {
    avatar_frame: "sparkles",
    profile_theme: "sparkles",
    badge: "award",
    effect: "sparkles",
    banner: "map",
    nameplate: "id-card",
    collectible: "gem",
    xp_boost: "rocket",
    credit_boost: "coins",
  };
  return map[kind] ?? "star";
}
