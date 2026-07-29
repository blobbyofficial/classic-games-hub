"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Star, Lock } from "lucide-react";
import { toast } from "sonner";
import { adminToggleFeatured, adminSetGameStatus, adminSetEarlyAccess } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatNumber } from "@/lib/utils";
import type { Game } from "@/types";

export function GameAdminRow({ game }: { game: Game }) {
  const [featured, setFeatured] = useState(game.featured);
  const [status, setStatus] = useState(game.status);
  const [earlyUntil, setEarlyUntil] = useState<string | null>(game.early_access_until ?? null);
  const [pending, start] = useTransition();

  const earlyActive = Boolean(earlyUntil && new Date(earlyUntil) > new Date());

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

  /** Days, or 0 to open it to everyone now. */
  const setEarly = (days: string) =>
    start(async () => {
      if (days === "active") return; // display-only sentinel, not a change
      const res = await adminSetEarlyAccess(game.id, Number(days));
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      setEarlyUntil((res.until as string | null) ?? null);
      toast.success(Number(days) > 0 ? `Boosters only for ${days} days` : "Open to everyone");
    });

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
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
          {earlyActive && (
            <span className="text-[#f47fff]">
              {" "}
              · early access until {new Date(earlyUntil!).toLocaleDateString("en-GB")}
            </span>
          )}
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
      <Select value={earlyActive ? "active" : "0"} onValueChange={setEarly}>
        <SelectTrigger className="w-44" aria-label="Booster early access">
          <Lock className={cn("size-3.5", earlyActive ? "text-[#f47fff]" : "text-muted-foreground")} />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {/* Shown only while one is running, so the trigger has something to
              display; picking it again is a no-op. */}
          {earlyActive && <SelectItem value="active">Early access on</SelectItem>}
          <SelectItem value="0">Open to everyone</SelectItem>
          <SelectItem value="3">Boosters, 3 days</SelectItem>
          <SelectItem value="7">Boosters, 1 week</SelectItem>
          <SelectItem value="14">Boosters, 2 weeks</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
