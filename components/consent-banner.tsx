"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { useConsent } from "@/components/providers/consent-provider";
import { Button } from "@/components/ui/button";

/**
 * The consent banner.
 *
 * Two things about it are deliberate and are the parts that matter legally, not
 * stylistically:
 *
 *  * **Reject is the same size, weight and prominence as Accept.** Consent has
 *    to be freely given, and a greyed-out "manage preferences" link next to a
 *    large glowing Accept is the pattern regulators single out. Here they are
 *    the same control twice, with different words.
 *
 *  * **Nothing optional runs while this is on screen.** The provider does not
 *    render the analytics components until a choice exists, so this is not a
 *    notice about something already happening - which is what a banner that
 *    says "by continuing to browse you accept" actually is.
 *
 * There is no dismiss-without-choosing affordance, because closing a banner is
 * not consent and treating it as such would defeat the point. It is not modal
 * either: the site stays fully usable behind it, since refusing must not cost
 * you anything.
 */
export function ConsentBanner() {
  const { choice, ready, save } = useConsent();

  // `ready` gates the first paint so a returning visitor never sees this flash
  // before the stored choice is read.
  if (!ready || choice) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-50 p-3 [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4"
    >
      <div className="glass mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border p-4 shadow-lg sm:flex-row sm:items-center sm:gap-4">
        <Cookie className="hidden size-6 shrink-0 text-primary sm:block" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Analytics, only if you say so</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            We use a few essential cookies to keep you signed in and remember this choice. We would
            also like anonymous analytics to see which games people play and how fast pages load.
            That part is entirely optional and off until you allow it.{" "}
            <Link href="/legal/cookies" className="underline underline-offset-2 hover:text-foreground">
              What we store
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => save(false)} className="flex-1 sm:flex-none">
            Reject
          </Button>
          <Button variant="gradient" onClick={() => save(true)} className="flex-1 sm:flex-none">
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}
