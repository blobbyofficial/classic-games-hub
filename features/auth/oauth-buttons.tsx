"use client";

import { useState } from "react";
import { toast } from "sonner";
import { signInWithOAuth } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { DiscordIcon } from "@/components/icons";

export function OAuthButtons({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const res = await signInWithOAuth("discord", next ?? "/");
    if (res?.error) {
      toast.error(res.error);
      setLoading(false);
    }
    // On success the action redirects, so no reset needed.
  };

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="h-12 w-full bg-[#5865F2] text-white hover:bg-[#4752c4]"
    >
      <DiscordIcon className="size-5" />
      {loading ? "Redirecting…" : "Continue with Discord"}
    </Button>
  );
}
