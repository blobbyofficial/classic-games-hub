"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { adminSetBotSection } from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FeedbackLine, IdField, type Feedback } from "./ui";

/**
 * Server audit logging.
 *
 * The settings that matter here are the *routing* and the *ignores*, not the
 * on switch: a log everybody mutes is worth nothing, and what makes people
 * mute one is a single channel carrying four hundred message edits a day next
 * to the one role change they needed to find. So the events are grouped into
 * five categories, each of which can have its own channel, and each individual
 * event can be switched off once you can see how loud it actually is.
 */

export interface LoggingConfig {
  enabled: boolean;
  channel_id: string | null;
  channels: {
    messages: string | null;
    members: string | null;
    server: string | null;
    voice: string | null;
    moderation: string | null;
  };
  events: Record<string, boolean>;
  ignored_channel_ids: string[];
  ignored_role_ids: string[];
  ignored_user_ids: string[];
  ignore_bots: boolean;
  include_content: boolean;
}

type Category = keyof LoggingConfig["channels"];

/** Every event, in the order it is worth reading, grouped by its channel. */
const GROUPS: { category: Category; label: string; hint: string; events: [string, string][] }[] = [
  {
    category: "messages",
    label: "Messages",
    hint: "The loudest category by a distance. Give it its own channel.",
    events: [
      ["message_delete", "Message deleted"],
      ["message_edit", "Message edited"],
      ["message_bulk_delete", "Messages purged in bulk"],
    ],
  },
  {
    category: "members",
    label: "Members",
    events: [
      ["member_join", "Joined"],
      ["member_leave", "Left or was kicked"],
      ["member_nickname", "Nickname changed"],
      ["member_roles", "Roles added or removed"],
    ],
    hint: "Arrivals, departures and who gave whom which role.",
  },
  {
    category: "moderation",
    label: "Moderation",
    hint: "Actions taken on a person - including ones taken outside the bot.",
    events: [
      ["member_timeout", "Timed out / timeout lifted"],
      ["member_ban", "Banned"],
      ["member_unban", "Unbanned"],
    ],
  },
  {
    category: "server",
    label: "Server structure",
    hint: "The entries you go looking for weeks later. Worth keeping quiet and complete.",
    events: [
      ["channel_create", "Channel created"],
      ["channel_update", "Channel renamed, moved or re-permissioned"],
      ["channel_delete", "Channel deleted"],
      ["thread_create", "Thread created"],
      ["thread_delete", "Thread deleted"],
      ["role_create", "Role created"],
      ["role_update", "Role renamed, recoloured or re-permissioned"],
      ["role_delete", "Role deleted"],
      ["emoji_update", "Emoji added, renamed or removed"],
      ["sticker_update", "Sticker added, renamed or removed"],
      ["invite_create", "Invite created"],
      ["invite_delete", "Invite deleted"],
      ["webhook_update", "Webhooks changed"],
      ["server_update", "Server settings changed"],
    ],
  },
  {
    category: "voice",
    label: "Voice",
    hint: "Off by default in most servers' judgement - it is chatty and rarely re-read.",
    events: [
      ["voice_join", "Joined a voice channel"],
      ["voice_leave", "Left a voice channel"],
      ["voice_move", "Moved between voice channels"],
    ],
  },
];

const CATEGORY_HINT: Record<Category, string> = {
  messages: "Deletes and edits.",
  members: "Joins, leaves, nicknames, roles.",
  server: "Channels, roles, emoji, invites, webhooks.",
  voice: "Voice joins, leaves and moves.",
  moderation: "Bans, kicks, timeouts.",
};

