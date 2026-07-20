"use client";

import { useState, useTransition } from "react";
import { Coins, Check, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { purchaseItem } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber, RARITY_META } from "@/lib/utils";
import type { ShopItem } from "@/types";

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
};

export function ShopItemCard({ item, owned }: { item: ShopItem; owned: boolean }) {
  const [isOwned, setOwned] = useState(owned);
  const [pending, start] = useTransition();
  const credits = useSessionStore((s) => s.profile?.credits ?? 0);
  const setCredits = useSessionStore((s) => s.setCredits);
  const profile = useSessionStore((s) => s.profile);
  const userId = useSessionStore((s) => s.userId);
  const rarity = RARITY_META[item.rarity];
  const colors = item.preview?.colors ?? ["#8b5cf6", "#ec4899"];
  const isBoost = item.kind === "xp_boost" || item.kind === "credit_boost";
  const canAfford = credits >= item.price;

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
    <motion.div
      whileHover={{ y: -3 }}
      className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm", `ring-1 ${rarity.ring}`)}
    >
      <div
        className="relative grid h-28 place-items-center"
        style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})` }}
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
      </div>
      <div className="p-3">
        <p className="text-xs text-muted-foreground">{KIND_LABEL[item.kind]}</p>
        <h3 className="truncate font-semibold">{item.name}</h3>
        <p className="mt-0.5 line-clamp-2 h-8 text-xs text-muted-foreground">{item.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 font-bold text-[oklch(0.55_0.13_85)] dark:text-gold">
            <Coins className="size-4" /> {formatNumber(item.price)}
          </span>
          {isOwned && !isBoost ? (
            <Button size="sm" variant="secondary" disabled>
              <Check /> Owned
            </Button>
          ) : (
            <Button size="sm" variant={canAfford ? "gradient" : "outline"} onClick={buy} disabled={pending || !canAfford}>
              {pending ? <Loader2 className="animate-spin" /> : isBoost ? <Clock /> : null}
              {canAfford ? "Buy" : "Need more"}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
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
