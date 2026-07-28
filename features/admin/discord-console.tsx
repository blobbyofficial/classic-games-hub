"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Hammer, Megaphone, RefreshCw, Trash2 } from "lucide-react";
import {
  adminAnnounce,
  adminModerate,
  adminPurge,
  adminPushAllBotSections,
  adminPushBotSection,
  adminSetChannelLock,
  adminSetSlowmode,
} from "@/actions/discord-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Runs the bot's commands from the dashboard.
 *
 * Each button calls the same function the matching slash command calls, so a
 * case opened here is numbered, DM'd and logged exactly as one opened in
 * Discord — there is no second implementation to drift.
 */

type Feedback = { error?: string; message?: string } | null;

function Line({ state }: { state: Feedback }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="flex items-start gap-2 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 text-sm text-success">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {state.message}
    </p>
  );
}

/** Discord IDs are long numbers; this is the hint people always need. */
function IdHint() {
  return (
    <p className="text-xs text-muted-foreground">
      Right-click in Discord → Copy ID. Needs Settings → Advanced → Developer Mode.
    </p>
  );
}

const PUSH_SECTIONS = [
  { key: "level_roles" as const, label: "Milestone roles" },
  { key: "verification" as const, label: "Verification" },
  { key: "tickets" as const, label: "Ticket panel" },
  { key: "stats" as const, label: "Counters" },
];

export function DiscordConsole() {
  return (
    <div className="space-y-6">
      <PushCard />
      <AnnounceCard />
      <ModerationCard />
      <ChannelCard />
    </div>
  );
}

