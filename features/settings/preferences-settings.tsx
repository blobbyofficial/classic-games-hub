"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { Sparkles, Eye, Bell, Zap, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "@/actions/profile";
import { useSessionStore } from "@/lib/stores/session-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserSettings } from "@/types";

function Row({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Eye;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function PreferencesSettings({ settings }: { settings: UserSettings }) {
  const { theme, setTheme } = useTheme();
  const patch = useSessionStore((s) => s.setSession);
  const store = useSessionStore.getState();
  const [local, setLocal] = useState(settings);
  const [, start] = useTransition();

  const update = (key: keyof UserSettings, value: unknown) => {
    setLocal((s) => ({ ...s, [key]: value }));
    start(async () => {
      const res = await updateSettings({ [key]: value });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        setLocal(settings);
      } else {
        patch({ userId: store.userId, profile: store.profile, settings: { ...local, [key]: value } as UserSettings });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance & accessibility</CardTitle>
          <CardDescription>Make the Hub comfortable for you.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          <Row icon={Sparkles} title="Theme" description="Light, dark or match your system.">
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row icon={Zap} title="Reduced motion" description="Minimize animations and transitions.">
            <Switch checked={local.reduced_motion} onCheckedChange={(v) => update("reduced_motion", v)} />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>Control who can reach you and what they see.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          <Row icon={Eye} title="Show online status" description="Let others see when you're active.">
            <Switch checked={local.show_online_status} onCheckedChange={(v) => update("show_online_status", v)} />
          </Row>
          <Row icon={Bell} title="Allow friend requests" description="Others can send you friend requests.">
            <Switch checked={local.allow_friend_requests} onCheckedChange={(v) => update("allow_friend_requests", v)} />
          </Row>
          <Row icon={MessageSquare} title="Direct messages" description="Who can start a conversation with you.">
            <Select value={local.allow_dms} onValueChange={(v) => update("allow_dms", v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="friends">Friends only</SelectItem>
                <SelectItem value="none">No one</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row icon={Bell} title="Email notifications" description="Receive occasional emails from the Hub.">
            <Switch checked={local.email_notifications} onCheckedChange={(v) => update("email_notifications", v)} />
          </Row>
        </CardContent>
      </Card>
    </div>
  );
}
