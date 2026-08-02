"use client";

import { useEffect, useState, useTransition } from "react";
import { Gift, Loader2, Search, Ticket } from "lucide-react";
import { toast } from "sonner";
import { giftItem, giftWithToken } from "@/actions/economy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { cn, formatNumber } from "@/lib/utils";
import type { ShopItem } from "@/types";

interface Friend {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function GiftDialog({ item, children }: { item: ShopItem; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Friend | null>(null);
  const [pending, start] = useTransition();
  // null while unknown; false once we know there is no usable token.
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const giftPrice = Math.ceil(item.price * 0.75);

  useEffect(() => {
    if (!open || friends) return;
    (async () => {
      // Only needed once the dialog is actually opened, so the Supabase client
      // loads on demand rather than sitting in the shop page's first load.
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      // Friends and the token status are both only needed once the dialog is
      // open, so they load together rather than as two waits.
      const [{ data }, { data: tokenData }] = await Promise.all([
        supabase.rpc("list_friends"),
        supabase.rpc("my_gift_token"),
      ]);
      const t = tokenData as { token?: { used?: boolean } | null } | null;
      setHasToken(Boolean(t?.token && !t.token.used));
      setFriends(
        (data ?? []).map((f) => ({
          user_id: f.user_id,
          username: f.username,
          display_name: f.display_name,
          avatar_url: f.avatar_url,
        })),
      );
    })();
  }, [open, friends]);

  const send = () => {
    if (!selected) return;
    start(async () => {
      const res = await giftItem(item.slug, selected.user_id);
      if (!res.ok) return void toast.error(res.error ?? "Could not send gift");
      toast.success(`Gifted ${item.name} to ${selected.display_name ?? selected.username}!`);
      setOpen(false);
      setSelected(null);
    });
  };

  /**
   * Spend the monthly booster token instead of credits. The gift is temporary,
   * so the button says so - a free permanent gift and a free 30-day one look
   * identical at the moment of sending, and only one of them is what happened.
   */
  const sendWithToken = () => {
    if (!selected) return;
    start(async () => {
      const res = await giftWithToken(item.slug, selected.user_id);
      if (!res.ok) return void toast.error(res.error ?? "Could not use your gift token");
      setHasToken(false);
      toast.success(`Sent ${item.name} to ${selected.display_name ?? selected.username} for 30 days!`);
      setOpen(false);
      setSelected(null);
    });
  };

  const filtered = (friends ?? []).filter((f) =>
    `${f.display_name ?? ""} ${f.username}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5 text-primary" /> Gift {item.name}
          </DialogTitle>
          <DialogDescription>
            Gifting costs <b>{formatNumber(giftPrice)}</b> credits - 25% off the list price. Pick a friend to surprise.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search friends…" className="pl-8" />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {friends === null ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {friends.length === 0 ? "Add some friends first to gift them items." : "No friends match that search."}
            </p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.user_id}
                onClick={() => setSelected(f)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  selected?.user_id === f.user_id ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-accent/50",
                )}
              >
                <UserAvatar src={f.avatar_url} name={f.display_name ?? f.username} className="size-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.display_name ?? f.username}</p>
                  <p className="truncate text-xs text-muted-foreground">@{f.username}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Button variant="gradient" className="w-full" disabled={!selected || pending} onClick={send}>
            {pending ? <Loader2 className="animate-spin" /> : <Gift />}
            {selected ? `Gift to ${selected.display_name ?? selected.username}` : "Pick a friend"}
          </Button>
          {hasToken && (
            <Button variant="secondary" className="w-full" disabled={!selected || pending} onClick={sendWithToken}>
              <Ticket className="size-4" />
              Use my booster token - free, 30 days
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
