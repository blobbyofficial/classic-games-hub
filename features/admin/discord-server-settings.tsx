"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, RefreshCcw, Save, Terminal, Wand2, XCircle } from "lucide-react";
import {
  adminCreateLevelRoles,
  adminDiscordEnvStatus,
  adminRefreshStatChannels,
  adminRegisterSlashCommands,
  adminSetBotSection,
} from "@/actions/admin";
import type { DiscordEnvStatus } from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/**
 * Admin surfaces for the bot features that replaced Appy, Sapphire, Arcane's
 * level rewards and ServerStats. Everything here is also settable from inside
 * Discord with `/setup …`; this page is for fine-tuning the wording, limits
 * and channel IDs afterwards.
 */

export interface VerificationConfig {
  enabled: boolean;
  mode: "button" | "captcha";
  verified_role_id: string | null;
  unverified_role_id: string | null;
  panel_channel_id: string | null;
  log_channel_id: string | null;
  min_account_age_hours: number;
  panel_title: string;
  panel_body: string;
  button_label: string;
  success_message: string;
  welcome_channel_id: string | null;
  welcome_message: string;
  dm_on_join: boolean;
  dm_message: string;
}

export interface ModerationConfig {
  log_channel_id: string | null;
  dm_on_action: boolean;
  automod: {
    enabled: boolean;
    block_invites: boolean;
    block_links: boolean;
    max_mentions: number;
    spam_messages: number;
    spam_window_seconds: number;
    action: "delete" | "timeout";
    timeout_minutes: number;
    exempt_role_ids: string[];
    exempt_channel_ids: string[];
  };
}

export interface TicketsConfig {
  enabled: boolean;
  category_id: string | null;
  staff_role_id: string | null;
  log_channel_id: string | null;
  panel_title: string;
  panel_body: string;
  button_label: string;
  open_message: string;
  max_open_per_user: number;
}

export interface StatsConfig {
  enabled: boolean;
  channels: { online: string | null; members: string | null; plays: string | null; discord_members: string | null };
  templates: { online: string; members: string; plays: string; discord_members: string };
}

export interface LevelRolesConfig {
  enabled: boolean;
  announce: boolean;
  remove_previous: boolean;
  milestones: number[];
  name_template: string;
  roles: Record<string, string>;
}

type Feedback = { error?: string; message?: string } | null;

function EnvRow({ ok, name, need }: { ok: boolean; name: string; need: string }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
      ) : (
        <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
      )}
      <span className="min-w-0">
        <code className="font-mono">{name}</code>
        {!ok && <span className="text-muted-foreground"> — missing; needed for {need}</span>}
      </span>
    </li>
  );
}

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

/** Snowflake input that stores "" as null. */
function IdField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="Discord ID"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.trim() || null)}
      />
      <p className="text-xs text-muted-foreground">
        {hint ? `${hint} ` : ""}
        Paste an ID to use that one — saving renames it to match these settings. Leave empty and one
        is created for you.
      </p>
    </div>
  );
}

