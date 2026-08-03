"use client";

import { useConsent } from "@/components/providers/consent-provider";
import { Button } from "@/components/ui/button";

/**
 * The "change your mind" control, split out because the policy page around it
 * is a server component and this needs the consent context.
 *
 * Shows the current answer rather than only offering to reopen the banner: the
 * first question anyone arriving here wants answered is "what did I pick?", and
 * a bare button leaves them guessing.
 */
export function ConsentReopen() {
  const { choice, ready, reopen } = useConsent();
  if (!ready) return null;

  return (
    <p className="not-prose flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
      <span className="text-sm">
        {choice
          ? choice.analytics
            ? "Analytics is currently allowed."
            : "Analytics is currently refused."
          : "You have not answered yet."}
      </span>
      <Button size="sm" variant="outline" onClick={reopen}>
        {choice ? "Change my answer" : "Choose now"}
      </Button>
    </p>
  );
}