function PushCard() {
  const [state, setState] = useState<Feedback>(null);
  const [pending, start] = useTransition();

  const pushAll = () =>
    start(async () => {
      setState({ message: "Pushing every section to Discord…" });
      const res = await adminPushAllBotSections();
      setState(
        res.ok
          ? { message: [res.detail, res.error && `Problems — ${res.error}`].filter(Boolean).join(" | ") }
          : { error: res.error },
      );
    });

  const pushOne = (key: (typeof PUSH_SECTIONS)[number]["key"], label: string) =>
    start(async () => {
      setState({ message: `Pushing ${label}…` });
      const res = await adminPushBotSection(key);
      setState(res.ok ? { message: `${label}: ${res.detail}` } : { error: res.error });
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push settings to Discord</CardTitle>
        <CardDescription>
          These push your <strong>last saved</strong> settings — if you have just typed an ID into a
          section below, press that section&apos;s Save instead, which saves and applies in one go.
          Use these to re-apply after someone edits roles by hand, or to repair the server once the
          bot is back online. All idempotent: existing roles and channels are reused, never
          duplicated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Line state={state} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={pushAll} disabled={pending} variant="gradient">
            <RefreshCw className="size-4" /> Push everything
          </Button>
          {PUSH_SECTIONS.map((s) => (
            <Button key={s.key} onClick={() => pushOne(s.key, s.label)} disabled={pending} variant="outline">
              {s.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AnnounceCard() {
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [pingRoleId, setPingRoleId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [plain, setPlain] = useState(false);
  const [state, setState] = useState<Feedback>(null);
  const [pending, start] = useTransition();

  const post = () =>
    start(async () => {
      const res = await adminAnnounce({ channelId, title, message, pingRoleId, imageUrl, plain });
      if (!res.ok) return setState({ error: res.error });
      setState({ message: res.detail ?? "Posted." });
      setMessage("");
      setImageUrl("");
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-4 text-primary" /> Announce
        </CardTitle>
        <CardDescription>
          The same as <code>/announce</code>. Pings are scoped to the role you pick, so a mention can
          never escape it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="an-channel">Channel ID</Label>
            <Input id="an-channel" value={channelId} onChange={(e) => setChannelId(e.target.value.trim())} placeholder="123456789012345678" />
            <IdHint />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="an-title">Title (optional)</Label>
            <Input id="an-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="📣 Announcement" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="an-message">Message</Label>
          <Textarea
            id="an-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="What's happening?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="an-ping">Ping role ID (optional)</Label>
            <Input id="an-ping" value={pingRoleId} onChange={(e) => setPingRoleId(e.target.value.trim())} placeholder="Leave empty for no ping" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="an-image">Image URL (optional)</Label>
            <Input id="an-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value.trim())} placeholder="https://…" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch id="an-plain" checked={plain} onCheckedChange={setPlain} />
          <Label htmlFor="an-plain">Post as plain text instead of an embed</Label>
        </div>

        <Line state={state} />
        <Button onClick={post} disabled={pending || !channelId || !message.trim()} variant="gradient">
          <Megaphone className="size-4" /> Post announcement
        </Button>
      </CardContent>
    </Card>
  );
}

const ACTIONS = [
  { value: "warn", label: "Warn" },
  { value: "timeout", label: "Timeout" },
  { value: "untimeout", label: "Remove timeout" },
  { value: "kick", label: "Kick" },
  { value: "ban", label: "Ban" },
  { value: "unban", label: "Unban" },
];

function ModerationCard() {
  const [action, setAction] = useState("warn");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState("10");
  const [state, setState] = useState<Feedback>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      const res = await adminModerate({
        action,
        targetId,
        reason,
        ...(action === "timeout" ? { minutes: Number(minutes) || 10 } : {}),
      });
      if (!res.ok) return setState({ error: res.error });
      setState({ message: res.detail ?? "Done." });
      setReason("");
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hammer className="size-4 text-primary" /> Moderation
        </CardTitle>
        <CardDescription>
          Opens a numbered case, DMs the member if that&apos;s switched on, and posts to your mod-log —
          identical to running the command in Discord. Recorded against your linked Discord account,
          so link it first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mod-target">Member ID</Label>
            <Input id="mod-target" value={targetId} onChange={(e) => setTargetId(e.target.value.trim())} placeholder="123456789012345678" />
            <IdHint />
          </div>
        </div>

        {action === "timeout" && (
          <div className="space-y-1.5 sm:max-w-48">
            <Label htmlFor="mod-minutes">Minutes</Label>
            <Input id="mod-minutes" type="number" min={1} max={40320} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="mod-reason">Reason</Label>
          <Input id="mod-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why?" />
        </div>

        <Line state={state} />
        <Button onClick={run} disabled={pending || !targetId} variant="destructive">
          <Hammer className="size-4" /> Run {ACTIONS.find((a) => a.value === action)?.label.toLowerCase()}
        </Button>
      </CardContent>
    </Card>
  );
}

function ChannelCard() {
  const [channelId, setChannelId] = useState("");
  const [count, setCount] = useState("10");
  const [seconds, setSeconds] = useState("0");
  const [state, setState] = useState<Feedback>(null);
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; error?: string; detail?: string }>, busy: string) =>
    start(async () => {
      setState({ message: busy });
      const res = await fn();
      setState(res.ok ? { message: res.detail ?? "Done." } : { error: res.error });
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="size-4 text-primary" /> Channel tools
        </CardTitle>
        <CardDescription>
          Purge, slowmode and lock. Discord won&apos;t bulk-delete messages older than 14 days, so a
          purge skips those.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ch-id">Channel ID</Label>
          <Input id="ch-id" value={channelId} onChange={(e) => setChannelId(e.target.value.trim())} placeholder="123456789012345678" />
          <IdHint />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ch-count">Messages to delete (1–100)</Label>
            <div className="flex gap-2">
              <Input id="ch-count" type="number" min={1} max={100} value={count} onChange={(e) => setCount(e.target.value)} />
              <Button
                variant="outline"
                disabled={pending || !channelId}
                onClick={() => act(() => adminPurge({ channelId, count: Number(count) || 10 }), "Deleting…")}
              >
                Purge
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-slow">Slowmode seconds (0 = off)</Label>
            <div className="flex gap-2">
              <Input id="ch-slow" type="number" min={0} max={21600} value={seconds} onChange={(e) => setSeconds(e.target.value)} />
              <Button
                variant="outline"
                disabled={pending || !channelId}
                onClick={() => act(() => adminSetSlowmode({ channelId, seconds: Number(seconds) || 0 }), "Setting…")}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>

        <Line state={state} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending || !channelId}
            onClick={() => act(() => adminSetChannelLock({ channelId, locked: true }), "Locking…")}
          >
            Lock channel
          </Button>
          <Button
            variant="outline"
            disabled={pending || !channelId}
            onClick={() => act(() => adminSetChannelLock({ channelId, locked: false }), "Unlocking…")}
          >
            Unlock channel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
