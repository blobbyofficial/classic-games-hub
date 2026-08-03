"use client";

import { useState, useTransition } from "react";
import { History, Megaphone, RefreshCw, Save } from "lucide-react";
import { adminSetBotSection } from "@/actions/admin";
import { adminSyncPublishing } from "@/actions/discord-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FeedbackLine, IdField, type Feedback } from "./ui";

/**
 * Mirroring the website into Discord: the update log, and announcements.
 *
 * One card rather than two, because the two halves share a switch, a pair of
 * channels and one idea - Discord shows what the website says, and the website
 * is what is true. Splitting them would have made "is this on?" a question
 * with two answers.
 */

export interface PublishingConfig {
  enabled: boolean;
  update_channel_id: string | null;
  announce_channel_id: string | null;
  update_ping_role_id: string | null;
  announce_ping_role_id: string | null;
  announce_on_publish: boolean;
  announce_limit: number;
}

export function DiscordPublishingCard({ publishing: initial }: { publishing: PublishingConfig }) {
  const [config, setConfig] = useState(initial);
  const [state, setState] = useState<Feedback>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof PublishingConfig>(key: K, value: PublishingConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const save = () =>
    start(async () => {
      setState({ message: "Saving and syncing to Discord…" });
      const res = await adminSetBotSection("publishing", config);
      if (!res.ok) return setState({ error: res.error });
      setState(res.warning ? { error: res.warning } : { message: res.detail ?? "Saved." });
    });

  const sync = (what: "releases" | "announcements" | "both", label: string) =>
    start(async () => {
      setState({ message: `Syncing ${label}…` });
      const res = await adminSyncPublishing(what);
      setState(
        res.ok
          ? { message: [res.detail, res.error && `Problems - ${res.error}`].filter(Boolean).join(" ") }
          : { error: res.error },
      );
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-primary" /> Publishing
        </CardTitle>
        <CardDescription>
          Mirrors the site&apos;s update log and its announcements into Discord. It is a mirror, not a
          copy: editing an announcement edits the Discord message, and unpublishing one removes it.
          Every message is fingerprinted, so syncing repeatedly is free and safe. Leave a channel
          empty to switch that half off - or run <strong>Full setup</strong>, which creates both.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <Switch
            id="pub-enabled"
            checked={config.enabled}
            onCheckedChange={(v) => set("enabled", v)}
          />
          <Label htmlFor="pub-enabled">Mirror to Discord</Label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <IdField
            id="pub-update-channel"
            label="Update-log channel"
            value={config.update_channel_id}
            onChange={(v) => set("update_channel_id", v)}
            hint="One message per release, oldest first."
          />
          <IdField
            id="pub-update-ping"
            label="Ping role for new releases (optional)"
            value={config.update_ping_role_id}
            onChange={(v) => set("update_ping_role_id", v)}
            hint="Only on a release Discord has not seen before - edits never ping."
          />
          <IdField
            id="pub-announce-channel"
            label="Announcements channel"
            value={config.announce_channel_id}
            onChange={(v) => set("announce_channel_id", v)}
            hint="Where published announcements appear."
          />
          <IdField
            id="pub-announce-ping"
            label="Ping role for announcements (optional)"
            value={config.announce_ping_role_id}
            onChange={(v) => set("announce_ping_role_id", v)}
            hint="Scoped to that role, so a mention can never escape it."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Switch
              id="pub-on-publish"
              checked={config.announce_on_publish}
              onCheckedChange={(v) => set("announce_on_publish", v)}
            />
            <Label htmlFor="pub-on-publish">Post announcements the moment they are published</Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pub-limit">Announcements kept in step</Label>
            <Input
              id="pub-limit"
              type="number"
              min={1}
              max={100}
              value={config.announce_limit}
              onChange={(e) => set("announce_limit", Math.trunc(Number(e.target.value)) || 1)}
            />
            <p className="text-xs text-muted-foreground">
              How far back a sync looks. Older messages are left where they are rather than deleted.
            </p>
          </div>
        </div>

        <FeedbackLine state={state} />

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={pending} variant="gradient">
            <Save className="size-4" /> Save and sync
          </Button>
          <Button onClick={() => sync("both", "everything")} disabled={pending} variant="outline">
            <RefreshCw className="size-4" /> Sync now
          </Button>
          <Button onClick={() => sync("releases", "the update log")} disabled={pending} variant="outline">
            <History className="size-4" /> Update log only
          </Button>
          <Button
            onClick={() => sync("announcements", "announcements")}
            disabled={pending}
            variant="outline"
          >
            <Megaphone className="size-4" /> Announcements only
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
