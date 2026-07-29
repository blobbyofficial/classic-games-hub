"use client";

import { useState, useTransition } from "react";
import { Coins, Check, Loader2, Clock, ArrowLeft, Heart, Gift } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { purchaseItem, equipItem, unequipItem, toggleWishlist } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CosmeticPreview } from "./cosmetic-preview";
import { GiftDialog } from "./gift-dialog";
import { cn, formatNumber, RARITY_META } from "@/lib/utils";
import type { ShopItem } from "@/types";

const EQUIPPABLE = new Set(["avatar_frame", "profile_theme", "badge", "effect", "banner", "nameplate"]);
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

export function ShopItemDetail({
  item,
  owned,
  wishlisted = false,
}: {
  item: ShopItem;
  owned: boolean;
  wishlisted?: boolean;
}) {
  const [isOwned, setOwned] = useState(owned);
  const [onWishlist, setOnWishlist] = useState(wishlisted);
  const [pending, start] = useTransition();
  const profile = useSessionStore((s) => s.profile);
  const patchProfile = useSessionStore((s) => s.patchProfile);
  const userId = useSessionStore((s) => s.userId);
  const credits = profile?.credits ?? 0;

  const equipped = profile?.equipped ?? {};
  const isEquipped = equipped[item.kind] === item.slug;
  const canEquip = EQUIPPABLE.has(item.kind);
  const isBoost = item.kind === "xp_boost" || item.kind === "credit_boost";
  const canAfford = credits >= item.price;
  const meta = RARITY_META[item.rarity];

  const buy = () => {
    if (!userId) return void toast.error("Log in to buy items");
    start(async () => {
      const res = await purchaseItem(item.slug);
      if (!res.ok) return void toast.error(res.error ?? "Purchase failed");
      if (profile) patchProfile({ credits: profile.credits - item.price });
      if (!isBoost) setOwned(true);
      toast.success(`Purchased ${item.name}!`, {
        description: isBoost ? "Active for 24 hours" : "Apply it right here or from your inventory",
      });
    });
  };

  const wishlist = () => {
    if (!userId) return void toast.error("Log in to use your wishlist");
    const next = !onWishlist;
    setOnWishlist(next);
    start(async () => {
      const res = await toggleWishlist(item.slug, next);
      if (!res.ok) {
        setOnWishlist(!next);
        toast.error(res.error ?? "Could not update wishlist");
      } else {
        toast.success(next ? "Added to your wishlist" : "Removed from wishlist");
      }
    });
  };

  const apply = () => {
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to shop
      </Link>

      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        {/* Live preview */}
        <div className="space-y-3">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Live preview</p>
          <CosmeticPreview item={item} />
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{KIND_LABEL[item.kind] ?? item.kind}</Badge>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold ring-1", meta.color, meta.ring)}>
              {meta.label}
            </span>
            {item.seasonal && <Badge variant="neon">Seasonal</Badge>}
            {item.staff_only && <Badge className="border-none bg-rose-500/80 text-white">Staff only</Badge>}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
            {item.description && <p className="mt-1 text-muted-foreground">{item.description}</p>}
          </div>

          <div className="flex items-center gap-2 text-2xl font-bold text-[oklch(0.55_0.13_85)] dark:text-gold">
            <Coins className="size-6" /> {formatNumber(item.price)}
            <span className="text-sm font-normal text-muted-foreground">credits</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {!isOwned || isBoost ? (
              <Button variant={canAfford ? "gradient" : "outline"} onClick={buy} disabled={pending || !canAfford}>
                {pending ? <Loader2 className="animate-spin" /> : isBoost ? <Clock /> : <Coins />}
                {canAfford ? (isBoost ? "Buy boost" : "Buy") : "Not enough credits"}
              </Button>
            ) : (
              <Badge variant="secondary" className="h-10 px-4 text-sm">
                <Check className="size-4" /> Owned
              </Badge>
            )}

            {isOwned && canEquip && (
              <Button variant={isEquipped ? "secondary" : "outline"} onClick={apply} disabled={pending}>
                {isEquipped ? (
                  <>
                    <Check /> Applied - remove
                  </>
                ) : (
                  "Apply now"
                )}
              </Button>
            )}

            {userId && (
              <Button variant="outline" onClick={wishlist} disabled={pending} aria-pressed={onWishlist}>
                <Heart className={cn("size-4", onWishlist && "fill-current text-rose-500")} />
                {onWishlist ? "Wishlisted" : "Wishlist"}
              </Button>
            )}

            {userId && !isBoost && !item.staff_only && (
              <GiftDialog item={item}>
                <Button variant="outline">
                  <Gift /> Gift
                </Button>
              </GiftDialog>
            )}
          </div>

          {!userId && (
            <p className="text-sm text-muted-foreground">
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create an account
              </Link>{" "}
              to earn credits and buy this.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
