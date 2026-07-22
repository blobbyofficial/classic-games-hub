"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, PartyPopper, Square } from "lucide-react";
import { adminCreateCommunityEvent, adminEndCommunityEvent } from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export interface AdminCommunityEvent {
  id: string;
  title: string;
  description: string | null;
  target: number;
  progress: number;
  credits_reward: number;
  starts_at: string;
  ends_at: string;
  completed_at: string | null;
}

export function CommunityEventManager({ events }: { events: AdminCommunityEvent[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState(500);
  const [reward, setReward] = useState(150);
  const [hours, setHours] = useState(72);
  const [state, setState] = useState<{ error?: string; message?: string } | null>(null);
  const [pending, start] = useTransition();

  const live = events.find((e) => !e.completed_at && new Date(e.ends_at) > new Date());

  const create = () =>
    start(async () => {
      const res = await adminCreateCommunityEvent({ title, description, target, reward, hours });
      setState(res.ok ? { message: "Event launched!" } : { error: res.error });
      if (res.ok) {
        setTitle("");
        setDescription("");
      }
    });

  const end = (id: string) =>
    start(async () => {
      const res = await adminEndCommunityEvent(id);
      setState(res.ok ? { message: "Event ended." } : { error: res.error });
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PartyPopper className="size-5 text-primary" /> Launch a community event
          </CardTitle>
          <CardDescription>
            A server-wide co-op goal — every scored play counts toward the target, and everyone who
            took part earns the reward when it lands. One live event at a time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                placeholder="e.g. Weekend Warriors — 500 games together"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ev-desc">Description (optional)</Label>
              <Textarea
                id="ev-desc"
                rows={2}
                placeholder="Rally the arcade…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-target">Target (plays)</Label>
              <Input id="ev-target" type="number" min={1} value={target} onChange={(e) => setTarget(parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-reward">Reward (credits each)</Label>
              <Input id="ev-reward" type="number" min={0} max={10000} value={reward} onChange={(e) => setReward(parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-hours">Duration (hours)</Label>
              <Input id="ev-hours" type="number" min={1} max={720} value={hours} onChange={(e) => setHours(parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>
          {state?.error && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </p>
          )}
          {state?.message && (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" /> {state.message}
            </p>
          )}
          <Button onClick={create} disabled={pending || Boolean(live)} variant="gradient">
            Launch event
          </Button>
          {live && (
            <p className="text-xs text-muted-foreground">
              An event is already live — end it before launching a new one.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
          {events.map((e) => {
            const isLive = !e.completed_at && new Date(e.ends_at) > new Date();
            const hit = e.progress >= e.target;
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {e.title}
                    {isLive ? (
                      <Badge variant="neon">Live</Badge>
                    ) : hit ? (
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Goal hit</Badge>
                    ) : (
                      <Badge variant="outline">Ended</Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(Math.min(e.progress, e.target))} / {formatNumber(e.target)} plays ·{" "}
                    {formatNumber(e.credits_reward)} credits each · ends {new Date(e.ends_at).toLocaleString()}
                  </p>
                </div>
                {isLive && (
                  <Button variant="outline" size="sm" onClick={() => end(e.id)} disabled={pending}>
                    <Square className="size-3.5" /> End now
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
