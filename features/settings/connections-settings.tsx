"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Link2, Unlink } from "lucide-react";
import {
  claimDiscordLinkCode,
  linkDiscordOAuth,
  unlinkDiscord,
  type DiscordActionState,
} from "@/actions/discord";
import { DiscordIcon } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface DiscordConnection {
  linked: boolean;
  via?: "oauth" | "code";
  discord_id?: string;
  discord_username?: string | null;
  discord_level?: number;
  discord_xp?: number;
}

function CodeSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Linking…" : "Link with code"}
    </Button>
  );
}

export function ConnectionsSettings({ connection }: { connection: DiscordConnection }) {
  const [codeState, codeAction] = useActionState<DiscordActionState, FormData>(
    claimDiscordLinkCode,
    null,
  );
  const [unlinkState, setUnlinkState] = useState<DiscordActionState>(null);
  const [oauthState, setOauthState] = useState<DiscordActionState>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleOAuthLink = () => {
    startTransition(async () => {
      // On success this redirects to Discord and never resolves.
      const res = await linkDiscordOAuth();
      if (res?.error) setOauthState(res);
    });
  };

  const handleUnlink = () => {
    startTransition(async () => {
      const res = await unlinkDiscord();
      setUnlinkState(res);
      setConfirming(false);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DiscordIcon className="size-5 text-[#5865F2]" /> Discord
        </CardTitle>
        <CardDescription>
          Link your Discord account to unlock groups, stories, custom banners, the Discord level
          system and role rewards in our server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {connection.linked ? (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="size-4 text-success" />
                  Linked{connection.discord_username ? ` as ${connection.discord_username}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {connection.via === "code"
                    ? "Linked with a /link code"
                    : "Linked through Discord sign-in"}
                  {typeof connection.discord_level === "number" && connection.discord_level > 0
                    ? ` · Discord level ${connection.discord_level}`
                    : ""}
                </span>
              </div>
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                Connected
              </Badge>
            </div>
            {confirming ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Unlink Discord? You may lose Discord-linked perks and server roles.
                </span>
                <Button variant="destructive" size="sm" onClick={handleUnlink} disabled={pending}>
                  {pending ? "Unlinking…" : "Yes, unlink"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
                <Unlink className="size-4" /> Unlink Discord
              </Button>
            )}
            {unlinkState?.error && (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="size-4" /> {unlinkState.error}
              </p>
            )}
            {unlinkState?.message && (
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="size-4" /> {unlinkState.message}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Button
                onClick={handleOAuthLink}
                disabled={pending}
                className="bg-[#5865F2] text-white hover:bg-[#4752c4]"
              >
                <DiscordIcon className="size-4" /> {pending ? "Redirecting…" : "Link with Discord"}
              </Button>
              {oauthState?.error && (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="size-4" /> {oauthState.error}
                </p>
              )}
            </div>
            <div className="space-y-2 border-t border-border/60 pt-4">
              <Label htmlFor="discord-code" className="flex items-center gap-2">
                <Link2 className="size-4" /> Or link with a code
              </Label>
              <p className="text-xs text-muted-foreground">
                Run <code className="rounded bg-muted px-1 py-0.5">/link</code> in our Discord
                server and enter the code it gives you.
              </p>
              <form action={codeAction} className="flex max-w-sm gap-2">
                <Input
                  id="discord-code"
                  name="code"
                  placeholder="e.g. 4F7A9C2B"
                  autoComplete="off"
                  maxLength={12}
                  required
                />
                <CodeSubmit />
              </form>
              {codeState?.error && (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="size-4" /> {codeState.error}
                </p>
              )}
              {codeState?.message && (
                <p className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="size-4" /> {codeState.message}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
