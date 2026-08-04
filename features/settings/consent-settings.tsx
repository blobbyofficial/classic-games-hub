"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { useConsent } from "@/components/providers/consent-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/**
 * Analytics consent, in the place people look for it.
 *
 * A switch rather than a "reopen the banner" button: withdrawing consent has to
 * be as easy as giving it, and one extra step between someone and turning
 * something off is exactly the friction the rule exists to prevent. Flipping
 * this writes a new consent record the same way the banner does.
 */
export function ConsentSettings() {
  const { choice, ready, save } = useConsent();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
        <CardDescription>
          Anonymous page views and load times, used to see which games people play and what is slow.
          Off unless you allow it, and never used for advertising.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Allow anonymous analytics</p>
              <p className="text-xs text-muted-foreground">
                {ready && !choice
                  ? "You have not answered yet - nothing optional is loading."
                  : "Takes effect on the next page you open."}{" "}
                <Link href="/legal/cookies" className="underline underline-offset-2">
                  What we store
                </Link>
                .
              </p>
            </div>
          </div>
          <Switch
            checked={Boolean(choice?.analytics)}
            disabled={!ready}
            onCheckedChange={(v) => save(v)}
            aria-label="Allow anonymous analytics"
          />
        </div>
      </CardContent>
    </Card>
  );
}
