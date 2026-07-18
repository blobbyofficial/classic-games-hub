"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { unblockUser } from "@/actions/social";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Blocked {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function BlockedUsers({ initial }: { initial: Blocked[] }) {
  const [blocked, setBlocked] = useState(initial);
  const [pending, start] = useTransition();

  const unblock = (u: Blocked) =>
    start(async () => {
      const res = await unblockUser(u.id);
      if (!res.ok) { toast.error(res.error ?? "Could not unblock"); return; }
      setBlocked((b) => b.filter((x) => x.id !== u.id));
      toast.success(`Unblocked @${u.username}`);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blocked players</CardTitle>
        <CardDescription>Blocked players can&apos;t message or friend you.</CardDescription>
      </CardHeader>
      <CardContent>
        {blocked.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t blocked anyone.</p>
        ) : (
          <ul className="space-y-2">
            {blocked.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                <UserAvatar src={u.avatar_url} name={u.display_name ?? u.username} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.display_name ?? u.username}</p>
                  <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => unblock(u)} disabled={pending}>
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
