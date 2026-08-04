"use client";

import { useState, useTransition } from "react";
import { PartyPopper, LogIn, Sparkles, Users2, Swords } from "lucide-react";
import { toast } from "sonner";
import { createParty, joinParty } from "@/actions/parties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Shown when you aren't in a party yet: start one, or join with a code. */
export function PartyStart({ onJoined }: { onJoined: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const res = await createParty(name);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't create the party");
        return;
      }
      toast.success(`Party created - code ${res.invite_code as string}`);
      onJoined();
    });

  const join = () =>
    start(async () => {
      const res = await joinParty(code);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't join that party");
        return;
      }
      toast.success("You're in!");
      setCode("");
      onJoined();
    });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <PartyPopper className="size-5" />
            </span>
            <h2 className="font-semibold">Start a party</h2>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="party-name">Name (optional)</Label>
            <Input
              id="party-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday night arcade"
              maxLength={60}
            />
          </div>
          <Button className="w-full" onClick={create} disabled={pending}>
            Create party
          </Button>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <LogIn className="size-5" />
            </span>
            <h2 className="font-semibold">Join a party</h2>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="party-code">Invite code</Label>
            <Input
              id="party-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && code.length === 6 && join()}
              placeholder="A1B2C3"
              maxLength={6}
              className="font-mono tracking-[0.3em] uppercase"
            />
          </div>
          <Button className="w-full" variant="outline" onClick={join} disabled={pending || code.length !== 6}>
            Join
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-dashed border-border p-5 sm:grid-cols-3">
        <Feature icon={<Users2 className="size-4" />} title="Up to 8 players">
          Invite friends by code or straight from your friends list. Everyone follows the leader between games.
        </Feature>
        <Feature icon={<Swords className="size-4" />} title="Head-to-head">
          Noughts and Crosses, Connect 4 and Reversi become real online matches on one shared board.
        </Feature>
        <Feature icon={<Sparkles className="size-4" />} title="Score races">
          Every other game turns into a race - same game, same moment, live scoreboard.
        </Feature>
      </div>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </p>
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  );
}
