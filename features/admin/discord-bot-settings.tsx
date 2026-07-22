"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, RefreshCcw, Save } from "lucide-react";
import {
  adminRunFullRoleSync,
  adminSetBotLeveling,
  adminSetBotRoleSync,
} from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export interface LevelingConfig {
  enabled: boolean;
  xp_min: number;
  xp_max: number;
  cooldown_seconds: number;
  curve_quad: number;
  curve_linear: number;
  curve_base: number;
  announce_level_ups: boolean;
  announce_channel_id: string | null;
  no_xp_channel_ids: string[];
  hub_xp_share: number;
}

export interface RoleSyncConfig {
  enabled: boolean;
  role_map: Record<string, string>;
}

type Feedback = { error?: string; message?: string } | null;

function FeedbackLine({ state }: { state: Feedback }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="size-4" /> {state.error}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-success">
      <CheckCircle2 className="size-4" /> {state.message}
    </p>
  );
}

export function DiscordBotSettings({
  leveling: initialLeveling,
  roleSync: initialRoleSync,
}: {
  leveling: LevelingConfig;
  roleSync: RoleSyncConfig;
}) {
  const [leveling, setLeveling] = useState(initialLeveling);
  const [levelingState, setLevelingState] = useState<Feedback>(null);
  const [roleSyncEnabled, setRoleSyncEnabled] = useState(initialRoleSync.enabled);
  const [roleMapText, setRoleMapText] = useState(
    JSON.stringify(initialRoleSync.role_map, null, 2),
  );
  const [roleSyncState, setRoleSyncState] = useState<Feedback>(null);
  const [syncState, setSyncState] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  const num =
    (key: keyof LevelingConfig, float = false) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = float ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
      setLeveling((c) => ({ ...c, [key]: Number.isFinite(v) ? v : 0 }));
    };

  const saveLeveling = () =>
    startTransition(async () => {
      const res = await adminSetBotLeveling(leveling);
      setLevelingState(res.ok ? { message: "Leveling settings saved." } : { error: res.error });
    });

  const saveRoleSync = () =>
    startTransition(async () => {
      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(roleMapText || "{}");
      } catch {
        setRoleSyncState({ error: "The role map isn't valid JSON." });
        return;
      }
      const res = await adminSetBotRoleSync({ enabled: roleSyncEnabled, role_map: parsed });
      setRoleSyncState(res.ok ? { message: "Role sync settings saved." } : { error: res.error });
    });

  const runFullSync = () =>
    startTransition(async () => {
      setSyncState({ message: "Running…" });
      const res = await adminRunFullRoleSync();
      setSyncState(res.ok ? { message: res.detail ?? "Done." } : { error: res.error });
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Discord leveling</CardTitle>
          <CardDescription>
            Chat XP awarded in the Discord server. XP per counted message is random between min and
            max; the cooldown stops spam from farming XP. Levels use the curve
            «quad·n² + linear·n + base» XP per level (Arcane/MEE6-style defaults).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="lv-enabled"
              checked={leveling.enabled}
              onCheckedChange={(v) => setLeveling((c) => ({ ...c, enabled: v }))}
            />
            <Label htmlFor="lv-enabled">Leveling enabled</Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="xp-min">Min XP / message</Label>
              <Input id="xp-min" type="number" min={1} value={leveling.xp_min} onChange={num("xp_min")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="xp-max">Max XP / message</Label>
              <Input id="xp-max" type="number" min={1} value={leveling.xp_max} onChange={num("xp_max")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cooldown">Cooldown (seconds)</Label>
              <Input
                id="cooldown"
                type="number"
                min={5}
                value={leveling.cooldown_seconds}
                onChange={num("cooldown_seconds")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="curve-quad">Curve: quadratic</Label>
              <Input id="curve-quad" type="number" min={0} value={leveling.curve_quad} onChange={num("curve_quad")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="curve-linear">Curve: linear</Label>
              <Input
                id="curve-linear"
                type="number"
                min={0}
                value={leveling.curve_linear}
                onChange={num("curve_linear")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="curve-base">Curve: base</Label>
              <Input id="curve-base" type="number" min={1} value={leveling.curve_base} onChange={num("curve_base")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hub-share">Hub XP share (0–1)</Label>
              <Input
                id="hub-share"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={leveling.hub_xp_share}
                onChange={num("hub_xp_share", true)}
              />
              <p className="text-xs text-muted-foreground">
                Linked players also earn this fraction of each Discord XP gain as website XP. 0
                keeps the systems fully separate.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announce-channel">Level-up channel ID (optional)</Label>
              <Input
                id="announce-channel"
                placeholder="Announce in the message's channel when empty"
                value={leveling.announce_channel_id ?? ""}
                onChange={(e) =>
                  setLeveling((c) => ({ ...c, announce_channel_id: e.target.value.trim() || null }))
                }
              />
              <div className="flex items-center gap-3 pt-1">
                <Switch
                  id="announce"
                  checked={leveling.announce_level_ups}
                  onCheckedChange={(v) => setLeveling((c) => ({ ...c, announce_level_ups: v }))}
                />
                <Label htmlFor="announce">Announce level-ups</Label>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="no-xp">No-XP channel IDs (comma-separated)</Label>
            <Input
              id="no-xp"
              placeholder="e.g. 123456789012345678, 234567890123456789"
              value={leveling.no_xp_channel_ids.join(", ")}
              onChange={(e) =>
                setLeveling((c) => ({
                  ...c,
                  no_xp_channel_ids: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>
          <FeedbackLine state={levelingState} />
          <Button onClick={saveLeveling} disabled={pending} variant="gradient">
            <Save className="size-4" /> Save leveling
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role sync</CardTitle>
          <CardDescription>
            Maps Hub facts to Discord role IDs. Supported keys:{" "}
            <code>__linked__</code>, <code>__staff__</code>, <code>__admin__</code>,{" "}
            <code>__moderator__</code>, a badge or achievement slug,{" "}
            <code>nameplate-&lt;slug&gt;</code>, <code>hub-level-&lt;N&gt;</code>,{" "}
            <code>discord-level-&lt;N&gt;</code>. Only mapped roles are ever added or removed, and
            the website is always the source of truth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="rs-enabled" checked={roleSyncEnabled} onCheckedChange={setRoleSyncEnabled} />
            <Label htmlFor="rs-enabled">Role sync enabled</Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-map">Role map (JSON)</Label>
            <Textarea
              id="role-map"
              rows={8}
              className="font-mono text-xs"
              value={roleMapText}
              onChange={(e) => setRoleMapText(e.target.value)}
              placeholder={'{\n  "__linked__": "123456789012345678",\n  "__staff__": "234567890123456789",\n  "discord-level-10": "345678901234567890"\n}'}
            />
          </div>
          <FeedbackLine state={roleSyncState} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveRoleSync} disabled={pending} variant="gradient">
              <Save className="size-4" /> Save role sync
            </Button>
            <Button onClick={runFullSync} disabled={pending} variant="outline">
              <RefreshCcw className="size-4" /> Run full sync now
            </Button>
          </div>
          <FeedbackLine state={syncState} />
        </CardContent>
      </Card>
    </div>
  );
}
