"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { adminSetSeasonalEvent } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeatureFlag } from "@/types";

function readString(payload: unknown, key: string, fallback = ""): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  return typeof p[key] === "string" ? (p[key] as string) : fallback;
}

function readNumber(payload: unknown, key: string, fallback: number): number {
  const p = (payload ?? {}) as Record<string, unknown>;
  const n = typeof p[key] === "number" ? p[key] : Number(p[key]);
  return Number.isFinite(n) ? (n as number) : fallback;
}

export function SeasonalEventEditor({ flag }: { flag: FeatureFlag }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(flag.enabled);
  const [multiplier, setMultiplier] = useState(String(readNumber(flag.payload, "multiplier", 2)));
  const [title, setTitle] = useState(readString(flag.payload, "title", "Double Credits Weekend"));
  const [message, setMessage] = useState(readString(flag.payload, "message"));
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await adminSetSeasonalEvent({
        enabled,
        multiplier,
        title,
        message,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success(enabled ? "Seasonal event live" : "Seasonal event saved");
      router.refresh();
    });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base">Seasonal event</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A site-wide credits multiplier and celebratory banner.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          {enabled ? "Live" : "Off"}
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={pending} />
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <div className="space-y-1.5">
            <Label>Credits ×</Label>
            <Input
              type="number"
              min={1}
              max={5}
              step={0.5}
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Earn 2× credits on every game - for a limited time!"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The multiplier stacks on top of personal boosts and applies to credits earned from games
          (clamped to 1–5×).
        </p>
        <div className="flex justify-end">
          <Button variant="gradient" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save event"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
