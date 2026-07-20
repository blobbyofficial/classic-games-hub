"use client";

import { useState, useTransition } from "react";
import { Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { equipItem, unequipItem } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, RARITY_META, timeAgo } from "@/lib/utils";
import type { OwnedItem } from "@/services/shop";

const EQUIPPABLE = new Set(["avatar_frame", "profile_theme", "badge", "effect", "banner", "nameplate"]);

export function InventoryGrid({ items }: { items: OwnedItem[] }) {
  const profile = useSessionStore((s) => s.profile);
  const patchProfile = useSessionStore((s) => s.patchProfile);
  const [equipped, setEquipped] = useState<Record<string, string>>(profile?.equipped ?? {});
  const [pending, start] = useTransition();

  const toggle = (item: OwnedItem) => {
    const isEquipped = equipped[item.kind] === item.slug;
    start(async () => {
      if (isEquipped) {
        const res = await unequipItem(item.kind);
        if (!res.ok) { toast.error(res.error ?? "Failed"); return; }
        const next = { ...equipped };
        delete next[item.kind];
        setEquipped(next);
        patchProfile({ equipped: next });
        toast.success(`Unequipped ${item.name}`);
      } else {
        const res = await equipItem(item.slug);
        if (!res.ok) { toast.error(res.error ?? "Failed"); return; }
        const next = { ...equipped, [item.kind]: item.slug };
        setEquipped(next);
        patchProfile({ equipped: next });
        toast.success(`Equipped ${item.name}`);
      }
    });
  };

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

  const boosts = items.filter((i) => i.kind === "xp_boost" || i.kind === "credit_boost");
  const cosmetics = items.filter((i) => EQUIPPABLE.has(i.kind) || i.kind === "collectible");

  return (
    <div className="space-y-6">
      {boosts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Active boosts</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {boosts.map((b) => {
              const active = b.expires_at && new Date(b.expires_at) > new Date();
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <DynamicIcon name={b.preview?.icon ?? "rocket"} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {active ? `Expires ${timeAgo(b.expires_at!)}` : "Expired"}
                    </p>
                  </div>
                  {active && (
                    <Badge variant="success">
                      <Clock className="size-3" /> Active
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Cosmetics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cosmetics.map((item) => {
            const rarity = RARITY_META[item.rarity];
            const colors = item.preview?.colors ?? ["#8b5cf6", "#ec4899"];
            const isEquipped = equipped[item.kind] === item.slug;
            const canEquip = EQUIPPABLE.has(item.kind);
            return (
              <div key={item.id} className={cn("overflow-hidden rounded-2xl border bg-card", `ring-1 ${rarity.ring}`)}>
                <div
                  className="grid h-24 place-items-center"
                  style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})` }}
                >
                  <div className="grid size-12 place-items-center rounded-xl bg-black/20 backdrop-blur-sm">
                    <DynamicIcon name={item.preview?.icon ?? "star"} className="size-6 text-white" />
                  </div>
                </div>
                <div className="p-2.5">
                  <p className={cn("truncate text-sm font-medium", rarity.color)}>{item.name}</p>
                  {canEquip ? (
                    <Button
                      size="sm"
                      variant={isEquipped ? "secondary" : "outline"}
                      className="mt-2 w-full"
                      onClick={() => toggle(item)}
                      disabled={pending}
                    >
                      {isEquipped ? (
                        <>
                          <Check /> Equipped
                        </>
                      ) : (
                        "Equip"
                      )}
                    </Button>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Collectible</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
