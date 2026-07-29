"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Terminal, XCircle } from "lucide-react";
import { adminDiscordEnvStatus, adminRegisterSlashCommands } from "@/actions/admin";
import type { DiscordEnvStatus } from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackLine, type Feedback } from "./ui";

/**
 * Registering the commands, and what credentials this deployment has.
 *
 * Lives with the other syncing controls rather than buried in the settings
 * form: it is something you do once after a deploy, not a setting you tune.
 */

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

export function DiscordCommandsCard() {
  const [commandsState, setCommandsState] = useState<Feedback>(null);
  const [env, setEnv] = useState<DiscordEnvStatus | null>(null);
  const [pending, startTransition] = useTransition();

  // Checked on mount so a missing variable is visible before you press anything.
  useEffect(() => {
    void adminDiscordEnvStatus()
      .then(setEnv)
      .catch(() => setEnv(null));
  }, []);

  const registerCommands = () =>
    startTransition(async () => {
      setCommandsState({ message: "Registering with Discord…" });
      const res = await adminRegisterSlashCommands();
      setCommandsState(res.ok ? { message: res.detail ?? "Done." } : { error: res.error });
    });

  return (
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
  );
}
