"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Gift, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";
import { giftItem } from "@/actions/economy";
import { DynamicIcon } from "@/components/dynamic-icon";
import { cn, formatNumber, RARITY_META } from "@/lib/utils";
import type { ShopItem } from "@/types";

/**
 * A player's wishlist on their profile. When viewed by someone else, each item
 * has a one-tap Gift button (charged at 75% of list price).
 */
export function ProfileWishlist({
  items,
  ownerId,
  ownerName,
  canGift,
}: {
  items: ShopItem[];
  ownerId: string;
  ownerName: string;
  canGift: boolean;
}) {
  const [gifted, setGifted] = useState<Set<string>>(new Set());
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [, start] = useTransition();

  if (items.length === 0) return null;

  const gift = (item: ShopItem) => {
    setPendingSlug(item.slug);
    start(async () => {
      const res = await giftItem(item.slug, ownerId);
      setPendingSlug(null);
      if (!res.ok) return void toast.error(res.error ?? "Could not gift");
      setGifted((s) => new Set(s).add(item.slug));
      toast.success(`Gifted ${item.name} to ${ownerName}! 🎁`);
    });
  };

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <Gift className="size-5 text-rose-500" /> Wishlist
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const meta = RARITY_META[item.rarity];
          const colors = item.preview?.colors ?? ["#8b5cf6", "#ec4899"];
          const giftPrice = Math.ceil(item.price * 0.75);
          const isGifted = gifted.has(item.slug);
          return (
            <div key={item.id} className={cn("overflow-hidden rounded-2xl border bg-card ring-1", meta.ring)}>
              <Link href={`/shop/${item.slug}`}>
                <div
                  className="grid h-20 place-items-center"
                  style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})` }}
                >
                  <div className="grid size-10 place-items-center rounded-xl bg-black/20 backdrop-blur-sm">
                    <DynamicIcon name={item.preview?.icon ?? "star"} className="size-5 text-white" />
                  </div>
                </div>
              </Link>
              <div className="space-y-1.5 p-2.5">
                <p className={cn("truncate text-sm font-medium", meta.color)}>{item.name}</p>
                {canGift ? (
                  isGifted ? (
                    <p className="text-xs font-medium text-success">Gifted ✓</p>
                  ) : (
                    <button
                      onClick={() => gift(item)}
                      disabled={pendingSlug === item.slug}
                      className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                    >
                      {pendingSlug === item.slug ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <>
                          <Gift className="size-3" /> Gift · <Coins className="size-3" /> {formatNumber(giftPrice)}
                        </>
                      )}
                    </button>
                  )
                ) : (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Coins className="size-3" /> {formatNumber(item.price)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