export function DiscordServerSettings({
  verification: initialVerification,
  moderation: initialModeration,
  tickets: initialTickets,
  stats: initialStats,
  levelRoles: initialLevelRoles,
}: {
  verification: VerificationConfig;
  moderation: ModerationConfig;
  tickets: TicketsConfig;
  stats: StatsConfig;
  levelRoles: LevelRolesConfig;
}) {
  const [verification, setVerification] = useState(initialVerification);
  const [moderation, setModeration] = useState(initialModeration);
  const [tickets, setTickets] = useState(initialTickets);
  const [stats, setStats] = useState(initialStats);
  const [levelRoles, setLevelRoles] = useState(initialLevelRoles);

  const [verificationState, setVerificationState] = useState<Feedback>(null);
  const [moderationState, setModerationState] = useState<Feedback>(null);
  const [ticketsState, setTicketsState] = useState<Feedback>(null);
  const [statsState, setStatsState] = useState<Feedback>(null);
  const [levelRolesState, setLevelRolesState] = useState<Feedback>(null);
  const [commandsState, setCommandsState] = useState<Feedback>(null);
  const [env, setEnv] = useState<DiscordEnvStatus | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (
    section: "verification" | "moderation" | "tickets" | "stats" | "level_roles",
    value: unknown,
    setState: (f: Feedback) => void,
  ) =>
    startTransition(async () => {
      setState({ message: "Saving and applying to Discord…" });
      const res = await adminSetBotSection(section, value);
      if (!res.ok) return setState({ error: res.error });
      // A save always succeeds on its own; a failed push is a warning against
      // it, never a failure that leaves you wondering if your edit survived.
      setState(res.warning ? { error: res.warning } : { message: res.detail ?? "Saved." });
    });

  const createRoles = () =>
    startTransition(async () => {
      setLevelRolesState({ message: "Creating roles in Discord…" });
      const res = await adminCreateLevelRoles();
      setLevelRolesState(res.ok ? { message: res.detail ?? "Done." } : { error: res.error });
    });

  // Which credentials this deployment actually has. Checked on mount so a
  // missing variable is visible before you press anything.
  useEffect(() => {
    void adminDiscordEnvStatus().then(setEnv).catch(() => setEnv(null));
  }, []);

  const registerCommands = () =>
    startTransition(async () => {
      setCommandsState({ message: "Registering with Discord…" });
      const res = await adminRegisterSlashCommands();
      setCommandsState(res.ok ? { message: res.detail ?? "Done." } : { error: res.error });
    });

  const refreshCounters = () =>
    startTransition(async () => {
      setStatsState({ message: "Refreshing…" });
      const res = await adminRefreshStatChannels();
      setStatsState(res.ok ? { message: res.detail ?? "Done." } : { error: res.error });
    });

  return (
    <div className="space-y-6">
      {/* ── Slash commands ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Slash commands</CardTitle>
          <CardDescription>
            Discord only shows commands it has been told about. Press this after your first deploy,
            and again whenever the command set changes — it replaces the whole set, so pressing it
            twice is harmless.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {env && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Environment variables on this deployment
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                <EnvRow ok={env.botToken} name="DISCORD_BOT_TOKEN" need="registering commands" />
                <EnvRow ok={env.appId} name="DISCORD_CLIENT_ID" need="registering commands" />
                <EnvRow ok={env.publicKey} name="DISCORD_PUBLIC_KEY" need="the interactions endpoint" />
                <EnvRow ok={env.guildId} name="DISCORD_GUILD_ID" need="instant, server-only commands" />
                <EnvRow ok={env.cronSecret} name="CRON_SECRET" need="the scheduled jobs" />
              </ul>
              {!env.publicKey && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Without the public key, Discord can&apos;t verify the interactions endpoint and will
                  refuse to save the URL — the endpoint is right to reject an unsigned request.
                </p>
              )}
            </div>
          )}
          <FeedbackLine state={commandsState} />
          <Button onClick={registerCommands} disabled={pending} variant="gradient">
            <Terminal className="size-4" /> Register slash commands
          </Button>
        </CardContent>
      </Card>

      {/* ── Verification (replaces Appy) ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Join verification</CardTitle>
          <CardDescription>
            The gate new members pass through — replaces Appy. Run{" "}
            <code>/setup verification</code> in Discord to create the roles and post the panel;
            these fields fine-tune it afterwards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="vf-enabled"
                checked={verification.enabled}
                onCheckedChange={(v) => setVerification((c) => ({ ...c, enabled: v }))}
              />
              <Label htmlFor="vf-enabled">Verification enabled</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="vf-captcha"
                checked={verification.mode === "captcha"}
                onCheckedChange={(v) => setVerification((c) => ({ ...c, mode: v ? "captcha" : "button" }))}
              />
              <Label htmlFor="vf-captcha">Ask a maths question (captcha mode)</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="vf-dm"
                checked={verification.dm_on_join}
                onCheckedChange={(v) => setVerification((c) => ({ ...c, dm_on_join: v }))}
              />
              <Label htmlFor="vf-dm">DM new joiners</Label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <IdField
              id="vf-verified"
              label="Verified role ID"
              value={verification.verified_role_id}
              onChange={(v) => setVerification((c) => ({ ...c, verified_role_id: v }))}
            />
            <IdField
              id="vf-unverified"
              label="Unverified role ID"
              value={verification.unverified_role_id}
              onChange={(v) => setVerification((c) => ({ ...c, unverified_role_id: v }))}
              hint="Given on join, removed once they verify."
            />
            <IdField
              id="vf-panel"
              label="Panel channel ID"
              value={verification.panel_channel_id}
              onChange={(v) => setVerification((c) => ({ ...c, panel_channel_id: v }))}
            />
            <IdField
              id="vf-log"
              label="Verification log channel ID"
              value={verification.log_channel_id}
              onChange={(v) => setVerification((c) => ({ ...c, log_channel_id: v }))}
            />
            <IdField
              id="vf-welcome"
              label="Welcome channel ID"
              value={verification.welcome_channel_id}
              onChange={(v) => setVerification((c) => ({ ...c, welcome_channel_id: v }))}
            />
            <div className="space-y-1.5">
              <Label htmlFor="vf-age">Minimum account age (hours)</Label>
              <Input
                id="vf-age"
                type="number"
                min={0}
                value={verification.min_account_age_hours}
                onChange={(e) =>
                  setVerification((c) => ({
                    ...c,
                    min_account_age_hours: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Blocks brand-new throwaway accounts. 0 allows any account.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vf-title">Panel title</Label>
              <Input
                id="vf-title"
                value={verification.panel_title}
                onChange={(e) => setVerification((c) => ({ ...c, panel_title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vf-button">Button label</Label>
              <Input
                id="vf-button"
                value={verification.button_label}
                onChange={(e) => setVerification((c) => ({ ...c, button_label: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vf-body">Panel body</Label>
            <Textarea
              id="vf-body"
              rows={3}
              value={verification.panel_body}
              onChange={(e) => setVerification((c) => ({ ...c, panel_body: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vf-welcome-msg">Welcome message</Label>
            <Textarea
              id="vf-welcome-msg"
              rows={2}
              value={verification.welcome_message}
              onChange={(e) => setVerification((c) => ({ ...c, welcome_message: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Placeholders: <code>{"{user}"}</code>, <code>{"{username}"}</code>,{" "}
              <code>{"{server}"}</code>, <code>{"{count}"}</code>, <code>{"{site}"}</code>.
            </p>
          </div>

          <FeedbackLine state={verificationState} />
          <Button
            onClick={() => save("verification", verification, setVerificationState)}
            disabled={pending}
            variant="gradient"
          >
            <Save className="size-4" /> Save verification
          </Button>
        </CardContent>
      </Card>

      {/* ── Level milestone roles (replaces Arcane rewards) ─────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Level milestone roles</CardTitle>
          <CardDescription>
            Roles handed out automatically at each milestone level — the Arcane level-reward
            replacement. “Create missing roles” makes them in Discord for you and remembers their
            IDs; members see the ladder with <code>/rewards</code> and their progress with{" "}
            <code>/level</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="lr-enabled"
                checked={levelRoles.enabled}
                onCheckedChange={(v) => setLevelRoles((c) => ({ ...c, enabled: v }))}
              />
              <Label htmlFor="lr-enabled">Milestone roles enabled</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="lr-announce"
                checked={levelRoles.announce}
                onCheckedChange={(v) => setLevelRoles((c) => ({ ...c, announce: v }))}
              />
              <Label htmlFor="lr-announce">Mention the new role on level-up</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="lr-remove"
                checked={levelRoles.remove_previous}
                onCheckedChange={(v) => setLevelRoles((c) => ({ ...c, remove_previous: v }))}
              />
              <Label htmlFor="lr-remove">Keep only the highest role</Label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lr-milestones">Milestone levels (comma-separated)</Label>
              <Input
                id="lr-milestones"
                value={levelRoles.milestones.join(", ")}
                onChange={(e) =>
                  setLevelRoles((c) => ({
                    ...c,
                    milestones: e.target.value
                      .split(",")
                      .map((s) => Number.parseInt(s.trim(), 10))
                      .filter((n) => Number.isFinite(n) && n > 0),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lr-name">Role name template</Label>
              <Input
                id="lr-name"
                value={levelRoles.name_template}
                onChange={(e) => setLevelRoles((c) => ({ ...c, name_template: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                <code>{"{level}"}</code> is replaced with the milestone number.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Created roles</Label>
            <p className="text-xs text-muted-foreground">
              {Object.keys(levelRoles.roles).length === 0
                ? "None yet — press “Create missing roles”."
                : Object.entries(levelRoles.roles)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([level, id]) => `Lvl ${level} → ${id}`)
                    .join(" · ")}
            </p>
          </div>

          <FeedbackLine state={levelRolesState} />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => save("level_roles", levelRoles, setLevelRolesState)}
              disabled={pending}
              variant="gradient"
            >
              <Save className="size-4" /> Save milestones
            </Button>
            <Button onClick={createRoles} disabled={pending} variant="outline">
              <Wand2 className="size-4" /> Create missing roles
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Live counters (replaces ServerStats) ────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Live counter channels</CardTitle>
          <CardDescription>
            Voice channels renamed to live numbers — the ServerStats replacement. “Online” is how
            many players are active on the website right now. Discord rate-limits renames, so
            counters refresh about every 10 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="st-enabled"
              checked={stats.enabled}
              onCheckedChange={(v) => setStats((c) => ({ ...c, enabled: v }))}
            />
            <Label htmlFor="st-enabled">Counters enabled</Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["online", "Online players (website)"],
                ["members", "Registered players"],
                ["plays", "Plays today"],
                ["discord_members", "Discord members"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-3 rounded-lg border p-3">
                <IdField
                  id={`st-${key}`}
                  label={`${label} — channel ID`}
                  value={stats.channels[key]}
                  onChange={(v) => setStats((c) => ({ ...c, channels: { ...c.channels, [key]: v } }))}
                />
                <div className="space-y-1.5">
                  <Label htmlFor={`st-${key}-tpl`}>Name template</Label>
                  <Input
                    id={`st-${key}-tpl`}
                    value={stats.templates[key]}
                    onChange={(e) =>
                      setStats((c) => ({ ...c, templates: { ...c.templates, [key]: e.target.value } }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Placeholders: <code>{"{online}"}</code>, <code>{"{members}"}</code>,{" "}
            <code>{"{plays}"}</code>, <code>{"{plays_total}"}</code>, <code>{"{linked}"}</code>,{" "}
            <code>{"{discord_members}"}</code>.
          </p>
          <FeedbackLine state={statsState} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save("stats", stats, setStatsState)} disabled={pending} variant="gradient">
              <Save className="size-4" /> Save counters
            </Button>
            <Button onClick={refreshCounters} disabled={pending} variant="outline">
              <RefreshCcw className="size-4" /> Refresh now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Tickets (replaces Sapphire) ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Support tickets</CardTitle>
          <CardDescription>
            Private ticket channels opened from a panel button or <code>/ticket</code>, closed with{" "}
            <code>/close</code>. Transcripts are posted to the log channel before the ticket
            channel is deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="tk-enabled"
              checked={tickets.enabled}
              onCheckedChange={(v) => setTickets((c) => ({ ...c, enabled: v }))}
            />
            <Label htmlFor="tk-enabled">Tickets enabled</Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <IdField
              id="tk-category"
              label="Ticket category ID"
              value={tickets.category_id}
              onChange={(v) => setTickets((c) => ({ ...c, category_id: v }))}
            />
            <IdField
              id="tk-staff"
              label="Staff role ID"
              value={tickets.staff_role_id}
              onChange={(v) => setTickets((c) => ({ ...c, staff_role_id: v }))}
              hint="This role can see and reply to every ticket."
            />
            <IdField
              id="tk-log"
              label="Transcript log channel ID"
              value={tickets.log_channel_id}
              onChange={(v) => setTickets((c) => ({ ...c, log_channel_id: v }))}
            />
            <div className="space-y-1.5">
              <Label htmlFor="tk-max">Max open tickets per member</Label>
              <Input
                id="tk-max"
                type="number"
                min={0}
                value={tickets.max_open_per_user}
                onChange={(e) =>
                  setTickets((c) => ({
                    ...c,
                    max_open_per_user: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tk-title">Panel title</Label>
              <Input
                id="tk-title"
                value={tickets.panel_title}
                onChange={(e) => setTickets((c) => ({ ...c, panel_title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tk-button">Button label</Label>
              <Input
                id="tk-button"
                value={tickets.button_label}
                onChange={(e) => setTickets((c) => ({ ...c, button_label: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tk-open">First message in a new ticket</Label>
            <Textarea
              id="tk-open"
              rows={2}
              value={tickets.open_message}
              onChange={(e) => setTickets((c) => ({ ...c, open_message: e.target.value }))}
            />
          </div>
          <FeedbackLine state={ticketsState} />
          <Button
            onClick={() => save("tickets", tickets, setTicketsState)}
            disabled={pending}
            variant="gradient"
          >
            <Save className="size-4" /> Save tickets
          </Button>
        </CardContent>
      </Card>

      {/* ── Moderation & automod (replaces Sapphire) ────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation</CardTitle>
          <CardDescription>
            Case logging for <code>/warn</code>, <code>/timeout</code>, <code>/kick</code>,{" "}
            <code>/ban</code> and friends, plus optional automod. Every action is numbered and
            visible with <code>/warnings</code> and in the website audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <IdField
              id="md-log"
              label="Mod-log channel ID"
              value={moderation.log_channel_id}
              onChange={(v) => setModeration((c) => ({ ...c, log_channel_id: v }))}
            />
            <div className="flex items-center gap-3 pt-7">
              <Switch
                id="md-dm"
                checked={moderation.dm_on_action}
                onCheckedChange={(v) => setModeration((c) => ({ ...c, dm_on_action: v }))}
              />
              <Label htmlFor="md-dm">DM members when actioned</Label>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  id="am-enabled"
                  checked={moderation.automod.enabled}
                  onCheckedChange={(v) =>
                    setModeration((c) => ({ ...c, automod: { ...c.automod, enabled: v } }))
                  }
                />
                <Label htmlFor="am-enabled">Automod enabled</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="am-invites"
                  checked={moderation.automod.block_invites}
                  onCheckedChange={(v) =>
                    setModeration((c) => ({ ...c, automod: { ...c.automod, block_invites: v } }))
                  }
                />
                <Label htmlFor="am-invites">Block Discord invites</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="am-links"
                  checked={moderation.automod.block_links}
                  onCheckedChange={(v) =>
                    setModeration((c) => ({ ...c, automod: { ...c.automod, block_links: v } }))
                  }
                />
                <Label htmlFor="am-links">Block all links</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="am-action"
                  checked={moderation.automod.action === "timeout"}
                  onCheckedChange={(v) =>
                    setModeration((c) => ({
                      ...c,
                      automod: { ...c.automod, action: v ? "timeout" : "delete" },
                    }))
                  }
                />
                <Label htmlFor="am-action">Time out offenders (not just delete)</Label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="am-mentions">Max mentions</Label>
                <Input
                  id="am-mentions"
                  type="number"
                  min={0}
                  value={moderation.automod.max_mentions}
                  onChange={(e) =>
                    setModeration((c) => ({
                      ...c,
                      automod: { ...c.automod, max_mentions: Number.parseInt(e.target.value, 10) || 0 },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-spam">Flood: messages</Label>
                <Input
                  id="am-spam"
                  type="number"
                  min={0}
                  value={moderation.automod.spam_messages}
                  onChange={(e) =>
                    setModeration((c) => ({
                      ...c,
                      automod: { ...c.automod, spam_messages: Number.parseInt(e.target.value, 10) || 0 },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-window">Flood: seconds</Label>
                <Input
                  id="am-window"
                  type="number"
                  min={1}
                  value={moderation.automod.spam_window_seconds}
                  onChange={(e) =>
                    setModeration((c) => ({
                      ...c,
                      automod: {
                        ...c.automod,
                        spam_window_seconds: Number.parseInt(e.target.value, 10) || 1,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-timeout">Timeout minutes</Label>
                <Input
                  id="am-timeout"
                  type="number"
                  min={1}
                  value={moderation.automod.timeout_minutes}
                  onChange={(e) =>
                    setModeration((c) => ({
                      ...c,
                      automod: {
                        ...c.automod,
                        timeout_minutes: Number.parseInt(e.target.value, 10) || 1,
                      },
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="am-exempt-roles">Exempt role IDs (comma-separated)</Label>
                <Input
                  id="am-exempt-roles"
                  value={moderation.automod.exempt_role_ids.join(", ")}
                  onChange={(e) =>
                    setModeration((c) => ({
                      ...c,
                      automod: {
                        ...c.automod,
                        exempt_role_ids: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-exempt-channels">Exempt channel IDs (comma-separated)</Label>
                <Input
                  id="am-exempt-channels"
                  value={moderation.automod.exempt_channel_ids.join(", ")}
                  onChange={(e) =>
                    setModeration((c) => ({
                      ...c,
                      automod: {
                        ...c.automod,
                        exempt_channel_ids: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Automod runs in the companion worker. Invite/link rules need the{" "}
              <strong>Message Content</strong> intent enabled in the Developer Portal; mention and
              flood rules work without it. Members with Manage Messages are always exempt.
            </p>
          </div>

          <FeedbackLine state={moderationState} />
          <Button
            onClick={() => save("moderation", moderation, setModerationState)}
            disabled={pending}
            variant="gradient"
          >
            <Save className="size-4" /> Save moderation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
