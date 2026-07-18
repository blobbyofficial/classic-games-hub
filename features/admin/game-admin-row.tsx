"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { adminToggleFeatured, adminSetGameStatus } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatNumber } from "@/lib/utils";
import type { Game } from "@/types";

export function GameAdminRow({ game }: { game: Game }) {
  const [featured, setFeatured] = useState(game.featured);
  const [status, setStatus] = useState(game.status);
  const [pending, start] = useTransition();

  const toggleFeatured = () =>
    start(async () => {
      const res = await adminToggleFeatured(game.id, !featured);
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      setFeatured(!featured);
      toast.success(!featured ? "Featured" : "Unfeatured");
    });

  const changeStatus = (s: string) =>
    start(async () => {
      const res = await adminSetGameStatus(game.id, s as Game["status"]);
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      setStatus(s as Game["status"]);
      toast.success(`Status: ${s}`);
    });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <Image
        src={game.thumbnail_url ?? "/games/thumbs/snake.svg"}
        alt=""
        width={48}
        height={48}
        className="size-12 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{game.title}</p>
        <p className="text-xs text-muted-foreground">
          {game.category} · {formatNumber(game.play_count)} plays · {game.rating_count} ratings
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleFeatured}
        disabled={pending}
        aria-label="Toggle featured"
      >
        <Star className={cn("size-4", featured ? "fill-gold text-gold" : "text-muted-foreground")} />
      </Button>
      <Select value={status} onValueChange={changeStatus}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="coming_soon">Coming soon</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
