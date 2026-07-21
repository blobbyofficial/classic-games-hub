"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart, X, Coins } from "lucide-react";
import { toast } from "sonner";
import { toggleWishlist } from "@/actions/economy";
import { DynamicIcon } from "@/components/dynamic-icon";
import { cn, formatNumber, RARITY_META } from "@/lib/utils";
import type { ShopItem } from "@/types";

export function WishlistSection({ items }: { items: ShopItem[] }) {
  const [list, setList] = useState(items);
  const [pending, start] = useTransition();

  if (list.length === 0) return null;

  const remove = (slug: string) => {
    setList((l) => l.filter((i) => i.slug !== slug));
    start(async () => {
      const res = await toggleWishlist(slug, false);
      if (!res.ok) toast.error(res.error ?? "Could not update wishlist");
    });
  };

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Heart className="size-4 text-rose-500" /> Wishlist
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((item) => {
          const meta = RARITY_META[item.rarity];
          const colors = item.preview?.colors ?? ["#8b5cf6", "#ec4899"];
          return (
            <div key={item.id} className={cn("relative overflow-hidden rounded-2xl border bg-card ring-1", meta.ring)}>
              <button
                onClick={() => remove(item.slug)}
                disabled={pending}
                aria-label={`Remove ${item.name} from wishlist`}
                className="absolute right-1.5 top-1.5 z-10 grid size-6 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
              >
                <X className="size-3.5" />
              </button>
              <Link href={`/shop/${item.slug}`}>
                <div
                  className="grid h-24 place-items-center"
                  style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})` }}
                >
                  <div className="grid size-12 place-items-center rounded-xl bg-black/20 backdrop-blur-sm">
                    <DynamicIcon name={item.preview?.icon ?? "star"} className="size-6 text-white" />
                  </div>
                </div>
                <div className="p-2.5">
                  <p className={cn("truncate text-sm font-medium", meta.color)}>{item.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Coins className="size-3" /> {formatNumber(item.price)}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