const idList = (value: string) =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function DiscordLoggingCard({ logging: initial }: { logging: LoggingConfig }) {
  const [logging, setLogging] = useState(initial);
  const [state, setState] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setState({ message: "Saving…" });
      const res = await adminSetBotSection("logging", logging);
      setState(
        res.ok
          ? {
              message:
                "Saved. The worker picks new settings up within a minute - no restart needed.",
            }
          : { error: res.error },
      );
    });

  const setEvent = (key: string, on: boolean) =>
    setLogging((c) => ({ ...c, events: { ...c.events, [key]: on } }));

  const setChannel = (category: Category, value: string | null) =>
    setLogging((c) => ({ ...c, channels: { ...c.channels, [category]: value } }));

  /** Flips a whole category at once - the switch people actually reach for. */
  const setGroup = (events: [string, string][], on: boolean) =>
    setLogging((c) => ({
      ...c,
      events: { ...c.events, ...Object.fromEntries(events.map(([key]) => [key, on])) },
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server logs</CardTitle>
        <CardDescription>
          Every change in the server, written to a channel: messages deleted and edited, channels and
          roles created, renamed and deleted, members joining, leaving, renamed or given roles, bans,
          timeouts, emoji, invites, webhooks and voice. Each entry names who did it, read from
          Discord&apos;s audit log. Needs the companion worker running, and the{" "}
          <strong>View Audit Log</strong> permission for the &quot;who&quot; half.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Switch
              id="log-enabled"
              checked={logging.enabled}
              onCheckedChange={(v) => setLogging((c) => ({ ...c, enabled: v }))}
            />
            <Label htmlFor="log-enabled">Logging enabled</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="log-content"
              checked={logging.include_content}
              onCheckedChange={(v) => setLogging((c) => ({ ...c, include_content: v }))}
            />
            <Label htmlFor="log-content">Quote deleted and edited message text</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="log-bots"
              checked={logging.ignore_bots}
              onCheckedChange={(v) => setLogging((c) => ({ ...c, ignore_bots: v }))}
            />
            <Label htmlFor="log-bots">Ignore bots</Label>
          </div>
        </div>

        <div className="space-y-4">
          <IdField
            id="log-channel"
            label="Log channel ID"
            value={logging.channel_id}
            onChange={(v) => setLogging((c) => ({ ...c, channel_id: v }))}
            hint="Everything goes here unless a category below has its own channel."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(logging.channels) as Category[]).map((category) => (
              <IdField
                key={category}
                id={`log-ch-${category}`}
                label={`${category[0].toUpperCase()}${category.slice(1)} channel ID (optional)`}
                value={logging.channels[category]}
                onChange={(v) => setChannel(category, v)}
                hint={CATEGORY_HINT[category]}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {GROUPS.map((group) => (
            <div key={group.category} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{group.label}</p>
                  <p className="text-xs text-muted-foreground">{group.hint}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setGroup(group.events, true)}>
                    All on
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setGroup(group.events, false)}>
                    All off
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {group.events.map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <Switch
                      id={`log-ev-${key}`}
                      checked={logging.events[key] !== false}
                      onCheckedChange={(v) => setEvent(key, v)}
                    />
                    <Label htmlFor={`log-ev-${key}`} className="text-sm font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="log-ignore-channels">Ignored channel IDs</Label>
            <Input
              id="log-ignore-channels"
              value={logging.ignored_channel_ids.join(", ")}
              onChange={(e) => setLogging((c) => ({ ...c, ignored_channel_ids: idList(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-ignore-roles">Ignored role IDs</Label>
            <Input
              id="log-ignore-roles"
              value={logging.ignored_role_ids.join(", ")}
              onChange={(e) => setLogging((c) => ({ ...c, ignored_role_ids: idList(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-ignore-users">Ignored user IDs</Label>
            <Input
              id="log-ignore-users"
              value={logging.ignored_user_ids.join(", ")}
              onChange={(e) => setLogging((c) => ({ ...c, ignored_user_ids: idList(e.target.value) }))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Comma-separated. A channel deletion is logged even when the channel is ignored - hiding that
          is the one thing an ignore list should never do.
        </p>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            <Save className="size-4" /> Save logging
          </Button>
          <FeedbackLine state={state} />
        </div>
      </CardContent>
    </Card>
  );
}
