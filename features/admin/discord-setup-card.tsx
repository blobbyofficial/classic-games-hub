"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CircleDashed, Wand2, XCircle } from "lucide-react";
import { adminRunFullDiscordSetup } from "@/actions/admin";
import type { FullSetupResult, SetupStep } from "@/lib/discord/setup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeferredSpinner } from "@/components/ui/deferred";
import { cn } from "@/lib/utils";

/**
 * One button that sets the whole server up: commands, roles, counter channels
 * and panels.
 *
 * The result is a per-step report rather than a single success or failure,
 * because Discord setup fails in partial, unrelated ways - the bot can often
 * create roles but not post in a channel it cannot see. Telling an admin
 * "setup failed" when four of six steps worked sends them looking in the wrong
 * place; showing which step, and what Discord actually said, does not.
 */

const ICON: Record<SetupStep["status"], typeof CheckCircle2> = {
  ok: CheckCircle2,
  skipped: CircleDashed,
  failed: XCircle,
};

const TONE: Record<SetupStep["status"], string> = {
  ok: "text-success",
  skipped: "text-muted-foreground",
  failed: "text-destructive",
};

export function DiscordSetupCard() {
  const [result, setResult] = useState<FullSetupResult | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setResult(null);
      setResult(await adminRunFullDiscordSetup());
    });

  const done = result?.steps.filter((s) => s.status === "ok").length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set the server up</CardTitle>
        <CardDescription>
          Registers the slash commands, creates the verification and level roles and the live
          counter channels, and posts the panels - in one go. Everything it does is idempotent, so
          you can press it again after fixing a permission and it will only do what is still
          outstanding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={run} disabled={pending} variant="gradient">
          {pending ? <DeferredSpinner /> : <Wand2 className="size-4" />}
          {pending ? "Setting up…" : "Run full setup"}
        </Button>

        {result?.error && <p className="text-sm text-destructive">{result.error}</p>}

        {result && result.steps.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {done} of {result.steps.length} steps completed.
            </p>
            <ul className="space-y-2">
              {result.steps.map((step) => {
                const Icon = ICON[step.status];
                return (
                  <li key={step.key} className="flex items-start gap-2 text-sm">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[step.status])} />
                    <span className="min-w-0">
                      <b className="font-medium">{step.label}</b>
                      <span className="block text-xs text-muted-foreground">{step.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
