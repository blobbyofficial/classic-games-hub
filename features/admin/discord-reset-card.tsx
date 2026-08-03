"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { adminResetBotConfig } from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeferredSpinner } from "@/components/ui/deferred";
import { FeedbackLine as Line, type Feedback } from "./ui";

/**
 * Clears every bot setting back to its default.
 *
 * Confirmation is a second press rather than a dialog, because this page has no
 * dialog pattern and adding one for a single button would be the heavier
 * change. The button also *becomes* the confirmation - the destructive wording
 * only appears once you have already reached for it - so there is no way to
 * arrive at the second press without having read what it does.
 */
export function DiscordResetCard() {
  const [state, setState] = useState<Feedback>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const reset = () =>
    start(async () => {
      setState({ message: "Clearing every setting…" });
      const res = await adminResetBotConfig();
      setArmed(false);
      setState(res.ok ? { message: res.detail } : { error: res.error });
      // The settings tabs are server-rendered from the config that was just
      // deleted, so without this they keep showing ids that no longer exist.
      if (res.ok) router.refresh();
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset all settings</CardTitle>
        <CardDescription>
          Puts every section - verification, levelling, moderation, tickets, counters and milestone
          roles - back to its default, and clears every saved role, channel and panel ID. Useful
          when moving the bot to a different server, or when a half-finished setup left IDs pointing
          at channels that no longer exist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Nothing is deleted inside Discord. Roles and channels the bot created stay where they
            are, and so does any panel it posted - but the link to that panel is cleared, so the
            next full setup posts a fresh one rather than editing it. Delete the old panel by hand
            if you do not want two.
          </span>
        </p>

        {armed ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} disabled={pending} variant="destructive">
              {pending ? <DeferredSpinner /> : <RotateCcw className="size-4" />}
              {pending ? "Clearing…" : "Yes, clear every setting"}
            </Button>
            <Button onClick={() => setArmed(false)} disabled={pending} variant="outline">
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setArmed(true)} disabled={pending} variant="outline">
            <RotateCcw className="size-4" />
            Reset all settings
          </Button>
        )}

        <Line state={state} />
      </CardContent>
    </Card>
  );
}
