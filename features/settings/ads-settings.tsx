"use client";

import { useState, useTransition } from "react";
import { Sparkles, Coins } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "@/actions/profile";
import { useSessionStore } from "@/lib/stores/session-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { UserSettings } from "@/types";

export function AdsSettings({ settings, enabled }: { settings: UserSettings; enabled: boolean }) {
  const [ads, setAds] = useState(settings.ads_enabled);
  const [, start] = useTransition();
  const store = useSessionStore();

  const toggle = (v: boolean) => {
    setAds(v);
    start(async () => {
      const res = await updateSettings({ ads_enabled: v });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        setAds(!v);
        return;
      }
      if (store.settings) {
        store.setSession({ userId: store.userId, profile: store.profile, settings: { ...store.settings, ads_enabled: v } });
      }
      toast.success(v ? "2× credits enabled — thanks for the support!" : "Ads disabled");
    });
  };

  return (
    <Card className="overflow-hidden border-gold/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Rewarded ads</CardTitle>
          <Badge variant="gold">
            <Coins className="size-3" /> 2× credits
          </Badge>
        </div>
        <CardDescription>Always optional. Never intrusive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-gold/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-[oklch(0.6_0.13_85)] dark:text-gold" />
              <div>
                <p className="text-sm font-medium">Enable ads for 2× credits</p>
                <p className="text-xs text-muted-foreground">
                  When on, you&apos;ll occasionally see a short rewarded ad and earn double credits from games and
                  daily rewards. Turn it off any time — nothing here is pay-to-win.
                </p>
              </div>
            </div>
            <Switch checked={ads} onCheckedChange={toggle} disabled={!enabled} />
          </div>
        </div>
        {!enabled && (
          <p className="text-xs text-muted-foreground">The rewarded-ads program is currently paused by the team.</p>
        )}
      </CardContent>
    </Card>
  );
}
