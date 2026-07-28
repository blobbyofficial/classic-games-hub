"use client";

import { useState, useTransition } from "react";
import { Link2, Lock } from "lucide-react";
import { toast } from "sonner";
import { setVanitySlug } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE } from "@/lib/constants";
import type { Profile } from "@/types";

/**
 * Claim a vanity URL. Eligibility is re-checked server-side by
 * `set_vanity_slug`; showing the form to everyone and letting the RPC say no
 * would work, but the lock state explains *why* it's unavailable.
 */
export function VanityUrl({ profile }: { profile: Profile }) {
  const [slug, setSlug] = useState(profile.vanity_slug ?? "");
  const [saved, setSaved] = useState(profile.vanity_slug);
  const [pending, start] = useTransition();

  const eligible =
    profile.level >= 30 || profile.booster_since != null || profile.role === "admin" || profile.role === "moderator";

  const save = () =>
    start(async () => {
      const res = await setVanitySlug(slug);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't save that");
        return;
      }
      const next = (res.slug as string | null) ?? null;
      setSaved(next);
      setSlug(next ?? "");
      toast.success(next ? "Vanity URL saved" : "Vanity URL cleared");
    });

  const host = SITE.url.replace(/^https?:\/\//, "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-5 text-primary" /> Vanity URL
        </CardTitle>
        <CardDescription>
          A shorter, prettier link to your profile. Your username link keeps working either way.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {eligible ? (
          <>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">{host}/u/</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="your-name"
                maxLength={24}
                aria-label="Vanity URL"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              3–24 characters: letters, numbers, hyphens and underscores. Leave it empty to clear it.
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={save} disabled={pending || slug === (saved ?? "")}>
                {pending ? "Saving…" : "Save"}
              </Button>
              {saved && (
                <a
                  href={`/u/${saved}`}
                  className="text-sm font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {host}/u/{saved}
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" />
            Unlocks at level 30, or straight away by boosting the Discord server. You&apos;re level{" "}
            {profile.level}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
