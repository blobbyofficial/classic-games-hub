"use client";

import { useState, useTransition } from "react";
import { Copy, Crown, DoorOpen, Play, Swords, UserMinus, Users2, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { kickFromParty, leaveParty, setPartyGame } from "@/actions/parties";
import { HEAD_TO_HEAD, modeFor } from "@/lib/party/protocol";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/avatar";
import { PlayerName } from "@/components/profile/player-name";
import { InviteFriends } from "./invite-friends";
import type { FriendRow, PartyState } from "@/types";

export interface PartyGameOption {
  slug: string;
  title: string;
  engine_id: string;
}

interface Props {
  party: Extract<PartyState, { in_party: true }>;
  me: string;
  /** Members with the party page actually open, from channel presence. */
  present: Set<string>;
  games: PartyGameOption[];
  friends: FriendRow[];
  /** Re-read the roster and tell everyone else to do the same. */
  onChanged: () => void;
  onStart: () => void;
  starting: boolean;
}

export function PartyLobby({ party, me, present, games, friends, onChanged, onStart, starting }: Props) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const chosen = games.find((g) => g.slug === party.game_slug) ?? null;
  // Presence, not membership, decides who can actually be dealt into a match.
  const ready = party.members.filter((m) => present.has(m.user_id));
  const mode = chosen ? modeFor(chosen.engine_id, ready.length) : null;
  const canStart = Boolean(chosen) && ready.length >= 2;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(party.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — the code is " + party.invite_code);
    }
  };

  const chooseGame = (slug: string) =>
    start(async () => {
      const res = await setPartyGame(slug);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't set the game");
        return;
      }
      onChanged();
    });

  const kick = (userId: string, name: string) =>
    start(async () => {
      const res = await kickFromParty(userId);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't remove them");
        return;
      }
      toast.success(`Removed ${name}`);
      onChanged();
    });

  const leave = () =>
    start(async () => {
      const res = await leaveParty();
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't leave");
        return;
      }
      toast.success(res.disbanded ? "Party disbanded" : "You left the party");
      onChanged();
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">{party.name ?? "Your party"}</h1>
          <p className="text-sm text-muted-foreground">
            {party.members.length} of {party.max_size} · {ready.length} in the lobby
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 font-mono text-lg font-bold tracking-[0.25em] transition hover:bg-muted"
            title="Copy invite code"
          >
            {party.invite_code}
            <Copy className="size-4 text-muted-foreground" />
          </button>
          {copied && <span className="text-xs text-emerald-500">Copied</span>}
          <InviteFriends friends={friends} members={party.members} />
          <Button variant="outline" size="icon" onClick={leave} disabled={pending} aria-label="Leave party">
            <DoorOpen />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Gamepad2 className="size-4" /> What are we playing?
          </h2>

          {party.is_leader ? (
            <Select value={party.game_slug ?? undefined} onValueChange={chooseGame} disabled={pending}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a game" />
              </SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.slug} value={g.slug}>
                    {g.title}
                    {HEAD_TO_HEAD.has(g.engine_id) ? " · head-to-head" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
              {chosen ? chosen.title : "Waiting for the leader to pick a game…"}
            </p>
          )}

          {chosen && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {mode === "versus" ? (
                <>
                  <Swords className="size-3.5 text-primary" />
                  Head-to-head on one shared board.
                </>
              ) : (
                <>
                  <Users2 className="size-3.5 text-primary" />
                  Score race — everyone plays at once, highest score wins.
                  {HEAD_TO_HEAD.has(chosen.engine_id) && ready.length > 2 && " Drop to two players for a duel."}
                </>
              )}
            </div>
          )}

          {party.is_leader ? (
            <Button className="w-full" onClick={onStart} disabled={!canStart || starting}>
              <Play /> {starting ? "Starting…" : "Start match"}
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              The leader starts the match — you&apos;ll be pulled in automatically.
            </p>
          )}
          {party.is_leader && !canStart && (
            <p className="text-center text-xs text-muted-foreground">
              {!chosen ? "Pick a game first." : "You need at least two players in the lobby."}
            </p>
          )}
        </section>

        <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Users2 className="size-4" /> Party
          </h2>
          <ul className="space-y-1">
            {party.members.map((m) => {
              const name = m.display_name ?? m.username;
              const here = present.has(m.user_id);
              return (
                <li key={m.user_id} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                  <UserAvatar src={m.avatar_url} name={name} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      <PlayerName name={name} />
                      {m.is_leader && <Crown className="size-3.5 shrink-0 text-gold" />}
                      {m.user_id === me && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {m.level} · {here ? "in the lobby" : m.online ? "online" : "away"}
                    </p>
                  </div>
                  {here && <Badge variant="secondary">Ready</Badge>}
                  {party.is_leader && m.user_id !== me && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => kick(m.user_id, name)}
                      disabled={pending}
                      aria-label={`Remove ${name}`}
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
