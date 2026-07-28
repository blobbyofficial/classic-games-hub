"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getPartyState } from "@/actions/parties";
import { PARTY_EVENT, partyChannel, type PartyEvent } from "./protocol";
import type { PartyState } from "@/types";

/** Re-read the roster this often even when no broadcast arrives. */
const POLL_MS = 15_000;

/**
 * Keeps the party roster fresh.
 *
 * The authoritative copy is `party_state()`; this hook re-reads it whenever a
 * member says something changed, and on a slow poll so a dropped broadcast (or
 * Realtime being unavailable altogether) can only ever make the lobby stale for
 * a few seconds rather than wrong until reload.
 */
export function usePartyState(initial: PartyState) {
  const [party, setParty] = useState<PartyState>(initial);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setParty(await getPartyState());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { party, setParty, refresh, refreshing };
}

interface ChannelOptions {
  partyId: string | null;
  userId: string | null;
  onEvent: (event: PartyEvent) => void;
}

/**
 * Joins the party's realtime channel: one broadcast event type carrying the
 * `PartyEvent` union, plus presence so the lobby can tell who has the page open
 * (which is a different question from who is a member).
 */
export function usePartyChannel({ partyId, userId, onEvent }: ChannelOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [present, setPresent] = useState<Set<string>>(new Set());

  // Keep the handler in a ref so a re-render of the parent never tears the
  // subscription down and back up mid-match.
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!partyId || !userId) {
      setPresent(new Set());
      return;
    }
    const supabase = createClient();
    const channel = supabase.channel(partyChannel(partyId), {
      config: { broadcast: { self: false }, presence: { key: userId } },
    });

    channel
      .on("broadcast", { event: PARTY_EVENT }, ({ payload }) => {
        handler.current(payload as PartyEvent);
      })
      .on("presence", { event: "sync" }, () => {
        setPresent(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ at: Date.now() });
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [partyId, userId]);

  const send = useCallback((event: PartyEvent) => {
    void channelRef.current?.send({ type: "broadcast", event: PARTY_EVENT, payload: event });
  }, []);

  return { send, present };
}
