"use client";

import { useState } from "react";
import { toast } from "sonner";
import { signInWithOAuth } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon, GitHubIcon, MicrosoftIcon, DiscordIcon } from "@/components/icons";

const PROVIDERS = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "discord", label: "Discord", Icon: DiscordIcon },
  { id: "github", label: "GitHub", Icon: GitHubIcon },
  { id: "azure", label: "Microsoft", Icon: MicrosoftIcon },
] as const;

export function OAuthButtons({ next }: { next?: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  const onClick = async (provider: (typeof PROVIDERS)[number]["id"]) => {
    setLoading(provider);
    const res = await signInWithOAuth(provider, next ?? "/");
    if (res?.error) {
      toast.error(res.error);
      setLoading(null);
    }
    // On success the action redirects, so no reset needed.
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {PROVIDERS.map(({ id, label, Icon }) => (
        <Button
          key={id}
          type="button"
          variant="outline"
          onClick={() => onClick(id)}
          disabled={loading !== null}
          className="h-11"
        >
          <Icon className="size-4" />
          {loading === id ? "Redirecting…" : label}
        </Button>
      ))}
    </div>
  );
}
