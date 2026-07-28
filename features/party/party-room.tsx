"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePartyChannel, usePartyState } from "@/lib/party/use-party";
import { COUNTDOWN_MS, modeFor, type MatchConfig, type PartyEvent } from "@/lib/party/protocol";
import { PartyStart } from "./party-start";
import { PartyLobby, type PartyGameOption } from "./party-lobby";
import { MatchStage } from "./match-stage";
import type { FriendRow, PartyState, Seat } from "@/types";

interface Props {
  initial: PartyState;
  me: string;
  games: PartyGameOption[];
  friends: FriendRow[];
}

/**
 * Owns the party's realtime connection and decides what you're looking at: the
 * "start a party" screen, the lobby, or a match in progress.
 *
 * Match events are fanned out to whoever is interested through a tiny
 * subscription set rather than React state, so a move arriving mid-render can
 * never be dropped or replayed.
 */
export function PartyRoom({ initial, me, games, friends }: Props) {
  const { party, refresh } = usePartyState(initial);
  const [match, setMatch] = useState<MatchConfig | null>(null);
  const [starting, setStarting] = useState(false);

  const subscribers = useRef(new Set<(event: PartyEvent) => void>());
  const subscribe = useCallback((handler: (event: PartyEvent) => void) => {
    subscribers.current.add(handler);
    return () => {
      subscribers.current.delete(handler);
    };
  }, []);

  const onEvent = useCallback(
    (event: PartyEvent) => {
      if (event.type === "roster") {
        void refresh();
      } else if (event.type === "match:start") {
        // Someone who joined after the match began just watches the lobby.
        if (event.config.players.includes(me)) setMatch(event.config);
      } else if (event.type === "match:end") {
        setMatch(null);
      }
      subscribers.current.forEach((handler) => handler(event));
    },
    [refresh, me],
  );

  const partyId = party.in_party ? party.id : null;
  const { send, present } = usePartyChannel({ partyId, userId: me, onEvent });

  // Being removed (or leaving from another tab) ends any match you were in.
  useEffect(() => {
    if (!party.in_party) setMatch(null);
  }, [party.in_party]);

  /** Refresh my own copy of the roster and nudge everyone else to do the same. */
  const announce = useCallback(() => {
    void refresh();
    send({ type: "roster" });
  }, [refresh, send]);

  const startMatch = useCallback(() => {
    if (!party.in_party || !party.game_slug) return;
    const game = games.find((g) => g.slug === party.game_slug);
    if (!game) return toast.error("That game isn't available any more.");

    // Only players with the lobby open are dealt in. `members` arrives
    // leader-first, so seat 1 is the same on every client.
    const players = party.members.filter((m) => present.has(m.user_id)).map((m) => m.user_id);
    if (players.length < 2) return toast.error("You need at least two players in the lobby.");

    const mode = modeFor(game.engine_id, players.length);
    const seats: Record<string, Seat> = mode === "versus" ? { [players[0]]: 1, [players[1]]: 2 } : {};
    const config: MatchConfig = {
      matchId: crypto.randomUUID(),
      gameSlug: game.slug,
      engineId: game.engine_id,
      title: game.title,
      mode,
      players,
      seats,
      startAt: Date.now() + COUNTDOWN_MS,
    };

    setStarting(true);
    send({ type: "match:start", config });
    setMatch(config);
    setStarting(false);
  }, [party, games, present, send]);

  const exitMatch = useCallback(() => {
    setMatch(null);
    void refresh();
  }, [refresh]);

  if (!party.in_party) return <PartyStart onJoined={announce} />;

  if (match) {
    return (
      <MatchStage
        config={match}
        me={me}
        members={party.members}
        present={present}
        send={send}
        subscribe={subscribe}
        onExit={exitMatch}
      />
    );
  }

  return (
    <PartyLobby
      party={party}
      me={me}
      present={present}
      games={games}
      friends={friends}
      onChanged={announce}
      onStart={startMatch}
      starting={starting}
    />
  );
}
